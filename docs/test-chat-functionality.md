# Chat Functionality Test Guide

## Prerequisites

1. Make sure both frontend and backend servers are running
2. Have at least 2 user accounts available for testing
3. Ensure Firebase is properly configured

## Test Steps

### 1. Basic Chat Navigation

- [ ] Navigate to `/chat` route
- [ ] Verify chat list loads without errors
- [ ] Check that hamburger menu works
- [ ] Verify mobile-responsive design

### 2. Chat List Functionality

- [ ] Check if existing conversations are displayed
- [ ] Verify conversation items show:
  - User avatar/initial
  - User name
  - Last message preview
  - Timestamp
  - Unread count (if any)
- [ ] Test conversation selection
- [ ] Verify back button works when in a conversation

### 3. Direct Message Creation

- [ ] Go to Connect screen
- [ ] Search for a user
- [ ] Click "Connect" to view their profile
- [ ] Click chat icon in profile header
- [ ] Verify navigation to chat screen
- [ ] Check if conversation is created/selected

### 4. Message Sending/Receiving

- [ ] Select a conversation
- [ ] Type a message in the input field
- [ ] Send the message
- [ ] Verify message appears in chat
- [ ] Check message styling (sent vs received)
- [ ] Verify timestamps are displayed

### 5. Real-time Updates

- [ ] Open chat in two different browser windows/tabs
- [ ] Send message from one window
- [ ] Verify message appears in other window
- [ ] Test with different users

### 6. Error Handling

- [ ] Test with network disconnected
- [ ] Verify graceful error handling
- [ ] Check loading states
- [ ] Test with invalid conversation IDs

### 7. Mobile Experience

- [ ] Test on mobile device or browser dev tools
- [ ] Verify touch interactions work
- [ ] Check responsive layout
- [ ] Test keyboard behavior

## Common Issues to Check

### Firebase Index Issues

If you see errors like "The query requires an index", you need to:

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Go to Indexes tab
4. Create the required composite index for conversations collection

### Authentication Issues

- Verify user tokens are valid
- Check if user is properly authenticated
- Ensure Firebase Admin SDK is initialized

### Network Issues

- Check if backend API is accessible
- Verify CORS settings
- Check for proxy configuration issues

## Expected Behavior

### Chat List

- Should show all user conversations
- Empty state when no conversations exist
- Loading spinner while fetching data
- Error message if fetch fails

### Chat Interface

- Messages should be right-aligned (sent) or left-aligned (received)
- Input field should be at bottom
- Send button should be disabled when input is empty
- Auto-scroll to bottom on new messages

### Navigation

- Back button should return to chat list
- Chat icon should navigate to chat screen
- Hamburger menu should work globally

## Debug Information

### Console Logs to Check

- Network requests to `/api/chat/*` endpoints
- Firebase connection status
- Authentication token validation
- Error messages in browser console

### Backend Logs to Check

- Firebase Admin SDK initialization
- Chat API endpoint responses
- Database query performance
- Authentication middleware logs
