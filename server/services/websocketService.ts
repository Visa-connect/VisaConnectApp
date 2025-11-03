import { WebSocket, WebSocketServer } from 'ws';
import { chatService } from './chatService';
import admin from 'firebase-admin';

type AliveWebSocket = WebSocket & { isAlive: boolean };

interface WebSocketMessage {
  type: 'authenticate' | 'subscribe' | 'unsubscribe';
  data: any;
}

interface ClientConnection {
  userId: string;
  ws: WebSocket;
  unsubscribeFunctions: Map<string, () => void>;
}

class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection established');

      // Mark connection alive for heartbeat monitoring
      const socket = ws as AliveWebSocket;
      socket.isAlive = true;
      ws.on('pong', () => {
        socket.isAlive = true;
      });

      ws.on('message', (message: string) => {
        try {
          const parsedMessage: WebSocketMessage = JSON.parse(message);
          this.handleMessage(ws, parsedMessage);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'Invalid message format',
            })
          );
        }
      });

      ws.on('close', () => {
        this.handleClientDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleClientDisconnect(ws);
      });
    });

    console.log('WebSocket server initialized');
  }

  private startHeartbeat() {
    // Send periodic pings to keep connections alive on Heroku and detect dead sockets
    const THIRTY_SECONDS = 30_000;
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocket) => {
        const socket = ws as AliveWebSocket;
        if (socket.isAlive === false) {
          try {
            ws.terminate();
          } catch {
            // ignore
          }
          return;
        }
        socket.isAlive = false;
        try {
          ws.ping();
        } catch {
          // ignore
        }
      });
    }, THIRTY_SECONDS);
  }

  private async handleMessage(ws: WebSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'authenticate':
        await this.authenticateClient(ws, message.data.token);
        break;

      case 'subscribe':
        await this.handleSubscribe(ws, message.data);
        break;

      case 'unsubscribe':
        await this.handleUnsubscribe(ws, message.data);
        break;

      default:
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Unknown message type',
          })
        );
    }
  }

  private async authenticateClient(ws: WebSocket, token: string) {
    try {
      // Verify the Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      // Store the authenticated client
      this.clients.set(userId, {
        userId,
        ws,
        unsubscribeFunctions: new Map(),
      });

      console.log(`Client authenticated: ${userId}`);

      ws.send(
        JSON.stringify({
          type: 'authenticated',
          userId,
        })
      );
    } catch (error) {
      console.error('Authentication failed:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Authentication failed',
        })
      );
    }
  }

  private async handleSubscribe(ws: WebSocket, data: any) {
    // Find the client by WebSocket connection
    let client: ClientConnection | undefined;
    for (const [, c] of this.clients.entries()) {
      if (c.ws === ws) {
        client = c;
        break;
      }
    }

    if (!client) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Client not authenticated',
        })
      );
      return;
    }

    if (data.type === 'conversation') {
      await this.subscribeToConversation(client, data.conversationId);
    } else if (data.type === 'userConversations') {
      await this.subscribeToUserConversations(client);
    }
  }

  private async handleUnsubscribe(ws: WebSocket, data: any) {
    // Find the client by WebSocket connection
    let client: ClientConnection | undefined;
    for (const [, c] of this.clients.entries()) {
      if (c.ws === ws) {
        client = c;
        break;
      }
    }

    if (!client) return;

    if (data.type === 'conversation') {
      this.unsubscribeFromConversation(client, data.conversationId);
    } else if (data.type === 'userConversations') {
      this.unsubscribeFromUserConversations(client);
    }
  }

  private async subscribeToConversation(
    client: ClientConnection,
    conversationId: string
  ) {
    // Create Firebase listener for this conversation
    const unsubscribe = chatService.createConversationListener(
      conversationId,
      (updateData) => {
        // Send real-time update to the client
        this.sendToClient(client.userId, {
          type: 'update',
          data: {
            type: 'messages',
            conversationId,
            data: updateData,
          },
        });
      }
    );

    // Store the unsubscribe function
    const key = `conversation_${conversationId}`;
    client.unsubscribeFunctions.set(key, unsubscribe);

    console.log(
      `Client ${client.userId} subscribed to conversation ${conversationId}`
    );

    client.ws.send(
      JSON.stringify({
        type: 'subscribed',
        data: { type: 'conversation', conversationId },
      })
    );
  }

  private async subscribeToUserConversations(client: ClientConnection) {
    // Create Firebase listener for user's conversations
    const unsubscribe = chatService.createUserConversationsListener(
      client.userId,
      (updateData) => {
        // Send real-time update to the client
        this.sendToClient(client.userId, {
          type: 'update',
          data: {
            type: 'conversations',
            data: updateData,
          },
        });
      }
    );

    // Store the unsubscribe function
    const key = 'user_conversations';
    client.unsubscribeFunctions.set(key, unsubscribe);

    console.log(`Client ${client.userId} subscribed to user conversations`);

    client.ws.send(
      JSON.stringify({
        type: 'subscribed',
        data: { type: 'userConversations' },
      })
    );
  }

  private unsubscribeFromConversation(
    client: ClientConnection,
    conversationId: string
  ) {
    const key = `conversation_${conversationId}`;
    const unsubscribe = client.unsubscribeFunctions.get(key);

    if (unsubscribe) {
      unsubscribe();
      client.unsubscribeFunctions.delete(key);
      console.log(
        `Client ${client.userId} unsubscribed from conversation ${conversationId}`
      );
    }
  }

  private unsubscribeFromUserConversations(client: ClientConnection) {
    const key = 'user_conversations';
    const unsubscribe = client.unsubscribeFunctions.get(key);

    if (unsubscribe) {
      unsubscribe();
      client.unsubscribeFunctions.delete(key);
      console.log(
        `Client ${client.userId} unsubscribed from user conversations`
      );
    }
  }

  private handleClientDisconnect(ws: WebSocket) {
    // Find and cleanup the disconnected client
    for (const [userId, client] of this.clients.entries()) {
      if (client.ws === ws) {
        // Cleanup all Firebase listeners
        client.unsubscribeFunctions.forEach((unsubscribe) => {
          unsubscribe();
        });

        this.clients.delete(userId);
        console.log(`Client ${userId} disconnected and cleaned up`);
        break;
      }
    }
  }

  private sendToClient(userId: string, message: any) {
    const client = this.clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  // Public method to send messages to specific users (useful for notifications)
  public sendToUser(userId: string, message: any) {
    this.sendToClient(userId, message);
  }

  // Get connected client count for monitoring
  public getConnectedClientCount(): number {
    return this.clients.size;
  }

  // Get active listener count for monitoring
  public getActiveListenerCount(): number {
    let totalListeners = 0;
    this.clients.forEach((client) => {
      totalListeners += client.unsubscribeFunctions.size;
    });
    return totalListeners;
  }
}

// Note: websocketService should be instantiated with a server instance
// This is typically done in the main server file where the HTTP server is available
export { WebSocketService };
