import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BellIcon,
  CheckIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import DrawerMenu from '../components/DrawerMenu';
import { useNotificationStore } from '../stores/notificationStore';
import { Notification, NotificationType } from '../types/notifications';

const NotificationsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<
    Set<number>
  >(new Set());
  const [showUnreadOnly, setShowUnreadOnly] = useState(true);

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadNotifications,
  } = useNotificationStore();

  const handleOverlayClick = () => {
    setIsDrawerOpen(false);
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDeleteNotification = async (notificationId: number) => {
    await deleteNotification(notificationId);
  };

  const handleSelectNotification = (notificationId: number) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  const handleSelectAll = () => {
    const filteredNotifications = showUnreadOnly
      ? getUnreadNotifications()
      : notifications;
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map((n) => n.id)));
    }
  };

  const handleDeleteSelected = async () => {
    for (const id of Array.from(selectedNotifications)) {
      await deleteNotification(id);
    }
    setSelectedNotifications(new Set());
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'job_applicant':
        return '💼';
      case 'meetup_interest':
        return '👥';
      case 'chat_message':
        return '💬';
      case 'meetup_updated':
        return '📅';
      case 'job_updated':
        return '📝';
      case 'application_status_changed':
        return '✅';
      case 'meetup_reminder':
        return '⏰';
      case 'system_announcement':
        return '📢';
      default:
        return '🔔';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications(50); // Fetch more notifications for the dedicated screen
  }, [fetchNotifications]);

  // Filter notifications based on showUnreadOnly
  const filteredNotifications = showUnreadOnly
    ? getUnreadNotifications()
    : notifications;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Back button and Title */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBack}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-2">
                <BellIcon className="h-6 w-6 text-gray-600" />
                <h1 className="text-xl font-semibold text-gray-900">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>

            {/* Right side - Mobile menu button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <svg
                className="h-6 w-6 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        {/* Action Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Filter and Selection Controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showUnreadOnly
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showUnreadOnly ? (
                  <EyeSlashIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
                <span>{showUnreadOnly ? 'Show All' : 'Unread Only'}</span>
              </button>

              {filteredNotifications.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {selectedNotifications.size === filteredNotifications.length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {selectedNotifications.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Delete ({selectedNotifications.size})</span>
                </button>
              )}

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                >
                  <CheckIcon className="h-4 w-4" />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => fetchNotifications(50)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {showUnreadOnly
                  ? 'No unread notifications'
                  : 'No notifications'}
              </h3>
              <p className="text-gray-500">
                {showUnreadOnly
                  ? "You're all caught up!"
                  : "You'll see notifications here when you receive them."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 transition-all duration-200 ${
                  !notification.read_at ? 'ring-2 ring-blue-100 bg-blue-50' : ''
                } ${
                  selectedNotifications.has(notification.id)
                    ? 'ring-2 ring-blue-500'
                    : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedNotifications.has(notification.id)}
                    onChange={() => handleSelectNotification(notification.id)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />

                  {/* Notification Icon */}
                  <div className="flex-shrink-0">
                    <span className="text-2xl">
                      {getNotificationIcon(notification.type)}
                    </span>
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3
                          className={`text-sm font-medium ${
                            !notification.read_at
                              ? 'text-gray-900'
                              : 'text-gray-700'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {!notification.read_at && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">
                              New
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.read_at && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Mark as read"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleDeleteNotification(notification.id)
                          }
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete notification"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Click to Navigate */}
                {notification.action_url && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Details →
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Drawer Menu */}
      <DrawerMenu
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        navigate={navigate}
      />

      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={handleOverlayClick}
        />
      )}
    </div>
  );
};

export default NotificationsScreen;
