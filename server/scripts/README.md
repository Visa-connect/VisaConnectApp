# Server Scripts

This directory contains utility scripts for database maintenance and data migration.

## Conversation Consolidation Script

### Purpose

The `consolidate-duplicate-conversations.js` script identifies and consolidates duplicate conversations between the same two users. This addresses the issue where multiple separate chat entries exist for the same user pairs instead of being grouped into single conversation threads.

### What it does

1. **Identifies Duplicates**: Finds all conversations with the same two participants
2. **Consolidates Messages**: Moves all messages from duplicate conversations to the oldest conversation
3. **Updates Metadata**: Updates the last message information in the kept conversation
4. **Cleans Up**: Deletes the duplicate conversation documents and their message collections

### How to run

```bash
cd server
node scripts/consolidate-duplicate-conversations.js
```

### Safety Features

- Keeps the oldest conversation (by creation date) in each group
- Preserves all messages by moving them to the kept conversation
- Maintains message order and timestamps
- Updates conversation metadata (lastMessage, lastMessageTime, updatedAt)

### Prerequisites

- **Firebase credentials** configured via one of these methods:
  - **Environment Variable** (Recommended for production): Set `FIREBASE_SERVICE_ACCOUNT` with the full JSON service account object
  - **Local File** (Development): Place `firebase-stage-credentials.json` in the server directory
- Firebase Admin SDK must be initialized
- Appropriate database permissions

### Environment Configuration

#### Production/Staging

Set the `FIREBASE_SERVICE_ACCOUNT` environment variable with the complete service account JSON:

```bash
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id",...}'
```

#### Local Development

Place the `firebase-stage-credentials.json` file in the server directory, or set the environment variable as above.

### Example Output

```
Starting conversation consolidation...
Found 150 total conversations
Found 45 unique participant pairs

Consolidating 3 conversations for participants: user1|user2
Keeping conversation: conv123 (created: 2024-01-15T10:30:00.000Z)
Processing messages from conversation: conv456
Processing messages from conversation: conv789
Moving 25 messages to conversation conv123
Deleting conversation: conv456
Deleting conversation: conv789

Consolidation complete!
- Consolidated 5 groups of duplicate conversations
- Deleted 8 duplicate conversations
- Moved messages to the oldest conversation in each group
```

### Important Notes

- **Backup First**: Always backup your Firestore database before running this script
- **Test Environment**: Run this script in a test environment first to verify behavior
- **One-Time Use**: This script is designed to clean up existing duplicates. The application logic should prevent new duplicates from being created
- **Downtime**: Consider running during low-usage periods as it performs many database operations
- **Security**: Script now supports environment variables for Firebase credentials to avoid hardcoded paths

### Related Code

The conversation consolidation logic in the application is handled by:

- `server/services/chatService.ts` - `getOrCreateConversation()` method
- `server/api/chat.ts` - `/api/chat/conversations` endpoint
- `src/components/ChatList.tsx` - Frontend conversation display
