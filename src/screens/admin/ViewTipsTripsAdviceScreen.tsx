import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import Button from '../../components/Button';
import {
  adminTipsTripsAdviceService,
  TipsTripsAdvicePost,
} from '../../api/adminTipsTripsAdviceService';
import { formatTimeAgo } from '../../utils/time';
import { useAdminStore } from '../../stores/adminStore';

const ViewTipsTripsAdviceScreen: React.FC = () => {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const { state } = useAdminStore();
  const [post, setPost] = useState<TipsTripsAdvicePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // First try to get the post from the admin store
    if (state.selectedTipsTripsAdvicePost) {
      setPost(state.selectedTipsTripsAdvicePost);
      setLoading(false);
      return;
    }

    // Fallback: fetch from API if not in store
    const fetchPost = async () => {
      if (!postId) return;

      try {
        setLoading(true);
        setError(null);
        const postData = await adminTipsTripsAdviceService.getPostById(postId);
        console.log('Fetched post data from API:', postData);
        setPost(postData);
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('Failed to load post. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, state.selectedTipsTripsAdvicePost]);

  const handleBack = () => {
    navigate('/admin/tipsTripsAndAdvice');
  };

  const handleEdit = () => {
    if (post?.id) {
      navigate(`/admin/tipsTripsAndAdvice/edit/${post.id}`);
    }
  };

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={handleBack}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Back to List
        </button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Post not found</p>
        <button
          onClick={handleBack}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Back to List
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Tips, Trips & Advice
          </button>

          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getPostTypeColor(
                post.post_type || 'unknown'
              )}`}
            >
              {post.post_type
                ? post.post_type.charAt(0).toUpperCase() +
                  post.post_type.slice(1)
                : 'Unknown'}
            </span>

            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                post.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {post.is_active ? 'Active' : 'Inactive'}
            </span>

            <Button
              onClick={handleEdit}
              className="bg-transparent text-black px-4 py-2 rounded-lg transition-colors flex items-center"
            >
              <PencilIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* Author Info */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                className="h-12 w-12 rounded-full object-cover"
                src={
                  post.creator?.profile_photo_url ||
                  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
                }
                alt={`${post.creator?.first_name || 'Unknown'} ${
                  post.creator?.last_name || 'User'
                }`}
              />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {post.creator?.first_name || 'Unknown'}{' '}
                  {post.creator?.last_name || 'User'}
                </h3>
                <p className="text-sm text-gray-500">
                  {post.creator?.email || 'No email'}
                </p>
              </div>
            </div>
            <span className="text-sm text-gray-500">
              {post.created_at
                ? formatTimeAgo(post.created_at)
                : 'Unknown date'}
            </span>
          </div>
        </div>

        {/* Post Title and Description */}
        <div className="px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {post.title || 'No title'}
          </h1>
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {post.description || 'No description available'}
            </p>
          </div>
        </div>

        {/* Post Photos */}
        {post.photos && post.photos.length > 0 && (
          <div className="px-6 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {post.photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo.photo_url}
                    alt={`${post.title} - ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg shadow-sm"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Post Stats */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="text-xs">
              Created:{' '}
              {post.created_at
                ? new Date(post.created_at).toLocaleDateString()
                : 'Unknown'}
              {post.updated_at && post.updated_at !== post.created_at && (
                <span className="ml-2">
                  | Updated: {new Date(post.updated_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewTipsTripsAdviceScreen;
