import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import {
  tipsTripsAdviceService,
  TipsTripsAdvicePost,
} from '../api/tipsTripsAdviceService';
import { formatTimeAgoNoSuffix } from '../utils/time';
import { useUserStore } from '../stores/userStore';

type FilterType = 'all' | 'tip' | 'trip' | 'advice';

interface FilterTab {
  key: FilterType;
  label: string;
}

const TipsTripsAdviceScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
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

  const handlePostClick = (postId: string) => {
    navigate(`/tips-trips-advice/${postId}`);
  };

  const handleAuthorClick = (userId: string) => {
    navigate(`/public-profile/${userId}`);
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

        {user && (
          <div className="mb-6 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/post-tips-trips-advice')}
              className="inline-flex items-center"
              aria-label="Create new post"
            >
              <PencilSquareIcon className="h-5 w-5" />
            </Button>
          </div>
        )}

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
              {user && (
                <Button
                  onClick={() => navigate('/post-tips-trips-advice')}
                  className="bg-blue-600 text-white"
                >
                  Create First Post
                </Button>
              )}
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
                    <button
                      onClick={() => handleAuthorClick(post.creator.id)}
                      className="focus:outline-none"
                      aria-label={`View ${post.creator.first_name} ${post.creator.last_name}'s profile`}
                    >
                      <img
                        src={
                          post.creator.profile_photo_url ||
                          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
                        }
                        alt={`${post.creator.first_name} ${post.creator.last_name}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </button>
                    <div>
                      <button
                        onClick={() => handleAuthorClick(post.creator.id)}
                        className="font-semibold text-gray-900 text-left hover:underline"
                      >
                        {post.creator.first_name} {post.creator.last_name}
                      </button>
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
                    {formatTimeAgoNoSuffix(post.created_at)}
                  </span>
                </div>

                <div
                  onClick={() => handlePostClick(post.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePostClick(post.id);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {/* Post Content */}
                  <div className="px-6 py-4 font-bold">
                    {post.title}
                    <p className="text-gray-700 leading-relaxed mb-4 font-normal">
                      {post.description}
                    </p>
                  </div>

                  {/* Post Image */}
                  {post.photos && post.photos.length > 0 && (
                    <div className="relative flex items-center justify-center bg-white">
                      <img
                        src={post.photos[0].photo_url}
                        alt={post.title}
                        className="w-full h-64 md:h-96 object-contain object-center"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TipsTripsAdviceScreen;
