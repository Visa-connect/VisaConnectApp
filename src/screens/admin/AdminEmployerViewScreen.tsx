import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeAltIcon,
  CalendarIcon,
  ShieldCheckIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import Button from '../../components/Button';
import {
  adminEmployerService,
  AdminEmployer,
} from '../../api/adminEmployerService';
import { useAdminStore } from '../../stores/adminStore';

const AdminEmployerViewScreen: React.FC = () => {
  const navigate = useNavigate();
  const { employerId } = useParams<{ employerId: string }>();
  const { state } = useAdminStore();
  const [employer, setEmployer] = useState<AdminEmployer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // First try to get the employer from the admin store
    if (state.selectedEmployer) {
      setEmployer(state.selectedEmployer);
      setLoading(false);
      return;
    }

    // Fallback: fetch from API if not in store
    const fetchEmployer = async () => {
      if (!employerId) return;

      try {
        setLoading(true);
        setError(null);
        const employerData = await adminEmployerService.getEmployerById(
          employerId
        );
        console.log('Fetched employer data from API:', employerData);
        setEmployer(employerData);
      } catch (err) {
        console.error('Error fetching employer:', err);
        setError('Failed to load employer. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployer();
  }, [employerId, state.selectedEmployer]);

  const handleBack = () => {
    navigate('/admin/employers');
  };

  const handleEdit = () => {
    if (employer?.id) {
      navigate(`/admin/employers/edit/${employer.id}`);
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

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
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
          Back to Employers
        </button>
      </div>
    );
  }

  if (!employer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Employer not found</p>
        <button
          onClick={handleBack}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Back to Employers
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
            Back to Employers
          </button>

          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                employer.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {employer.is_active ? 'Active' : 'Inactive'}
            </span>

            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getVerificationStatusColor(
                employer.verification_status
              )}`}
            >
              {employer.verification_status.charAt(0).toUpperCase() +
                employer.verification_status.slice(1)}
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

      {/* Employer Content */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* Company Header */}
        <div className="px-6 py-6 border-b border-gray-200">
          <div className="flex items-center">
            <img
              className="h-20 w-20 rounded-lg object-cover"
              src={
                employer.logo_url ||
                'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop&crop=center'
              }
              alt={`${employer.name} logo`}
            />
            <div className="ml-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {employer.name}
              </h1>
              {employer.industry && (
                <p className="text-gray-600 flex items-center mt-1">
                  <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                  {employer.industry}
                </p>
              )}
              {employer.website && (
                <p className="text-gray-600 flex items-center mt-1">
                  <GlobeAltIcon className="h-4 w-4 mr-2" />
                  <a
                    href={employer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {employer.website}
                  </a>
                </p>
              )}
              <div className="flex items-center mt-2 space-x-4">
                <span className="text-sm text-gray-500 flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Joined {formatDate(employer.created_at)}
                </span>
                {employer.verified_at && (
                  <span className="text-sm text-green-600 flex items-center">
                    <ShieldCheckIcon className="h-4 w-4 mr-1" />
                    Verified {formatDate(employer.verified_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Company Details */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                Company Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Company Name
                  </label>
                  <p className="text-gray-900">{employer.name}</p>
                </div>
                {employer.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Description
                    </label>
                    <p className="text-gray-900">{employer.description}</p>
                  </div>
                )}
                {employer.industry && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Industry
                    </label>
                    <p className="text-gray-900">{employer.industry}</p>
                  </div>
                )}
                {employer.size && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Company Size
                    </label>
                    <p className="text-gray-900">{employer.size}</p>
                  </div>
                )}
                {employer.website && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Website
                    </label>
                    <p className="text-gray-900">
                      <a
                        href={employer.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {employer.website}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <UserIcon className="h-5 w-5 mr-2" />
                Contact Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Owner Name
                  </label>
                  <p className="text-gray-900">{employer.owner_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Owner Email
                  </label>
                  <p className="text-gray-900 flex items-center">
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    {employer.owner_email}
                  </p>
                </div>
                {employer.contact_email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Contact Email
                    </label>
                    <p className="text-gray-900 flex items-center">
                      <EnvelopeIcon className="h-4 w-4 mr-2" />
                      {employer.contact_email}
                    </p>
                  </div>
                )}
                {employer.phone_number && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Phone Number
                    </label>
                    <p className="text-gray-900 flex items-center">
                      <PhoneIcon className="h-4 w-4 mr-2" />
                      {employer.phone_number}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          {(employer.address ||
            employer.city ||
            employer.state ||
            employer.country) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2" />
                Address Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {employer.address && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Address
                    </label>
                    <p className="text-gray-900">{employer.address}</p>
                  </div>
                )}
                {employer.city && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      City
                    </label>
                    <p className="text-gray-900">{employer.city}</p>
                  </div>
                )}
                {employer.state && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      State
                    </label>
                    <p className="text-gray-900">{employer.state}</p>
                  </div>
                )}
                {employer.country && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Country
                    </label>
                    <p className="text-gray-900">{employer.country}</p>
                  </div>
                )}
                {employer.postal_code && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Postal Code
                    </label>
                    <p className="text-gray-900">{employer.postal_code}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Verification Status */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ShieldCheckIcon className="h-5 w-5 mr-2" />
              Verification Status
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  Status
                </span>
                <span
                  className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getVerificationStatusColor(
                    employer.verification_status
                  )}`}
                >
                  {employer.verification_status.charAt(0).toUpperCase() +
                    employer.verification_status.slice(1)}
                </span>
              </div>
              {employer.verification_notes && (
                <div className="mt-2">
                  <label className="text-sm font-medium text-gray-500">
                    Verification Notes
                  </label>
                  <p className="text-gray-700 mt-1">
                    {employer.verification_notes}
                  </p>
                </div>
              )}
              {employer.rejection_reason && (
                <div className="mt-2">
                  <label className="text-sm font-medium text-gray-500">
                    Rejection Reason
                  </label>
                  <p className="text-red-700 mt-1">
                    {employer.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Account Information */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p>
                  <span className="font-medium">Business ID:</span>{' '}
                  {employer.id}
                </p>
                <p>
                  <span className="font-medium">Owner ID:</span>{' '}
                  {employer.owner_id}
                </p>
              </div>
              <div>
                <p>
                  <span className="font-medium">Created:</span>{' '}
                  {formatDateTime(employer.created_at)}
                </p>
                {employer.updated_at && (
                  <p>
                    <span className="font-medium">Last Updated:</span>{' '}
                    {formatDateTime(employer.updated_at)}
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

export default AdminEmployerViewScreen;
