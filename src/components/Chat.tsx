import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUserStore } from '../stores/userStore';
import { chatService, Message } from '../api/chatService';
import { websocketService } from '../api/websocketService';
import ResumeViewer from './ResumeViewer';
import {
  getResumeFileName,
  RESUME_LINK_REGEX,
  sanitizeResumeUrl,
} from '../utils/resume';

interface ChatProps {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto?: string;
}

const Chat: React.FC<ChatProps> = ({
  conversationId,
  otherUserId,
  otherUserName,
  otherUserPhoto,
}) => {
  const { user } = useUserStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  // Removed lazy loading state variables
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [resumeViewer, setResumeViewer] = useState<{
    isOpen: boolean;
    resumeUrl: string;
    resumeFileName: string;
  }>({
    isOpen: false,
    resumeUrl: '',
    resumeFileName: '',
  });
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages container only (prevent scrolling parent containers)
  const smoothScrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      console.log(
        'Scrolling to bottom, container height:',
        container.scrollHeight,
        'client height:',
        container.clientHeight,
        'offset height:',
        container.offsetHeight
      );

      // Scroll to the very bottom to ensure input box is visible
      const maxScroll = container.scrollHeight - container.clientHeight;
      container.scrollTop = maxScroll;

      // Also try smooth scroll as backup
      setTimeout(() => {
        container.scrollTo({
          top: maxScroll,
          behavior: 'smooth',
        });
      }, 10);
    } else {
      console.log('No messages container ref found');
    }
  }, []);

  // Listen to messages in this conversation with real-time updates via WebSocket
  useEffect(() => {
    if (!conversationId || !user) return;

    setIsLoading(true);

    // Initial load of messages (most recent first)
    const loadInitialMessages = async () => {
      try {
        const result = await chatService.getMessages(conversationId, 50);
        setMessages(result.messages);
        setIsLoading(false);

        // Mark messages as read when conversation is opened
        try {
          await chatService.markMessagesAsRead(conversationId, user.uid);
        } catch (error) {
          console.error('Error marking messages as read:', error);
          // Don't fail the conversation load if mark as read fails
        }

        // Auto-scroll to bottom after initial messages load
        setTimeout(smoothScrollToBottom, 100);
      } catch (error) {
        console.error('Error loading initial messages:', error);
        setIsLoading(false);
      }
    };

    loadInitialMessages();

    // Subscribe to real-time updates via WebSocket
    websocketService.subscribeToConversation(conversationId, (incoming) => {
      // Backend may send doc change events, not full message arrays.
      if (Array.isArray(incoming)) {
        setMessages(incoming);
      } else {
        // Fallback: fetch the latest messages snapshot
        chatService
          .getMessages(conversationId, 50)
          .then((result) => {
            setMessages(result.messages);
          })
          .catch((err) => console.warn('Failed to refresh messages:', err));
      }
      setIsLoading(false);

      // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
      if (shouldScrollToBottom) {
        console.log('Auto-scrolling to bottom - new message via WebSocket');
        setTimeout(smoothScrollToBottom, 100);
      }
    });

    return () => {
      websocketService.unsubscribeFromConversation(conversationId);
    };
  }, [conversationId, user, shouldScrollToBottom, smoothScrollToBottom]);

  // Removed redundant auto-scroll useEffect - scrolling is handled in the main useEffect

  // Removed lazy loading functionality

  // Track scroll position to determine if we should auto-scroll
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        messagesContainerRef.current;
      const maxScroll = scrollHeight - clientHeight;
      const distanceFromBottom = maxScroll - scrollTop;
      const isNearBottom = distanceFromBottom < 20; // Only within 20px of bottom
      console.log('Scroll event:', {
        scrollTop,
        scrollHeight,
        clientHeight,
        maxScroll,
        distanceFromBottom,
        isNearBottom,
      });
      setShouldScrollToBottom(isNearBottom);
    }
  };

  // Send a new message with optimistic updates
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageContent = newMessage.trim();
    const tempMessageId = `temp-${Date.now()}`;

    // Create optimistic message (appears immediately)
    const optimisticMessage: Message = {
      id: tempMessageId,
      senderId: user.uid,
      receiverId: otherUserId,
      content: messageContent,
      timestamp: new Date(), // Use JS Date object for consistency with Firestore
      read: false,
    };

    // Add message to UI immediately (optimistic update)
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');

    // Auto-scroll to bottom when new message is added
    setTimeout(smoothScrollToBottom, 100);

    try {
      // Send message to server
      const messageId = await chatService.sendMessage(conversationId, {
        senderId: user.uid,
        receiverId: otherUserId,
        content: messageContent,
        read: false,
      });

      // Replace optimistic message with real message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessageId ? { ...msg, id: messageId } : msg
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);

      // Remove optimistic message on error and show error state
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId));

      // You might want to show an error toast here
      // For now, we'll just log the error
    }
  };

  // Handle resume link clicks
  const handleResumeClick = (resumeUrl: string, resumeFileName: string) => {
    setResumeViewer({
      isOpen: true,
      resumeUrl,
      resumeFileName,
    });
  };

  // Close resume viewer
  const closeResumeViewer = () => {
    setResumeViewer({
      isOpen: false,
      resumeUrl: '',
      resumeFileName: '',
    });
  };

  // Format message content with clickable resume links
  const formatMessageContent = (content: string) => {
    // Check if message contains a resume link
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = RESUME_LINK_REGEX.exec(content)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Validate and add clickable resume link
      const resumeUrl = match[1];
      const safeUrl = sanitizeResumeUrl(resumeUrl);

      if (safeUrl) {
        const resumeFileName = getResumeFileName(safeUrl);
        parts.push(
          <button
            key={match.index}
            onClick={() => handleResumeClick(safeUrl, resumeFileName)}
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            📄 View Resume
          </button>
        );
      } else {
        // If URL is not trusted, show as plain text with warning
        parts.push(
          <span
            key={match.index}
            className="text-gray-500 italic"
            title="Resume link from untrusted source - click to open in new tab"
          >
            📄 Resume (External Link)
          </span>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  // Format timestamp for display
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';

    try {
      let date: Date;

      // Handle Firestore Timestamp objects with .toDate() method
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // Handle Firestore Timestamp objects with _seconds and _nanoseconds
      else if (timestamp._seconds && typeof timestamp._seconds === 'number') {
        // Convert seconds to milliseconds and create Date
        date = new Date(timestamp._seconds * 1000);
      }
      // Handle regular Date objects
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // Handle timestamp numbers or strings
      else {
        date = new Date(timestamp);
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return '';
      }

      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.warn(
        'Error formatting timestamp:',
        error,
        'Timestamp value:',
        timestamp
      );
      return '';
    }
  };

  if (!user) {
    return <div className="text-center py-8">Please log in to chat</div>;
  }

  return (
    <div className="flex flex-col h-[92%] bg-gray-50 overflow-hidden">
      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 px-2 py-4 space-y-4 overflow-y-auto min-h-0"
        // onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-3"></div>
              <p className="text-sm">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M12 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
              <p className="text-sm">Send a message to begin chatting</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isOwnMessage = message.senderId === user.uid;
              return (
                <div
                  key={message.id}
                  data-message="true"
                  className={`flex ${
                    isOwnMessage ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-lg px-4 py-3 rounded-2xl ${
                      isOwnMessage
                        ? 'bg-gray-200 text-gray-900 shadow-sm border border-gray-300'
                        : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    } ${message.id?.startsWith('temp-') ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="text-sm whitespace-pre-wrap">
                        {formatMessageContent(message.content)}
                      </div>
                    </div>
                    <p className={`text-xs mt-2 text-gray-500`}>
                      {formatTime(message.timestamp) || (
                        <span title={`Raw timestamp: ${message.timestamp}`}>
                          Just now
                        </span>
                      )}
                      {message.id?.startsWith('temp-') && (
                        <span className="ml-2 text-xs">Sending...</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="px-2 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center space-x-3"
        >
          {/* Attachment Button */}
          <button
            type="button"
            className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>

          {/* Message Input */}
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Send message"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
            disabled={false}
          />
        </form>
      </div>

      {/* Resume Viewer Modal */}
      <ResumeViewer
        resumeUrl={resumeViewer.resumeUrl}
        resumeFileName={resumeViewer.resumeFileName}
        isOpen={resumeViewer.isOpen}
        onClose={closeResumeViewer}
      />
    </div>
  );
};

export default Chat;
