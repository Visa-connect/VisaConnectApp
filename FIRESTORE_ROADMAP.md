# Firestore Real-time Listeners Implementation Roadmap

## Current State

- ✅ Backend Firebase Admin SDK configured
- ✅ Chat API endpoints implemented
- ✅ Frontend polling with error handling
- ✅ Real-time UI updates working

## Phase 1: Frontend Firestore SDK Integration

### 1.1 Install Frontend Firebase SDK

```bash
yarn add firebase
```

### 1.2 Configure Frontend Firebase

```typescript
// src/api/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
```

### 1.3 Implement Real-time Listeners

```typescript
// src/api/chatService.ts
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

class ChatService {
  // Real-time conversation listener
  listenToConversations(
    userId: string,
    callback: (conversations: Conversation[]) => void
  ) {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const conversations = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(conversations);
    });
  }

  // Real-time message listener
  listenToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ) {
    const q = query(
      collection(db, `conversations/${conversationId}/messages`),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(messages);
    });
  }
}
```

## Phase 2: Backend API Enhancement

### 2.1 Hybrid Approach

Keep backend API for:

- User authentication
- File uploads
- Complex queries
- Data validation

Use Firestore listeners for:

- Real-time chat updates
- Message delivery status
- User online status

### 2.2 Update Backend

```typescript
// server/api/chat.ts
// Keep existing endpoints for non-real-time operations
// Add WebSocket support for real-time features
```

## Phase 3: Advanced Features

### 3.1 Offline Support

```typescript
// Enable offline persistence
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db)
  .then(() => console.log('Offline persistence enabled'))
  .catch((err) => console.error('Offline persistence error:', err));
```

### 3.2 Message Delivery Status

```typescript
// Track message delivery status
interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: any;
  read: boolean;
  delivered: boolean;
  deliveredAt?: any;
}
```

### 3.3 User Online Status

```typescript
// Track user online status
interface UserStatus {
  userId: string;
  online: boolean;
  lastSeen: any;
  typing?: { [conversationId: string]: boolean };
}
```

## Phase 4: Performance Optimization

### 4.1 Firestore Indexes

```sql
-- Create composite indexes for better performance
-- conversations: participants + lastMessageTime
-- messages: conversationId + timestamp
-- users: online + lastSeen
```

### 4.2 Query Optimization

```typescript
// Limit query results
const q = query(
  collection(db, 'messages'),
  where('conversationId', '==', conversationId),
  orderBy('timestamp', 'desc'),
  limit(50)
);
```

### 4.3 Pagination

```typescript
// Implement pagination for large message histories
const loadMoreMessages = async (lastMessage: Message) => {
  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId),
    orderBy('timestamp', 'desc'),
    startAfter(lastMessage),
    limit(20)
  );
};
```

## Phase 5: Security & Rules

### 5.1 Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own conversations
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null &&
        request.auth.uid in resource.data.participants;

      // Messages subcollection
      match /messages/{messageId} {
        allow read, write: if request.auth != null &&
          request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
      }
    }
  }
}
```

## Implementation Timeline

### Week 1-2: Phase 1

- Install and configure Firebase SDK
- Implement basic real-time listeners
- Test with existing UI

### Week 3-4: Phase 2

- Update backend for hybrid approach
- Implement WebSocket support
- Add message delivery tracking

### Week 5-6: Phase 3

- Add offline support
- Implement user status tracking
- Add typing indicators

### Week 7-8: Phase 4

- Optimize queries and indexes
- Implement pagination
- Performance testing

### Week 9-10: Phase 5

- Implement security rules
- Testing and bug fixes
- Documentation

## Benefits After Implementation

1. **Real-time Updates**: Instant message delivery
2. **Better Performance**: No polling overhead
3. **Offline Support**: Messages work without internet
4. **Battery Life**: Reduced API calls
5. **Scalability**: Handles more concurrent users
6. **User Experience**: Smoother, more responsive chat

## Migration Strategy

1. **Gradual Migration**: Keep both systems running
2. **Feature Flags**: Enable/disable new features
3. **A/B Testing**: Compare performance
4. **Rollback Plan**: Easy to revert if issues arise

## Success Metrics

- **Latency**: < 100ms message delivery
- **Reliability**: 99.9% uptime
- **Performance**: 50% reduction in API calls
- **User Satisfaction**: Improved chat experience
