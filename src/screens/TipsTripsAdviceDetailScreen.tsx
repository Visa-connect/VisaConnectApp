import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Button from '../components/Button';
import {
  tipsTripsAdviceService,
  TipsTripsAdvicePost,
} from '../api/tipsTripsAdviceService';
import { formatTimeAgo } from '../utils/time';
import { useUserStore } from '../stores/userStore';
import { useCreateConversation } from '../hooks/useCreateConversation';

const TipsTripsAdviceDetailScreen: React.FC = () => {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const { user } = useUserStore();
  const createConversation = useCreateConversation();
  const [post, setPost] = useState<TipsTripsAdvicePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;

      try {
        setLoading(true);
        setError(null);
        const postData = await tipsTripsAdviceService.getPostById(postId);
        setPost(postData);
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('Failed to load post. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleChat = () => {
    if (!post) return;

    createConversation({
      otherUserId: post.creator_id,
      otherUserName: `${post.creator.first_name} ${post.creator.last_name}`,
      otherUserPhoto: post.creator.profile_photo_url || null,
    });
  };

  const handleEditPost = () => {
    if (!post) return;
    navigate(`/edit-tips-trips-advice/${post.id}`);
  };

  const isCreator = user && post?.creator_id === user.uid;

  const getPostTypeColor = (postType: string) => {
    switch (postType) {
      case 'tip':
        return 'bg-green-100 text-green-800';
      case 'trip':
        return 'bg-blue-100 text-blue-800';
      case 'advice':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Post not found'}</p>
          <Button onClick={handleBack} className="bg-blue-600 text-white">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back
          </button>
        </div>

        {/* Post Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* User Profile Section */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <img
                src={
                  post.creator.profile_photo_url ||
                  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
                }
                alt={`${post.creator.first_name} ${post.creator.last_name}`}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h3 className="font-semibold text-gray-900">
                  {post.creator.first_name} {post.creator.last_name}
                </h3>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getPostTypeColor(
                      post.post_type
                    )}`}
                  >
                    {post.post_type.charAt(0).toUpperCase() +
                      post.post_type.slice(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatTimeAgo(post.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="px-6 py-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {post.description}
              </p>
            </div>
          </div>

          {/* Post Images */}
          {post.photos && post.photos.length > 0 && (
            <div className="px-6 pb-6">
              <div className="flex flex-wrap justify-center gap-4">
                {post.photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative max-w-xs w-full flex justify-center"
                  >
                    <img
                      src={photo.photo_url}
                      alt={`${post.title} - ${index + 1}`}
                      className="w-full h-64 object-contain rounded-lg bg-gray-50"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-6 py-4 border-t border-gray-100">
            <div className="flex justify-end">
              {isCreator ? (
                <Button
                  onClick={handleEditPost}
                  variant="secondary"
                  className="px-6 py-2"
                >
                  Update Post
                </Button>
              ) : (
                <Button
                  onClick={handleChat}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Chat
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TipsTripsAdviceDetailScreen;
