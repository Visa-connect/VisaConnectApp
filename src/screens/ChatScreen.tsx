import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import ChatList from '../components/ChatList';
import Chat from '../components/Chat';
import { useUserStore } from '../stores/userStore';

const ChatScreen: React.FC = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const location = useLocation();

  const [selectedConversationId, setSelectedConversationId] =
    useState<string>('');
  const [otherUserId, setOtherUserId] = useState<string>('');
  const [otherUserName, setOtherUserName] = useState<string>('');
  const [otherUserPhoto, setOtherUserPhoto] = useState<string>('');
  const [otherUserDetails, setOtherUserDetails] = useState<any>(null);

  // Handle direct navigation to a specific conversation
  useEffect(() => {
    if (conversationId) {
      setSelectedConversationId(conversationId);

      // Get user info from location state (passed from PublicProfileScreen)
      if (location.state) {
        const { otherUserId, otherUserName, otherUserPhoto } =
          location.state as {
            otherUserId: string;
            otherUserName: string;
            otherUserPhoto: string | null;
          };
        setOtherUserId(otherUserId);
        setOtherUserName(otherUserName);
        setOtherUserPhoto(otherUserPhoto || '');
      }
    }
  }, [conversationId, location.state]);

  // Fetch user details when conversation is selected
  useEffect(() => {
    if (selectedConversationId && otherUserId) {
      fetchUserDetails(selectedConversationId);
    }
  }, [selectedConversationId, otherUserId]);

  // Function to fetch user details from the database
  const fetchUserDetails = async (conversationId: string) => {
    try {
      const response = await fetch(
        `/api/chat/conversations/${conversationId}/user-info`,
        {
          headers: {
            Authorization: `Bearer ${useUserStore.getState().getToken()}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOtherUserDetails(data.data);
          // Update the name and photo if we have better data
          if (data.data.fullName && data.data.fullName !== 'User') {
            setOtherUserName(data.data.fullName);
          }
          if (data.data.profilePhotoUrl) {
            setOtherUserPhoto(data.data.profilePhotoUrl);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const handleSelectConversation = (
    conversationId: string,
    otherUserId: string,
    otherUserName: string,
    otherUserPhoto?: string
  ) => {
    setSelectedConversationId(conversationId);
    setOtherUserId(otherUserId);
    setOtherUserName(otherUserName);
    setOtherUserPhoto(otherUserPhoto || '');
  };

  // If a conversation is selected, show the chat view
  if (selectedConversationId) {
    return (
      <div className="flex flex-col bg-gray-50 h-full">
        {/* Chat Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center relative">
          <button
            onClick={() => {
              setSelectedConversationId('');
              // If we came from a direct conversation URL, go back to chat list
              if (conversationId) {
                navigate('/chat');
              }
            }}
            className="absolute left-4 p-1 z-10"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Centered User Info */}
          <div className="flex items-center justify-center flex-1">
            {otherUserPhoto ? (
              <img
                src={otherUserPhoto}
                alt={otherUserName}
                className="w-10 h-10 rounded-full object-cover mr-3"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                <span className="text-gray-600 font-medium">
                  {(otherUserDetails?.fullName || otherUserName)
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>
            )}
            <div className="text-center">
              <h2 className="font-semibold text-gray-900">
                {otherUserDetails?.fullName || otherUserName}
              </h2>
              {otherUserDetails && (
                <div className="text-xs text-gray-500 mt-1">
                  {otherUserDetails.occupation && (
                    <span className="block">{otherUserDetails.occupation}</span>
                  )}
                  {otherUserDetails.visaType && (
                    <span className="block">{otherUserDetails.visaType}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-hidden max-w-4xl mx-auto w-full">
          <Chat
            conversationId={selectedConversationId}
            otherUserId={otherUserId}
            otherUserName={otherUserName}
            otherUserPhoto={otherUserPhoto}
          />
        </div>
      </div>
    );
  }

  // Main chat list view
  return (
    <div className="flex flex-col bg-gray-50 h-full">
      {/* Chat List */}
      <div className="flex-1 overflow-hidden max-w-4xl mx-auto w-full">
        <ChatList
          onSelectConversation={handleSelectConversation}
          selectedConversationId={selectedConversationId}
        />
      </div>
    </div>
  );
};

export default ChatScreen;
