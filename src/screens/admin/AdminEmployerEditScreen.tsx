import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Button from '../../components/Button';
import {
  adminEmployerService,
  AdminEmployer,
  UpdateEmployerData,
} from '../../api/adminEmployerService';
import { useAdminStore } from '../../stores/adminStore';

const AdminEmployerEditScreen: React.FC = () => {
  const navigate = useNavigate();
  const { employerId } = useParams<{ employerId: string }>();
  const { state } = useAdminStore();
  const [loading, setLoading] = useState(false);
  const [loadingEmployer, setLoadingEmployer] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employer, setEmployer] = useState<AdminEmployer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    industry: '',
    size: '',
    contact_email: '',
    phone_number: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    is_active: true,
    verification_notes: '',
  });

  useEffect(() => {
    // First try to get the employer from the admin store
    if (state.selectedEmployer) {
      const employerData = state.selectedEmployer;
      setEmployer(employerData);
      setFormData({
        name: employerData.name,
        description: employerData.description || '',
        website: employerData.website || '',
        industry: employerData.industry || '',
        size: employerData.size || '',
        contact_email: employerData.contact_email || '',
        phone_number: employerData.phone_number || '',
        address: employerData.address || '',
        city: employerData.city || '',
        state: employerData.state || '',
        country: employerData.country || '',
        postal_code: employerData.postal_code || '',
        is_active: employerData.is_active,
        verification_notes: employerData.verification_notes || '',
      });
      setLoadingEmployer(false);
      return;
    }

    // Fallback: fetch from API if not in store
    const fetchEmployer = async () => {
      if (!employerId) return;

      try {
        setLoadingEmployer(true);
        const employerData = await adminEmployerService.getEmployerById(
          employerId
        );
        setEmployer(employerData);
        setFormData({
          name: employerData.name,
          description: employerData.description || '',
          website: employerData.website || '',
          industry: employerData.industry || '',
          size: employerData.size || '',
          contact_email: employerData.contact_email || '',
          phone_number: employerData.phone_number || '',
          address: employerData.address || '',
          city: employerData.city || '',
          state: employerData.state || '',
          country: employerData.country || '',
          postal_code: employerData.postal_code || '',
          is_active: employerData.is_active,
          verification_notes: employerData.verification_notes || '',
        });
      } catch (err) {
        console.error('Error fetching employer:', err);
        setError('Failed to load employer. Please try again.');
      } finally {
        setLoadingEmployer(false);
      }
    };

    fetchEmployer();
  }, [employerId, state.selectedEmployer]);

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

    if (!formData.name) {
      setError('Please fill in all required fields');
      return;
    }

    if (!employerId) {
      setError('Employer ID is missing');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updateData: UpdateEmployerData = {
        name: formData.name,
        description: formData.description || undefined,
        website: formData.website || undefined,
        industry: formData.industry || undefined,
        size: formData.size || undefined,
        contact_email: formData.contact_email || undefined,
        phone_number: formData.phone_number || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        country: formData.country || undefined,
        postal_code: formData.postal_code || undefined,
        is_active: formData.is_active,
        verification_notes: formData.verification_notes || undefined,
      };

      await adminEmployerService.updateEmployer(employerId, updateData);
      navigate('/admin/employers');
    } catch (err) {
      console.error('Error updating employer:', err);
      setError('Failed to update employer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/admin/employers');
  };

  if (loadingEmployer) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Employer not found</p>
        <Button onClick={handleBack} variant="primary">
          Back to Employers
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
          <h1 className="text-3xl font-bold text-gray-900">Edit Employer</h1>
        </div>
        <p className="text-gray-600">
          Editing: {employer.name} (Owner: {employer.owner_name})
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          {/* Company Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Company Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Company Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label
                  htmlFor="website"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="industry"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Industry
                </label>
                <input
                  type="text"
                  id="industry"
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="size"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Company Size
                </label>
                <select
                  id="size"
                  name="size"
                  value={formData.size}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501-1000">501-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="contact_email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Contact Email
                </label>
                <input
                  type="email"
                  id="contact_email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            </div>
          </div>

          {/* Address Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Address Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="state"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="country"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Country
                </label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="postal_code"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Postal Code
                </label>
                <input
                  type="text"
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code}
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
          </div>

          {/* Admin Notes */}
          <div className="mb-6">
            <label
              htmlFor="verification_notes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Verification Notes
            </label>
            <textarea
              id="verification_notes"
              name="verification_notes"
              value={formData.verification_notes}
              onChange={handleInputChange}
              rows={4}
              placeholder="Add any admin notes about this employer..."
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
              {loading ? 'Updating...' : 'Update Employer'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminEmployerEditScreen;
