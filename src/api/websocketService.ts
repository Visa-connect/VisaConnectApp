import { useUserStore } from '../stores/userStore';
// import { tokenRefreshService } from './firebaseAuth'; // Temporarily disabled

export interface WebSocketMessage {
  type: 'authenticate' | 'subscribe' | 'unsubscribe' | 'update';
  data: any;
}

export interface ChatUpdate {
  type: 'conversations' | 'messages';
  conversationId?: string;
  data: any;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private conversationSubscriptions: Set<string> = new Set();
  private userConversationsSubscribed = false;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;

    // Connect to the backend WebSocket server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;

      // Re-authenticate and resubscribe to previous subscriptions
      this.authenticateWithRefresh();
      this.resubscribe();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.isConnecting = false;
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.isConnecting = false;
    };
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'update':
        const update: ChatUpdate = message.data;
        const handlerKey =
          update.type +
          (update.conversationId ? `:${update.conversationId}` : '');
        const handler = this.messageHandlers.get(handlerKey);
        if (handler) {
          handler(update.data);
        }
        break;
      default:
        console.log('Unhandled WebSocket message type:', message.type);
    }
  }

  private async authenticate() {
    const token = useUserStore.getState().getToken();
    if (token && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'authenticate',
          data: { token },
        })
      );
    }
  }

  private async authenticateWithRefresh() {
    try {
      // Skip token refresh for now - just use existing token
      const currentToken = useUserStore.getState().getToken();

      if (currentToken && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'authenticate',
            data: { token: currentToken },
          })
        );
        console.log(
          'WebSocket authenticated with existing token (refresh disabled)'
        );
      } else {
        console.error('No token available for WebSocket authentication');
        useUserStore.getState().clearUser();
      }
    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      useUserStore.getState().clearUser();
    }
  }

  private resubscribe() {
    // Note: We can't resubscribe without the original handlers
    // The frontend components will need to resubscribe when they remount
    console.log(
      'WebSocket reconnected - frontend components should resubscribe'
    );
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  public subscribeToUserConversations(handler: (conversations: any[]) => void) {
    this.userConversationsSubscribed = true;
    this.messageHandlers.set('conversations', handler);

    if (this.ws?.readyState === WebSocket.OPEN) {
      // Ensure we have a fresh token before subscribing
      this.authenticateWithRefresh().then(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: 'subscribe',
              data: { type: 'userConversations' },
            })
          );
        }
      });
    }
  }

  public subscribeToConversation(
    conversationId: string,
    handler: (messages: any[]) => void
  ) {
    this.conversationSubscriptions.add(conversationId);
    this.messageHandlers.set(`messages:${conversationId}`, handler);

    if (this.ws?.readyState === WebSocket.OPEN) {
      // Ensure we have a fresh token before subscribing
      this.authenticateWithRefresh().then(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: 'subscribe',
              data: { type: 'conversation', conversationId },
            })
          );
        }
      });
    }
  }

  public unsubscribeFromConversation(conversationId: string) {
    this.conversationSubscriptions.delete(conversationId);
    this.messageHandlers.delete(`messages:${conversationId}`);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'unsubscribe',
          data: { type: 'conversation', conversationId },
        })
      );
    }
  }

  public unsubscribeFromUserConversations() {
    this.userConversationsSubscribed = false;
    this.messageHandlers.delete('conversations');

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'unsubscribe',
          data: { type: 'userConversations' },
        })
      );
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
    this.conversationSubscriptions.clear();
    this.userConversationsSubscribed = false;
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
