import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import {
  tipsTripsAdviceService,
  TipsTripsAdvicePost,
} from '../api/tipsTripsAdviceService';
import { formatTimeAgoNoSuffix } from '../utils/time';

const UserTipsTripsAdviceScreen: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<TipsTripsAdvicePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const userPosts = await tipsTripsAdviceService.getUserPosts();
        const sorted = userPosts.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setPosts(sorted);
      } catch (err) {
        console.error('Error fetching user tips/trips/advice posts:', err);
        setError('Failed to load your posts. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleCreatePost = () => {
    navigate('/post-tips-trips-advice');
  };

  const handleViewPost = (postId: string) => {
    navigate(`/tips-trips-advice/${postId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
          My Tips, Trips & Advice
        </h1>

        <div className="mb-6 space-y-4">
          <p className="text-gray-600 text-center">
            Manage the posts you’ve shared with the community.
          </p>
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreatePost}
              className="inline-flex items-center gap-2"
              aria-label="Create new post"
            >
              <PencilSquareIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {loading && (
            <div className="text-center py-12 text-gray-500">
              Loading your posts...
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-2xl">📝</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                You haven’t shared anything yet
              </h3>
              <p className="text-gray-600 mb-6">
                Post your tips, trip experiences, or advice to help others.
              </p>
              <Button variant="primary" onClick={handleCreatePost}>
                Share Your First Post
              </Button>
            </div>
          )}

          {!loading &&
            !error &&
            posts.map((post, index) => (
              <div key={post.id}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {post.photos && post.photos.length > 0 && (
                    <div className="relative bg-white">
                      <img
                        src={post.photos[0].photo_url}
                        alt={post.title}
                        className="w-full h-56 object-contain"
                      />
                    </div>
                  )}

                  <div className="px-6 py-5 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {post.post_type.charAt(0).toUpperCase() +
                          post.post_type.slice(1)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatTimeAgoNoSuffix(post.created_at)}
                      </span>
                    </div>

                    <h2 className="text-xl font-semibold text-gray-900">
                      {post.title}
                    </h2>

                    <p className="text-gray-700 leading-relaxed max-h-24 overflow-hidden">
                      {post.description}
                    </p>

                    <div className="flex justify-end pt-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewPost(post.id)}
                        className="sm:w-auto"
                      >
                        View Post
                      </Button>
                    </div>
                  </div>
                </div>

                {index < posts.length - 1 && (
                  <div className="border-t border-gray-200 my-6"></div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default UserTipsTripsAdviceScreen;
