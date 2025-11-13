import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';

interface CreateConversationParams {
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto?: string | null;
}

/**
 * Custom hook for creating or getting a conversation with another user
 * and navigating to the chat screen.
 *
 * @returns A function that creates/gets a conversation and navigates to chat
 */
export const useCreateConversation = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();

  const createConversation = async ({
    otherUserId,
    otherUserName,
    otherUserPhoto,
  }: CreateConversationParams) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    // Don't allow chatting with yourself
    if (otherUserId === user.uid) {
      return;
    }

    try {
      // Create or get existing conversation with the other user
      const token = useUserStore.getState().getToken();
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantIds: [user.uid, otherUserId],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Navigate directly to the specific conversation
          navigate(`/chat/${result.data.id}`, {
            state: {
              otherUserId,
              otherUserName,
              otherUserPhoto: otherUserPhoto || null,
            },
          });
        } else {
          console.error('Failed to create conversation:', result.message);
          // Fallback: navigate to general chat
          navigate('/chat');
        }
      } else {
        console.error('Failed to create conversation');
        // Fallback: navigate to general chat
        navigate('/chat');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      // Fallback: navigate to general chat
      navigate('/chat');
    }
  };

  return createConversation;
};

