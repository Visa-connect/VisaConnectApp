import { useUserStore } from '../stores/userStore';

// Frontend chat service now uses backend API + WebSocket for real-time updates
// This provides better security, centralized Firebase management, and eliminates client-side Firebase issues

export interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: any; // Changed from Timestamp to any for backend compatibility
  read: boolean;
}

export interface OtherUser {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  profilePhotoUrl?: string;
  occupation?: string;
  visaType?: string;
}

export interface Conversation {
  id?: string;
  participants: string[];
  lastMessage?: Message;
  lastMessageTime?: any; // Changed from Timestamp to any for backend compatibility
  unreadCount?: { [userId: string]: number };
  createdAt: any; // Changed from Timestamp to any for backend compatibility
  updatedAt: any; // Changed from Timestamp to any for backend compatibility
  otherUser?: OtherUser | null; // Enhanced user data from API
}

export interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string;
  lastSeen?: any; // Changed from Timestamp to any for backend compatibility
}

class ChatService {
  private getAuthToken(): string | null {
    return useUserStore.getState().getToken();
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`/api/chat${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Create a new conversation between two users
  async createConversation(userId1: string, userId2: string): Promise<string> {
    try {
      const response = await this.makeRequest('/conversations', {
        method: 'POST',
        body: JSON.stringify({ otherUserId: userId2 }),
      });
      return response.data.conversationId;
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
      const response = await this.makeRequest(
        `/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: message.content,
            receiverId: message.receiverId,
          }),
        }
      );
      return response.data.messageId;
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
      const response = await this.makeRequest('/conversations', {
        method: 'POST',
        body: JSON.stringify({ otherUserId: userId2 }),
      });
      return response.data.conversationId;
    } catch (error) {
      console.error('Error getting or creating conversation:', error);
      throw new Error('Failed to get or create conversation');
    }
  }

  // Get messages for a conversation with pagination (initial load, not real-time)
  async getMessages(
    conversationId: string, 
    limit: number = 50, 
    startAfter?: any
  ): Promise<{ messages: Message[]; hasMore: boolean; lastMessage?: any }> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (startAfter) {
        params.append('startAfter', JSON.stringify(startAfter));
      }
      
      const response = await this.makeRequest(
        `/conversations/${conversationId}/messages?${params.toString()}`
      );
      
      return {
        messages: response.data || [],
        hasMore: response.hasMore || false,
        lastMessage: response.lastMessage
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Return empty result instead of throwing error for better UX
      return { messages: [], hasMore: false };
    }
  }

  // Get user's conversations (initial load, not real-time)
  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await this.makeRequest('/conversations');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      // Return empty array instead of throwing error for better UX
      return [];
    }
  }

  // Mark messages as read
  async markMessagesAsRead(
    conversationId: string,
    userId: string
  ): Promise<void> {
    try {
      await this.makeRequest(`/conversations/${conversationId}/read`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw new Error('Failed to mark messages as read');
    }
  }

  // Get user's unread message count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const conversations = await this.getConversations();
      let totalUnread = 0;
      conversations.forEach((conversation) => {
        totalUnread += conversation.unreadCount?.[userId] || 0;
      });
      return totalUnread;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Note: Real-time listeners are now handled by the WebSocket service
  // This service only handles HTTP API calls for CRUD operations
}

export const chatService = new ChatService();
