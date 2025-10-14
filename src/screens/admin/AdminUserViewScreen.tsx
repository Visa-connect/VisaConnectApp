import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BriefcaseIcon,
  CalendarIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import Button from '../../components/Button';
import { adminUserService, AdminUser } from '../../api/adminUserService';
import { useAdminStore } from '../../stores/adminStore';

const AdminUserViewScreen: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { state } = useAdminStore();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // First try to get the user from the admin store
    if (state.selectedUser) {
      setUser(state.selectedUser);
      setLoading(false);
      return;
    }

    // Fallback: fetch from API if not in store
    const fetchUser = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        setError(null);
        const userData = await adminUserService.getUserById(userId);
        console.log('Fetched user data from API:', userData);
        setUser(userData);
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('Failed to load user. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, state.selectedUser]);

  const handleBack = () => {
    navigate('/admin/users');
  };

  const handleEdit = () => {
    if (user?.id) {
      navigate(`/admin/users/edit/${user.id}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
          Back to Users
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">User not found</p>
        <button
          onClick={handleBack}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Back to Users
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
            Back to Users
          </button>

          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                user.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {user.is_active ? 'Active' : 'Inactive'}
            </span>

            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                user.is_verified
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {user.is_verified ? 'Verified' : 'Unverified'}
            </span>

            <Button
              onClick={handleEdit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* User Content */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* Profile Header */}
        <div className="px-6 py-6 border-b border-gray-200">
          <div className="flex items-center">
            <img
              className="h-20 w-20 rounded-full object-cover"
              src={
                user.profile_photo_url ||
                'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
              }
              alt={`${user.first_name} ${user.last_name}`}
            />
            <div className="ml-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {user.first_name} {user.last_name}
              </h1>
              <p className="text-gray-600 flex items-center mt-1">
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                {user.email}
              </p>
              <div className="flex items-center mt-2 space-x-4">
                <span className="text-sm text-gray-500 flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Joined {formatDate(user.created_at)}
                </span>
                {user.last_login_at && (
                  <span className="text-sm text-gray-500 flex items-center">
                    <UserIcon className="h-4 w-4 mr-1" />
                    Last login {formatDateTime(user.last_login_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Details */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <UserIcon className="h-5 w-5 mr-2" />
                Personal Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Full Name
                  </label>
                  <p className="text-gray-900">
                    {user.first_name} {user.last_name}
                  </p>
                </div>
                {user.phone_number && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Phone Number
                    </label>
                    <p className="text-gray-900 flex items-center">
                      <PhoneIcon className="h-4 w-4 mr-2" />
                      {user.phone_number}
                    </p>
                  </div>
                )}
                {user.date_of_birth && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Date of Birth
                    </label>
                    <p className="text-gray-900">
                      {formatDate(user.date_of_birth)}
                    </p>
                  </div>
                )}
                {user.nationality && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Nationality
                    </label>
                    <p className="text-gray-900">{user.nationality}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Visa & Location Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2" />
                Visa & Location
              </h3>
              <div className="space-y-3">
                {user.visa_type && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Visa Type
                    </label>
                    <p className="text-gray-900">{user.visa_type}</p>
                  </div>
                )}
                {user.current_location && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Current Location
                    </label>
                    <p className="text-gray-900 flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      {typeof user.current_location === 'string'
                        ? user.current_location
                        : user.current_location.city ||
                          user.current_location.state ||
                          user.current_location.country ||
                          'Location not specified'}
                    </p>
                  </div>
                )}
                {user.occupation && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Occupation
                    </label>
                    <p className="text-gray-900 flex items-center">
                      <BriefcaseIcon className="h-4 w-4 mr-2" />
                      {user.occupation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Verification Status */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ShieldCheckIcon className="h-5 w-5 mr-2" />
              Verification Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center p-3 rounded-lg bg-gray-50">
                <EnvelopeIcon className="h-5 w-5 mr-3 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p
                    className={`text-sm ${
                      user.email_verified ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {user.email_verified ? 'Verified' : 'Unverified'}
                  </p>
                </div>
              </div>
              <div className="flex items-center p-3 rounded-lg bg-gray-50">
                <PhoneIcon className="h-5 w-5 mr-3 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Phone</p>
                  <p
                    className={`text-sm ${
                      user.phone_verified ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {user.phone_verified ? 'Verified' : 'Unverified'}
                  </p>
                </div>
              </div>
              <div className="flex items-center p-3 rounded-lg bg-gray-50">
                <ShieldCheckIcon className="h-5 w-5 mr-3 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Account</p>
                  <p
                    className={`text-sm ${
                      user.is_verified ? 'text-green-600' : 'text-yellow-600'
                    }`}
                  >
                    {user.is_verified ? 'Verified' : 'Pending'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Notes */}
          {user.admin_notes && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Admin Notes
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-gray-700">{user.admin_notes}</p>
              </div>
            </div>
          )}

          {/* Account Information */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p>
                  <span className="font-medium">Firebase UID:</span>{' '}
                  {user.firebase_uid}
                </p>
                <p>
                  <span className="font-medium">User ID:</span> {user.id}
                </p>
              </div>
              <div>
                <p>
                  <span className="font-medium">Created:</span>{' '}
                  {formatDateTime(user.created_at)}
                </p>
                {user.updated_at && (
                  <p>
                    <span className="font-medium">Last Updated:</span>{' '}
                    {formatDateTime(user.updated_at)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserViewScreen;
