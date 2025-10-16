import React, { useState, useEffect } from 'react';
import { HandThumbUpIcon } from '@heroicons/react/24/outline';
import { HandThumbUpIcon as HandThumbUpIconSolid } from '@heroicons/react/24/solid';
import { userService } from '../api/userService';

interface ThumbsUpButtonProps {
  receiverId: string;
  conversationId: string;
  className?: string;
  onThumbsUpGiven?: (helpedCount: number) => void;
}

const ThumbsUpButton: React.FC<ThumbsUpButtonProps> = ({
  receiverId,
  conversationId,
  className = '',
  onThumbsUpGiven,
}) => {
  const [hasGivenThumbsUp, setHasGivenThumbsUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check if user has already given a thumbs-up to this receiver
  useEffect(() => {
    const checkThumbsUpStatus = async () => {
      try {
        setIsChecking(true);
        const response = await userService.hasGivenThumbsUp(receiverId);
        setHasGivenThumbsUp(response.has_given_thumbs_up);
      } catch (error) {
        console.error('Error checking thumbs-up status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkThumbsUpStatus();
  }, [receiverId]);

  const handleThumbsUp = async () => {
    if (isLoading || hasGivenThumbsUp) return;

    try {
      setIsLoading(true);

      if (hasGivenThumbsUp) {
        // Remove thumbs-up
        const response = await userService.removeThumbsUp(receiverId);
        if (response.success) {
          setHasGivenThumbsUp(false);
          onThumbsUpGiven?.(response.helped_count || 0);
        }
      } else {
        // Give thumbs-up (using conversation ID to track which conversation the thumbs-up was given in)
        const response = await userService.giveThumbsUp({
          receiver_id: receiverId,
          chat_message_id: conversationId,
        });

        if (response.success) {
          setHasGivenThumbsUp(true);
          onThumbsUpGiven?.(response.helped_count || 0);
        } else if (response.already_given) {
          setHasGivenThumbsUp(true);
        }
      }
    } catch (error) {
      console.error('Error handling thumbs-up:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className={`w-8 h-8 flex items-center justify-center ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  return (
    <button
      onClick={handleThumbsUp}
      disabled={isLoading}
      className={`flex items-center space-x-1 px-3 py-1.5 rounded-full transition-all duration-200 ${
        hasGivenThumbsUp
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
      } ${
        isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      title={hasGivenThumbsUp ? 'Remove thumbs-up' : 'Give thumbs-up'}
    >
      {hasGivenThumbsUp ? (
        <HandThumbUpIconSolid className="w-4 h-4" />
      ) : (
        <HandThumbUpIcon className="w-4 h-4" />
      )}
      <span className="text-xs font-medium">
        {hasGivenThumbsUp ? 'Helped!' : 'Help'}
      </span>
    </button>
  );
};

export default ThumbsUpButton;
