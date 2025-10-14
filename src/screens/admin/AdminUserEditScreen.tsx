import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Button from '../../components/Button';
import {
  adminUserService,
  AdminUser,
  UpdateUserData,
} from '../../api/adminUserService';
import { useAdminStore } from '../../stores/adminStore';

const AdminUserEditScreen: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { state } = useAdminStore();
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    date_of_birth: '',
    nationality: '',
    visa_type: '',
    current_location: '',
    occupation: '',
    is_active: true,
    is_verified: false,
    admin_notes: '',
  });

  useEffect(() => {
    // First try to get the user from the admin store
    if (state.selectedUser) {
      const userData = state.selectedUser;
      setUser(userData);
      setFormData({
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone_number: userData.phone_number || '',
        date_of_birth: userData.date_of_birth || '',
        nationality: userData.nationality || '',
        visa_type: userData.visa_type || '',
        current_location:
          typeof userData.current_location === 'string'
            ? userData.current_location
            : userData.current_location
            ? `${userData.current_location.city || ''}, ${
                userData.current_location.state || ''
              }, ${userData.current_location.country || ''}`
                .replace(/^,\s*|,\s*$/g, '')
                .replace(/,\s*,/g, ',')
            : '',
        occupation: userData.occupation || '',
        is_active: userData.is_active,
        is_verified: userData.is_verified,
        admin_notes: userData.admin_notes || '',
      });
      setLoadingUser(false);
      return;
    }

    // Fallback: fetch from API if not in store
    const fetchUser = async () => {
      if (!userId) return;

      try {
        setLoadingUser(true);
        const userData = await adminUserService.getUserById(userId);
        setUser(userData);
        setFormData({
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone_number: userData.phone_number || '',
          date_of_birth: userData.date_of_birth || '',
          nationality: userData.nationality || '',
          visa_type: userData.visa_type || '',
          current_location:
            typeof userData.current_location === 'string'
              ? userData.current_location
              : userData.current_location
              ? `${userData.current_location.city || ''}, ${
                  userData.current_location.state || ''
                }, ${userData.current_location.country || ''}`
                  .replace(/^,\s*|,\s*$/g, '')
                  .replace(/,\s*,/g, ',')
              : '',
          occupation: userData.occupation || '',
          is_active: userData.is_active,
          is_verified: userData.is_verified,
          admin_notes: userData.admin_notes || '',
        });
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('Failed to load user. Please try again.');
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, [userId, state.selectedUser]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name || !formData.last_name) {
      setError('Please fill in all required fields');
      return;
    }

    if (!userId) {
      setError('User ID is missing');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updateData: UpdateUserData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        nationality: formData.nationality || undefined,
        visa_type: formData.visa_type || undefined,
        current_location: formData.current_location
          ? (() => {
              const parts = formData.current_location
                .split(',')
                .map((p) => p.trim());
              return {
                city: parts[0] || undefined,
                state: parts[1] || undefined,
                country: parts[2] || undefined,
              };
            })()
          : undefined,
        occupation: formData.occupation || undefined,
        is_active: formData.is_active,
        is_verified: formData.is_verified,
        admin_notes: formData.admin_notes || undefined,
      };

      await adminUserService.updateUser(userId, updateData);
      navigate('/admin/users');
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/admin/users');
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">User not found</p>
        <Button onClick={handleBack} variant="primary">
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <button
            onClick={handleBack}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
        </div>
        <p className="text-gray-600">
          Editing: {user.first_name} {user.last_name} ({user.email})
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          {/* Personal Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="first_name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  First Name *
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="last_name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Last Name *
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="phone_number"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="date_of_birth"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="date_of_birth"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="nationality"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Nationality
                </label>
                <input
                  type="text"
                  id="nationality"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="visa_type"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Visa Type
                </label>
                <input
                  type="text"
                  id="visa_type"
                  name="visa_type"
                  value={formData.visa_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="current_location"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Current Location
                </label>
                <input
                  type="text"
                  id="current_location"
                  name="current_location"
                  value={formData.current_location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="occupation"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Occupation
                </label>
                <input
                  type="text"
                  id="occupation"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Account Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="is_active"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Account is active
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_verified"
                  name="is_verified"
                  checked={formData.is_verified}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="is_verified"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Account is verified
                </label>
              </div>
            </div>
          </div>

          {/* Admin Notes */}
          <div className="mb-6">
            <label
              htmlFor="admin_notes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Admin Notes
            </label>
            <textarea
              id="admin_notes"
              name="admin_notes"
              value={formData.admin_notes}
              onChange={handleInputChange}
              rows={4}
              placeholder="Add any admin notes about this user..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleBack}
              className="px-6 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="px-6 py-2"
            >
              {loading ? 'Updating...' : 'Update User'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminUserEditScreen;
