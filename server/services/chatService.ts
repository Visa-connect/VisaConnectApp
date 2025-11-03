import admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Lazy-load Firebase Firestore to ensure it's initialized when needed
function getFirestore() {
  if (!admin.apps.length) {
    throw new Error(
      'Firebase Admin not initialized. Please ensure the main server has started.'
    );
  }
  return admin.firestore();
}

export interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: any;
  read: boolean;
}

export interface Conversation {
  id?: string;
  participants: string[];
  lastMessage?: Message;
  lastMessageTime?: any;
  unreadCount?: { [userId: string]: number };
  createdAt: any;
  updatedAt: any;
  // Metadata fields to help downstream features (non-sensitive)
  applicantId?: string;
  employerId?: string;
}

class ChatService {
  // Create a new conversation between two users
  async createConversation(
    userId1: string,
    userId2: string,
    metadata?: { applicantId?: string; employerId?: string }
  ): Promise<string> {
    console.log('Creating conversation between: ', userId1, userId2);
    try {
      const conversationData: Omit<Conversation, 'id'> = {
        participants: [userId1, userId2].sort(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        unreadCount: {
          [userId1]: 0,
          [userId2]: 0,
        },
        ...(metadata?.applicantId ? { applicantId: metadata.applicantId } : {}),
        ...(metadata?.employerId ? { employerId: metadata.employerId } : {}),
      };

      const docRef = await getFirestore()
        .collection('conversations')
        .add(conversationData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  // Send a message in a conversation
  async sendMessage(
    conversationId: string,
    message: Omit<Message, 'id' | 'timestamp'>
  ): Promise<string> {
    try {
      const messageData: Omit<Message, 'id'> = {
        ...message,
        timestamp: FieldValue.serverTimestamp(),
      };

      const docRef = await getFirestore()
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .add(messageData);

      // Update conversation with last message info
      await getFirestore()
        .collection('conversations')
        .doc(conversationId)
        .update({
          lastMessage: messageData,
          lastMessageTime: messageData.timestamp,
          updatedAt: FieldValue.serverTimestamp(),
          [`unreadCount.${message.receiverId}`]: FieldValue.increment(1),
        });

      return docRef.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  // Get or create conversation between two users
  async getOrCreateConversation(
    userId1: string,
    userId2: string
  ): Promise<string> {
    try {
      // Check if conversation already exists
      const existingConversation = await this.findConversation(
        userId1,
        userId2
      );

      if (existingConversation) {
        return existingConversation.id!;
      }

      // Create new conversation if none exists
      const newConversationId = await this.createConversation(userId1, userId2);
      return newConversationId;
    } catch (error) {
      console.error('Error getting or creating conversation:', error);
      throw new Error('Failed to get or create conversation');
    }
  }

  // Find existing conversation between two users
  private async findConversation(
    userId1: string,
    userId2: string
  ): Promise<Conversation | null> {
    try {
      const participants = [userId1, userId2].sort();
      const query = getFirestore()
        .collection('conversations')
        .where('participants', '==', participants);

      const snapshot = await query.get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const conversation = { id: doc.id, ...doc.data() } as Conversation;

        return conversation;
      }

      return null;
    } catch (error) {
      console.error('Error finding conversation:', error);
      return null;
    }
  }

  // Get messages for a conversation with pagination support
  async getConversationMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    startAfter?: any
  ): Promise<{ messages: Message[]; hasMore: boolean; lastMessage?: any }> {
    try {
      let query = getFirestore()
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .orderBy('timestamp', 'desc') // Get newest messages first
        .limit(limit);

      // Add pagination cursor if provided
      if (startAfter) {
        query = query.startAfter(startAfter);
      }

      const snapshot = await query.get();

      const messages: Message[] = [];
      snapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() } as Message);
      });

      // Reverse to get chronological order (oldest to newest)
      messages.reverse();

      const hasMore = snapshot.size === limit;
      const lastMessage = snapshot.docs[snapshot.docs.length - 1];

      return {
        messages,
        hasMore,
        lastMessage: lastMessage ? lastMessage.data() : undefined,
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw new Error('Failed to fetch messages');
    }
  }

  // Get a conversation by ID
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const doc = await getFirestore()
        .collection('conversations')
        .doc(conversationId)
        .get();

      if (doc.exists) {
        return { id: doc.id, ...doc.data() } as Conversation;
      }
      return null;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }

