import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  LightBulbIcon,
  FlagIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import {
  adminTipsTripsAdviceService,
  TipsTripsAdvicePost,
} from '../../api/adminTipsTripsAdviceService';
import { useAdminBusinesses } from '../../hooks/useAdminBusinesses';
import { useAdminUsers } from '../../hooks/useAdminUsers';

const AdminDashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [recentPosts, setRecentPosts] = useState<TipsTripsAdvicePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPosts: 0,
    activePosts: 0,
    totalUsers: 0,
    totalEmployers: 0,
  });
  // const [employerStats, setEmployerStats] = useState<EmployerStats | null>(
  //   null
  // );

  // Use admin business hook for employer data
  const { businessCounts } = useAdminBusinesses();
  // Use admin users hook for user data
  const { users, refreshData: refreshUsers } = useAdminUsers();

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch users data
      await refreshUsers();

      // Fetch recent posts
      const postsResponse = await adminTipsTripsAdviceService.searchPosts({
        limit: 5,
      });
      setRecentPosts(postsResponse.data);

      // Fetch employer stats
      // try {
      //   const employerStatsResponse =
      //     await adminEmployerService.getEmployerStats();
      //   setEmployerStats(employerStatsResponse);
      // } catch (err) {
      //   console.warn('Failed to fetch employer stats:', err);
      // }

      // Calculate post stats
      const allPostsResponse = await adminTipsTripsAdviceService.searchPosts(
        {}
      );
      const allPosts = allPostsResponse.data;
      const activePosts = allPosts.filter((post) => post.is_active);

      setStats({
        totalPosts: allPosts.length,
        activePosts: activePosts.length,
        totalUsers: users.length,
        totalEmployers: businessCounts.all,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [refreshUsers, users.length, businessCounts.all]);

  useEffect(() => {
    // Redirect from /admin to /admin/dashboard
    if (location.pathname === '/admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }

    fetchDashboardData();
  }, [location.pathname, navigate, fetchDashboardData]);

  const quickActions = [
    {
      name: 'Business Verifications',
      href: '/admin/businesses',
      icon: BuildingOfficeIcon,
      color: 'bg-green-500',
      description: 'Review and manage business submissions',
    },
    {
      name: 'Manage Users',
      href: '/admin/users',
      icon: UserGroupIcon,
      color: 'bg-blue-500',
      description: 'View and manage user accounts',
    },
    {
      name: 'Tips, Trips & Advice',
      href: '/admin/tipsTripsAndAdvice',
      icon: LightBulbIcon,
      color: 'bg-yellow-500',
      description: 'Manage community posts',
    },
    {
      name: 'Reports',
      href: '/admin/reports',
      icon: FlagIcon,
      color: 'bg-red-500',
      description: 'View system reports and analytics',
    },
  ];

  const statCards = [
    {
      name: 'Total Posts',
      value: stats.totalPosts,
      icon: LightBulbIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Active Posts',
      value: stats.activePosts,
      icon: EyeIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Total Users',
      value: stats.totalUsers,
      icon: UserGroupIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Total Employers',
      value: stats.totalEmployers,
      icon: BuildingOfficeIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to the VisaConnect admin panel. Manage your community and
          content.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.name}
                  onClick={() => navigate(action.href)}
                  className="w-full flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${action.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="ml-4 text-left">
                    <p className="font-medium text-gray-900">{action.name}</p>
                    <p className="text-sm text-gray-500">
                      {action.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Posts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Posts
            </h2>
            <button
              onClick={() => navigate('/admin/tipsTripsAndAdvice')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all
            </button>
          </div>
          {recentPosts.length === 0 ? (
            <div className="text-center py-8">
              <LightBulbIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No posts yet</p>
              <button
                onClick={() => navigate('/admin/tipsTripsAndAdvice/create')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Create the first post
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50"
                >
                  <img
                    className="h-10 w-10 rounded-full object-cover"
                    src={
                      post.creator.profile_photo_url ||
                      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
                    }
                    alt={`${post.creator.first_name} ${post.creator.last_name}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {post.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      by {post.creator.first_name} {post.creator.last_name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        post.post_type === 'tip'
                          ? 'bg-green-100 text-green-800'
                          : post.post_type === 'trip'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {post.post_type.charAt(0).toUpperCase() +
                        post.post_type.slice(1)}
                    </span>
                    <button
                      onClick={() =>
                        navigate(`/admin/tipsTripsAndAdvice/edit/${post.id}`)
                      }
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardScreen;
