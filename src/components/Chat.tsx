import React, { useState, useEffect, useRef } from 'react';
import { useUserStore } from '../stores/userStore';
import { chatService, Message } from '../api/chatService';
import { websocketService } from '../api/websocketService';
import ResumeViewer from './ResumeViewer';
import { isValidResumeUrl, getResumeFileName } from '../utils/resume';

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
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  // Listen to messages in this conversation with real-time updates via WebSocket
  useEffect(() => {
    if (!conversationId) return;

    setIsLoading(true);

    // Initial load of messages
    const loadInitialMessages = async () => {
      try {
        const initialMessages = await chatService.getMessages(conversationId);
        setMessages(initialMessages);
        setIsLoading(false);

        // Auto-scroll to bottom after initial messages load
        setTimeout(smoothScrollToBottom, 50);
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
          .getMessages(conversationId)
          .then((list) => setMessages(list))
          .catch((err) => console.warn('Failed to refresh messages:', err));
      }
      setIsLoading(false);

      // Auto-scroll to bottom when new messages arrive
      setTimeout(smoothScrollToBottom, 50);
    });

    return () => {
      websocketService.unsubscribeFromConversation(conversationId);
    };
  }, [conversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(smoothScrollToBottom, 50);
    }
  }, [messages.length]);

  // Scroll to bottom on initial render
  useEffect(() => {
    setTimeout(smoothScrollToBottom, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom of messages container only
  const smoothScrollToBottom = () => {
    // Prefer a sentinel element for reliable scrolling
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
      // Also ensure the input area is visible (especially on mobile)
      if (inputContainerRef.current) {
        inputContainerRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }
      return;
    }
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      if (inputContainerRef.current) {
        inputContainerRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }
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
    setTimeout(smoothScrollToBottom, 50);

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

  // isValidResumeUrl and getResumeFileName moved to shared utils

  // Format message content with clickable resume links
  const formatMessageContent = (content: string) => {
    // Check if message contains a resume link
    const resumeLinkRegex = /\[View Resume\]\((https:\/\/[^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = resumeLinkRegex.exec(content)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Validate and add clickable resume link
      const resumeUrl = match[1];

      if (isValidResumeUrl(resumeUrl)) {
        const resumeFileName = getResumeFileName(resumeUrl);
        parts.push(
          <button
            key={match.index}
            onClick={() => handleResumeClick(resumeUrl, resumeFileName)}
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
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 p-4 space-y-4 overflow-y-auto"
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
          messages.map((message) => {
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
                  className={`max-w-[75%] md:max-w-md px-4 py-3 rounded-2xl ${
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
          })
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Message Input */}
      <div
        ref={inputContainerRef}
        className="p-4 bg-gray-50 border-t border-gray-200"
      >
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
