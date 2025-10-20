import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import DrawerMenu from '../components/DrawerMenu';
import { useUserStore } from '../stores/userStore';
import { useNotificationStore } from '../stores/notificationStore';

const DashboardScreen: React.FC = () => {
  const { user, isLoading, getCompletion } = useUserStore();
  const { unreadCount } = useNotificationStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();

  // Get completion data from store
  const completion = getCompletion();

  // Initialize store from localStorage on mount
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData && !user) {
      try {
        const parsedUser = JSON.parse(userData);
        useUserStore.getState().setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse user data from localStorage:', error);
      }
    }
  }, [user]);

  const handleOverlayClick = () => setIsDrawerOpen(false);

  return (
    <div className="relative">
      <DrawerMenu
        open={isDrawerOpen}
        onClose={handleOverlayClick}
        navigate={navigate}
        highlight={undefined}
      />

      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <svg
            className="animate-spin h-10 w-10 text-sky-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
        </div>
      )}
      {!isLoading && user && (
        <div className="flex-1 px-4 md:px-6 py-4 md:py-8 max-w-4xl mx-auto">
          {/* Your Dashboard Title */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-4">
              Your Dashboard
            </h1>
          </div>

          {/* Notifications Section - Mobile First */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <h2 className="font-bold text-lg md:text-xl text-gray-900">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => navigate('/notifications')}
                className="text-gray-500 text-xl hover:text-gray-700 transition-colors"
                aria-label="View all notifications"
              >
                →
              </button>
            </div>
          </div>

          {/* Personalized Experience Card - Only show if not all steps completed */}
          {completion.completed < completion.total && (
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm mb-6 md:mb-8">
              <h2 className="font-bold text-lg md:text-xl text-gray-900 mb-3">
                Personalized experience
              </h2>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-blue-500 text-base md:text-lg">✓</span>
                <span className="text-gray-700 text-sm md:text-base">
                  {completion.completed} out of {completion.total} completed
                </span>
              </div>
              {completion.percentage > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completion.percentage}%` }}
                  ></div>
                </div>
              )}
              <div className="text-center">
                <Button
                  variant="primary"
                  className="w-full md:w-auto px-6 md:px-8 py-2 md:py-3 text-base md:text-lg"
                  onClick={() => navigate('/background')}
                >
                  {completion.completed === 0
                    ? 'Start questionnaire'
                    : 'Continue questionnaire'}
                </Button>
              </div>
            </div>
          )}

          {/* Connect, Grow & Thrive Section */}
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 md:mb-4">
              Connect, Grow & Thrive
            </h2>
            <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto px-4 md:px-0">
              Access tools to build your career, make new friends, and navigate
              life in the U.S. with support from your community.
            </p>
          </div>

          {/* Work Portal Card */}
          <div className="bg-amber-50 rounded-xl p-4 md:p-6 shadow-sm mb-4 md:mb-6 relative">
            {/* Explore Button - Top Right */}
            <Button
              variant="primary"
              size="sm"
              className="absolute top-3 right-3 md:top-4 md:right-4 text-sm md:text-base px-4 md:px-6 py-2 md:py-3"
              onClick={() => navigate('/work')}
            >
              Explore
            </Button>

            <div className="flex-1">
              <h3 className="font-bold text-lg md:text-xl text-gray-900 mb-3 md:mb-4">
                Work Portal
              </h3>
              <ul className="text-gray-700 space-y-1 md:space-y-2 text-sm md:text-base">
                <li>• Job discovery</li>
                <li>• Company reviews</li>
                <li>• User tips</li>
                <li>• Professional grow</li>
              </ul>
            </div>
          </div>

          {/* Social Portal Card */}
          <div className="bg-green-50 rounded-xl p-4 md:p-6 shadow-sm relative">
            {/* Explore Button - Top Right */}
            <Button
              variant="primary"
              size="sm"
              className="absolute top-3 right-3 md:top-4 md:right-4 text-sm md:text-base px-4 md:px-6 py-2 md:py-3"
              onClick={() => navigate('/social')}
            >
              Explore
            </Button>

            <div className="flex-1">
              <h3 className="font-bold text-lg md:text-xl text-gray-900 mb-3 md:mb-4">
                Social Portal
              </h3>
              <ul className="text-gray-700 space-y-1 md:space-y-2 text-sm md:text-base">
                <li>• Cultural exchange</li>
                <li>• Event planning</li>
                <li>• Weekend meetups</li>
                <li>• Trips, tips and advice</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardScreen;