  // Get user's conversations
  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      // First try with ordering (requires index)
      try {
        const snapshot = await getFirestore()
          .collection('conversations')
          .where('participants', 'array-contains', userId)
          .orderBy('lastMessageTime', 'desc')
          .get();

        const conversations: Conversation[] = [];
        snapshot.forEach((doc) => {
          conversations.push({ id: doc.id, ...doc.data() } as Conversation);
        });
        return conversations;
      } catch (indexError: any) {
        // If index doesn't exist, fall back to unordered query
        console.warn(
          'Index not ready, using fallback query:',
          indexError?.message || 'Unknown error'
        );
        const snapshot = await getFirestore()
          .collection('conversations')
          .where('participants', 'array-contains', userId)
          .get();

        const conversations: Conversation[] = [];
        snapshot.forEach((doc) => {
          conversations.push({ id: doc.id, ...doc.data() } as Conversation);
        });

        // Sort in memory as fallback
        return conversations.sort(
          (a, b) =>
            (b.lastMessageTime?.toMillis?.() || 0) -
            (a.lastMessageTime?.toMillis?.() || 0)
        );
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return []; // Return empty array instead of throwing
    }
  }

  // Mark messages as read
  async markMessagesAsRead(
    conversationId: string,
    userId: string
  ): Promise<void> {
    try {
      await getFirestore()
        .collection('conversations')
        .doc(conversationId)
        .update({
          [`unreadCount.${userId}`]: 0,
        });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw new Error('Failed to mark messages as read');
    }
  }

  // Get user's unread message count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const snapshot = await getFirestore()
        .collection('conversations')
        .where('participants', 'array-contains', userId)
        .get();

      let totalUnread = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        totalUnread += data.unreadCount?.[userId] || 0;
      });

      return totalUnread;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Create a stateless Firebase listener for a conversation
  // Returns an unsubscribe function that the caller should manage
  createConversationListener(
    conversationId: string,
    onUpdate: (data: any) => void
  ): () => void {
    try {
      const db = getFirestore();
      const unsubscribe = db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(
          (snapshot) => {
            const changes = snapshot.docChanges().map((change) => ({
              type: change.type,
              docId: change.doc.id,
              data: change.doc.data(),
            }));

            console.log(
              `Real-time update for conversation ${conversationId}:`,
              changes
            );

            // Push update to connected clients via callback
            onUpdate({
              type: 'conversation_update',
              conversationId,
              changes,
            });
          },
          (error) => {
            console.error(
              `Listener error for conversation ${conversationId}:`,
              error
            );
            // Let the caller handle cleanup
          }
        );

      console.log(
        `Created real-time listener for conversation ${conversationId}`
      );
      return unsubscribe;
    } catch (error) {
      console.error(
        `Failed to create listener for conversation ${conversationId}:`,
        error
      );
      // Return no-op function on error
      return () => {};
    }
  }

  // Create a stateless Firebase listener for user's conversations
  // Returns an unsubscribe function that the caller should manage
  createUserConversationsListener(
    userId: string,
    onUpdate: (data: any) => void
  ): () => void {
    try {
      const db = getFirestore();
      const unsubscribe = db
        .collection('conversations')
        .where('participants', 'array-contains', userId)
        .orderBy('lastMessageTime', 'desc')
        .onSnapshot(
          (snapshot) => {
            const changes = snapshot.docChanges().map((change) => ({
              type: change.type,
              docId: change.doc.id,
              data: change.doc.data(),
            }));

            console.log(
              `Real-time update for user ${userId} conversations:`,
              changes
            );

            // Push update to connected clients via callback
            onUpdate({
              type: 'user_conversations_update',
              userId,
              changes,
            });
          },
          (error) => {
            console.error(
              `Listener error for user ${userId} conversations:`,
              error
            );
            // Let the caller handle cleanup
          }
        );

      console.log(
        `Created real-time listener for user ${userId} conversations`
      );
      return unsubscribe;
    } catch (error) {
      console.error(
        `Failed to create listener for user ${userId} conversations:`,
        error
      );
      // Return no-op function on error
      return () => {};
    }
  }

  // Get conversation messages with real-time updates
  async getConversationMessagesWithListener(
    conversationId: string,
    userId: string,
    onUpdate: (data: any) => void
  ): Promise<{ messages: Message[]; unsubscribe: () => void }> {
    try {
      // Get initial messages
      const result = await this.getConversationMessages(conversationId, userId);

      // Create real-time listener
      const unsubscribe = this.createConversationListener(
        conversationId,
        onUpdate
      );

      return { messages: result.messages, unsubscribe };
    } catch (error) {
      console.error('Error setting up conversation with listener:', error);
      return { messages: [], unsubscribe: () => {} };
    }
  }

  // Get user conversations with real-time updates
  async getUserConversationsWithListener(
    userId: string,
    onUpdate: (data: any) => void
  ): Promise<{ conversations: Conversation[]; unsubscribe: () => void }> {
    try {
      // Get initial conversations
      const conversations = await this.getUserConversations(userId);

      // Create real-time listener
      const unsubscribe = this.createUserConversationsListener(
        userId,
        onUpdate
      );

      return { conversations, unsubscribe };
    } catch (error) {
      console.error(
        'Error setting up user conversations with listener:',
        error
      );
      return { conversations: [], unsubscribe: () => {} };
    }
  }
}

export const chatService = new ChatService();
