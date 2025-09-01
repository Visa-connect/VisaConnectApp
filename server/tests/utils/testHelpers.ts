import { Message, Conversation } from '../../services/chatService';

export interface MockUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface MockAuthToken {
  token: string;
  user: MockUser;
}

export class TestDataFactory {
  static createMockUser(
    uid: string,
    email?: string,
    firstName?: string,
    lastName?: string
  ): MockUser {
    return {
      uid,
      email: email || `user${uid}@example.com`,
      firstName: firstName || `User${uid}`,
      lastName: lastName || 'Test',
    };
  }

  static createMockAuthToken(user: MockUser): MockAuthToken {
    return {
      token: `Bearer ${user.uid}-token`,
      user,
    };
  }

  static createMockConversation(
    id: string,
    participants: string[],
    lastMessage?: Message,
    lastMessageTime?: Date
  ): Conversation {
    return {
      id,
      participants,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessageTime: lastMessageTime || new Date(),
      lastMessage: lastMessage || undefined,
    };
  }

  static createMockMessage(
    id: string,
    conversationId: string,
    senderId: string,
    content: string,
    timestamp?: Date,
    read?: boolean,
    participants?: string[]
  ): Message {
    // Calculate receiverId as the other participant in the conversation
    let receiverId: string;
    if (participants && participants.length === 2) {
      receiverId = participants.find((p) => p !== senderId) || participants[1];
    } else {
      // Fallback: use a default receiver for testing
      receiverId = senderId === 'user1' ? 'user2' : 'user1';
    }

    return {
      id,
      senderId,
      receiverId,
      content,
      timestamp: timestamp || new Date(),
      read: read || false,
    };
  }

  static createMockConversationWithMessages(
    conversationId: string,
    participants: string[],
    messageCount: number = 3
  ): { conversation: Conversation; messages: Message[] } {
    const conversation = this.createMockConversation(
      conversationId,
      participants
    );
    const messages: Message[] = [];

    for (let i = 0; i < messageCount; i++) {
      const senderId = participants[i % participants.length];
      const message = this.createMockMessage(
        `msg-${i + 1}`,
        conversationId,
        senderId,
        `Message ${i + 1} from ${senderId}`,
        undefined, // timestamp
        undefined, // read
        participants
      );
      messages.push(message);
    }

    // Update conversation with last message
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      conversation.lastMessage = lastMessage;
      conversation.lastMessageTime = lastMessage.timestamp;
    }

    return { conversation, messages };
  }

  static generateMockConversations(
    userId: string,
    count: number = 5
  ): Conversation[] {
    const conversations: Conversation[] = [];

    for (let i = 1; i <= count; i++) {
      const otherUserId = `user-${i + 1}`;
      const conversation = this.createMockConversation(
        `conv-${i}`,
        [userId, otherUserId],
        undefined, // No last message for generated conversations
        new Date(Date.now() - i * 60000) // Each conversation is 1 minute apart
      );
      conversations.push(conversation);
    }

    return conversations;
  }

  static generateMockMessages(
    conversationId: string,
    count: number = 10
  ): Message[] {
    const messages: Message[] = [];
    const participants = ['user1', 'user2'];

    for (let i = 0; i < count; i++) {
      const senderId = participants[i % participants.length];
      const message = this.createMockMessage(
        `msg-${i + 1}`,
        conversationId,
        senderId,
        `Message ${i + 1} from ${senderId}`,
        new Date(Date.now() - (count - i) * 30000), // Messages are 30 seconds apart
        i < count - 2, // Last 2 messages are unread
        participants
      );
      messages.push(message);
    }

    return messages;
  }
}

export class TestEnvironment {
  static setupTestDatabase() {
    // This would set up a test database if needed
    // For now, we're using mocks, so this is a placeholder
    console.log('Setting up test database...');
  }

  static teardownTestDatabase() {
    // This would clean up the test database
    // For now, we're using mocks, so this is a placeholder
    console.log('Tearing down test database...');
  }

  static resetMocks() {
    // Reset all Jest mocks
    jest.clearAllMocks();
  }

  static mockFirebaseAdmin() {
    // Mock Firebase Admin SDK methods
    const mockFirestore = {
      collection: jest.fn(),
      doc: jest.fn(),
      add: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      where: jest.fn(),
      orderBy: jest.fn(),
      limit: jest.fn(),
      onSnapshot: jest.fn(),
    };

    return mockFirestore;
  }
}

export class TestAssertions {
  static expectValidConversation(conversation: any) {
    expect(conversation).toHaveProperty('id');
    expect(conversation).toHaveProperty('participants');
    expect(conversation).toHaveProperty('createdAt');
    expect(conversation).toHaveProperty('lastMessageAt');
    expect(conversation).toHaveProperty('lastMessage');

    expect(Array.isArray(conversation.participants)).toBe(true);
    expect(conversation.participants.length).toBeGreaterThan(0);
    expect(conversation.createdAt).toBeInstanceOf(Date);
    expect(conversation.lastMessageAt).toBeInstanceOf(Date);
  }

  static expectValidMessage(message: any) {
    expect(message).toHaveProperty('id');
    expect(message).toHaveProperty('conversationId');
    expect(message).toHaveProperty('senderId');
    expect(message).toHaveProperty('content');
    expect(message).toHaveProperty('timestamp');
    expect(message).toHaveProperty('read');

    expect(typeof message.content).toBe('string');
    expect(message.content.length).toBeGreaterThan(0);
    expect(message.timestamp).toBeInstanceOf(Date);
    expect(typeof message.read).toBe('boolean');
  }

  static expectValidApiResponse(response: any, expectedStatus: number = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success');
    expect(typeof response.body.success).toBe('boolean');
  }

  static expectSuccessResponse(response: any, expectedStatus: number = 200) {
    this.expectValidApiResponse(response, expectedStatus);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('data');
  }

  static expectErrorResponse(response: any, expectedStatus: number = 400) {
    this.expectValidApiResponse(response, expectedStatus);
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty('error');
    expect(typeof response.body.error).toBe('string');
    expect(response.body.error.length).toBeGreaterThan(0);
  }
}

export const testUsers = {
  user1: TestDataFactory.createMockUser(
    'user1',
    'user1@example.com',
    'John',
    'Doe'
  ),
  user2: TestDataFactory.createMockUser(
    'user2',
    'user2@example.com',
    'Jane',
    'Smith'
  ),
  user3: TestDataFactory.createMockUser(
    'user3',
    'user3@example.com',
    'Bob',
    'Johnson'
  ),
  user4: TestDataFactory.createMockUser(
    'user4',
    'user4@example.com',
    'Alice',
    'Brown'
  ),
};

export const testAuthTokens = {
  user1: TestDataFactory.createMockAuthToken(testUsers.user1),
  user2: TestDataFactory.createMockAuthToken(testUsers.user2),
  user3: TestDataFactory.createMockAuthToken(testUsers.user3),
  user4: TestDataFactory.createMockAuthToken(testUsers.user4),
};
