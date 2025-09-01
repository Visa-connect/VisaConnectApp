import React, { useState, useEffect } from 'react';
import { useUserStore } from '../stores/userStore';
import { chatService, Conversation } from '../api/chatService';
import { websocketService } from '../api/websocketService';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

interface ChatListProps {
  onSelectConversation: (
    conversationId: string,
    otherUserId: string,
    otherUserName: string,
    otherUserPhoto?: string
  ) => void;
  selectedConversationId?: string;
}

const ChatList: React.FC<ChatListProps> = ({
  onSelectConversation,
  selectedConversationId,
}) => {
  const { user } = useUserStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Listen to user's conversations with real-time updates via WebSocket
  useEffect(() => {
    if (!user?.uid) return;

    // Initial load of conversations
    const loadInitialConversations = async () => {
      try {
        const initialConversations = await chatService.getConversations();
        setConversations(initialConversations);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading initial conversations:', error);
        setIsLoading(false);
      }
    };

    loadInitialConversations();

    // Subscribe to real-time updates via WebSocket
    websocketService.subscribeToUserConversations((newConversations) => {
      setConversations(newConversations);
      setIsLoading(false);
    });

    return () => {
      websocketService.unsubscribeFromUserConversations();
    };
  }, [user?.uid]);

  // Get the other user's ID from a conversation
  const getOtherUserId = (conversation: Conversation): string => {
    if (!user?.uid) return '';
    return conversation.participants.find((id) => id !== user.uid) || '';
  };

  // Get the other user's name from enhanced conversation data
  const getOtherUserName = (conversation: Conversation): string => {
    // Check if we have enhanced user data from the API
    if (conversation.otherUser?.fullName) {
      return conversation.otherUser.fullName;
    }

    // Fallback to user ID if no name is available
    const otherUserId = getOtherUserId(conversation);
    return otherUserId ? `User ${otherUserId.slice(-4)}` : 'User';
  };

  // Get the other user's photo from enhanced conversation data
  const getOtherUserPhoto = (
    conversation: Conversation
  ): string | undefined => {
    // Check if we have enhanced user data from the API
    if (conversation.otherUser?.profilePhotoUrl) {
      return conversation.otherUser.profilePhotoUrl;
    }

    // Return undefined to use initials fallback
    return undefined;
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

      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      } else if (diffInHours < 48) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString();
      }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
        <ChatBubbleLeftIcon className="w-12 h-12 mb-4" />
        <p className="text-lg font-medium">No conversations yet</p>
        <p className="text-sm text-center">
          Start chatting with other users to see conversations here
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="px-4 py-3 bg-transparent">
        <div className="flex items-center justify-center">
          <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => {
          const otherUserId = getOtherUserId(conversation);
          const otherUserName = getOtherUserName(conversation);
          const otherUserPhoto = getOtherUserPhoto(conversation);
          const isSelected = conversation.id === selectedConversationId;
          const unreadCount = conversation.unreadCount?.[user?.uid || ''] || 0;
          const lastMessage =
            conversation.lastMessage?.content || 'No messages yet';
          const isUnread = unreadCount > 0;

          return (
            <div
              key={conversation.id}
              onClick={() =>
                onSelectConversation(
                  conversation.id!,
                  otherUserId,
                  otherUserName,
                  otherUserPhoto
                )
              }
              className={`px-4 py-3 bg-transparent border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                isSelected ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                {/* User Avatar */}
                {otherUserPhoto ? (
                  <img
                    src={otherUserPhoto}
                    alt={otherUserName}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-600 font-medium text-lg">
                      {otherUserName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Conversation Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {otherUserName}
                    </h3>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {conversation.lastMessageTime
                        ? formatTime(conversation.lastMessageTime)
                        : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm truncate flex-1 ${
                        isUnread ? 'text-blue-600 font-medium' : 'text-gray-600'
                      }`}
                    >
                      {lastMessage}
                    </p>
                    {unreadCount > 0 && (
                      <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center flex-shrink-0 ml-2">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatList;
