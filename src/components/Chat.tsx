import React, { useState, useEffect, useRef } from 'react';
import { useUserStore } from '../stores/userStore';
import { chatService, Message } from '../api/chatService';
import { websocketService } from '../api/websocketService';
import ResumeViewer from './ResumeViewer';
import Modal from './Modal';
import Button from './Button';
import { reportService } from '../api/reportService';
import { FlagIcon } from '@heroicons/react/24/outline';
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
  onScrollToBottom?: () => void;
}

const Chat: React.FC<ChatProps> = ({
  conversationId,
  otherUserId,
  otherUserName,
  otherUserPhoto,
  onScrollToBottom,
}) => {
  const { user } = useUserStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isReporting, setIsReporting] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);
  // Removed lazy loading state variables
  // Removed shouldScrollToBottom state since scroll detection is disabled
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

  // Scroll logic moved to parent ChatScreen

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
        setTimeout(() => onScrollToBottom?.(), 100);
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

      // Auto-scroll to bottom when new messages arrive
      setTimeout(() => onScrollToBottom?.(), 100);
    });

    return () => {
      websocketService.unsubscribeFromConversation(conversationId);
    };
  }, [conversationId, user, onScrollToBottom]);

  // Auto-scroll to bottom when conversation loads
  useEffect(() => {
    if (messages.length > 0 && onScrollToBottom) {
      setTimeout(() => onScrollToBottom(), 100);
    }
  }, [messages.length, onScrollToBottom]);

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
    setTimeout(() => onScrollToBottom?.(), 100);

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

  // Report conversation
  const handleReportConversation = () => {
    setReportReason('');
    setReportError(null);
    setReportModalOpen(true);
  };

  const submitReport = async () => {
    if (!user) return;
    const reason = reportReason.trim();
    if (reason.length < 10) {
      setReportError('Reason must be at least 10 characters.');
      return;
    }
    try {
      setIsReporting(true);
      setReportError(null);
      await reportService.createReport({
        target_type: 'chat',
        target_id: conversationId,
        reason,
      });
      setReportModalOpen(false);
      setReportReason('');
    } catch (err) {
      console.error('Failed to submit report:', err);
      setReportError('Failed to submit report. Please try again later.');
    } finally {
      setIsReporting(false);
    }
  };

  // Convert timestamp to Date object (reusable utility)
  const parseTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;

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
        return null;
      }

      return date;
    } catch (error) {
      console.warn(
        'Error parsing timestamp:',
        error,
        'Timestamp value:',
        timestamp
      );
      return null;
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp: any) => {
    const date = parseTimestamp(timestamp);
    if (!date) return '';

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get date string for grouping (YYYY-MM-DD format) using local timezone
  const getDateString = (timestamp: any): string => {
    const date = parseTimestamp(timestamp);
    if (!date) return '';

    // Use local timezone instead of UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // Format date for display in headers
  const formatDateHeader = (dateString: string): string => {
    // Parse dateString as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time to compare only dates
    const dateOnly = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const yesterdayOnly = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate()
    );

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year:
          date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [dateString: string]: Message[] } = {};
    const messagesWithoutDate: Message[] = [];

    messages.forEach((message) => {
      const dateString = getDateString(message.timestamp);
      if (dateString) {
        if (!groups[dateString]) {
          groups[dateString] = [];
        }
        groups[dateString].push(message);
      } else {
        // Handle messages without valid timestamps
        messagesWithoutDate.push(message);
      }
    });

    // Sort dates in ascending order (oldest first) so newest dates appear at bottom
    const sortedDates = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    const result = sortedDates.map((dateString) => ({
      dateString,
      dateHeader: formatDateHeader(dateString),
      messages: groups[dateString].sort((a, b) => {
        // Sort messages within each date group by timestamp (oldest first for chat display)
        const dateA = parseTimestamp(a.timestamp);
        const dateB = parseTimestamp(b.timestamp);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      }),
    }));

    // Add messages without valid timestamps to the most recent group or create a "Recent" group
    if (messagesWithoutDate.length > 0) {
      if (result.length > 0) {
        // Add to the most recent group (last in the array since we sort oldest first)
        result[result.length - 1].messages.push(...messagesWithoutDate);
      } else {
        // Create a "Recent" group for messages without timestamps
        result.push({
          dateString: 'recent',
          dateHeader: 'Recent',
          messages: messagesWithoutDate,
        });
      }
    }

    return result;
  };

  // DateHeader component for displaying date separators
  const DateHeader: React.FC<{ dateHeader: string }> = ({ dateHeader }) => (
    <div className="flex items-center justify-center my-6">
      <div className="bg-gray-100 text-gray-600 text-xs font-medium px-4 py-2 rounded-full shadow-sm border border-gray-200">
        {dateHeader}
      </div>
    </div>
  );

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
            {groupMessagesByDate(messages).map((group, groupIndex) => (
              <div key={group.dateString}>
                {/* Date Header */}
                <DateHeader dateHeader={group.dateHeader} />

                {/* Messages for this date */}
                {group.messages.map((message) => {
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
                        } ${
                          message.id?.startsWith('temp-') ? 'opacity-70' : ''
                        }`}
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
              </div>
            ))}
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
        {/* Report conversation */}
        <div className="mt-3 text-right">
          <button
            type="button"
            onClick={handleReportConversation}
            disabled={isReporting}
            className="inline-flex items-center gap-1 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1 rounded-full text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FlagIcon className="h-4 w-4" />
            {isReporting ? 'Submitting…' : 'Report'}
          </button>
        </div>
      </div>

      {/* Resume Viewer Modal */}
      <ResumeViewer
        resumeUrl={resumeViewer.resumeUrl}
        resumeFileName={resumeViewer.resumeFileName}
        isOpen={resumeViewer.isOpen}
        onClose={closeResumeViewer}
      />

      {/* Report Conversation Modal */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Report Conversation"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Please describe the issue. Reports are reviewed by our admins.
          </p>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={4}
            placeholder="Enter at least 10 characters"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {reportError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {reportError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setReportModalOpen(false)}
              variant="secondary"
              disabled={isReporting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitReport}
              disabled={isReporting}
              variant="primary"
            >
              {isReporting ? 'Submitting…' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Chat;
