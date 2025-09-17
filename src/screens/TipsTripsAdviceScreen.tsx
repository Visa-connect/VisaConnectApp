import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import {
  tipsTripsAdviceService,
  TipsTripsAdvicePost,
} from '../api/tipsTripsAdviceService';

type FilterType = 'all' | 'tip' | 'trip' | 'advice';

interface FilterTab {
  key: FilterType;
  label: string;
}

const TipsTripsAdviceScreen: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<TipsTripsAdvicePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  // Define filters with proper typing
  const filters: FilterTab[] = [
    { key: 'all', label: 'All' },
    { key: 'tip', label: 'Tips' },
    { key: 'trip', label: 'Trips' },
    { key: 'advice', label: 'Advice' },
  ];

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await tipsTripsAdviceService.searchPosts({
        post_type: selectedFilter === 'all' ? undefined : selectedFilter,
      });
      setPosts(response);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedFilter]);

  // Fetch posts from API
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleTripsClick = (postId: number) => {
    // TODO: Implement chat functionality for the specific post
    console.log('Opening chat for post:', postId);
    // navigate(`/chat?postId=${postId}`);
  };

  const handlePostClick = (postId: number) => {
    navigate(`/tips-trips-advice/${postId}`);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hr';
    if (diffInHours < 24) return `${diffInHours} hrs`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day';
    return `${diffInDays} days`;
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading posts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchPosts} className="bg-blue-600 text-white">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Page Title */}
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
          Tips, Trips & Advice
        </h1>

        {/* Create Post Button */}
        {/* <div className="mb-6">
          <Button
            variant="primary"
            onClick={() => navigate('/post-tips-trips-advice')}
            className="w-full py-4 text-lg font-medium"
          >
            Share a Tip, Trip, or Advice
          </Button>
        </div> */}

        {/* Filter Tabs */}
        <div className="mb-8">
          <div className="flex justify-center space-x-4">
            {filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key)}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-colors ${
                  selectedFilter === filter.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-2xl">📝</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No posts yet
              </h3>
              <p className="text-gray-600 mb-4">
                {selectedFilter === 'all'
                  ? 'Be the first to share a tip, trip, or advice!'
                  : `No ${selectedFilter}s have been shared yet.`}
              </p>
              <Button
                onClick={() => navigate('/post-tips-trips-advice')}
                className="bg-blue-600 text-white"
              >
                Create First Post
              </Button>
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
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
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatTimeAgo(post.created_at)}
                  </span>
                </div>

                {/* Post Content */}
                <div className="px-6 py-4">
                  <button
                    onClick={() => handlePostClick(post.id)}
                    className="text-xl font-bold text-blue-600 mb-3 hover:text-blue-800 transition-colors text-left"
                  >
                    {post.title}
                  </button>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {post.description}
                  </p>
                </div>

                {/* Post Image */}
                {post.photos && post.photos.length > 0 && (
                  <div className="relative">
                    <img
                      src={post.photos[0].photo_url}
                      alt={post.title}
                      className="w-full h-64 object-cover"
                    />
                  </div>
                )}

                {/* Action Button */}
                <div className="px-6 py-4 flex justify-center">
                  <Button
                    onClick={() => handleTripsClick(post.id)}
                    className="w-full sm:w-1/2  bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
                  >
                    Chat
                  </Button>
                </div>

                {/* Stats - removed for now */}
                {/* <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>{post.likes_count} likes</span>
                    <span>{post.comments_count} comments</span>
                  </div>
                </div> */}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TipsTripsAdviceScreen;
