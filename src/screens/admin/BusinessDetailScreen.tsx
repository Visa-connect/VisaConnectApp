import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  UserIcon,
  MapPinIcon,
  GlobeAltIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { BusinessApiService, Business } from '../../api/businessApi';

const BusinessDetailScreen: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);
        const response = await BusinessApiService.getBusinessByIdAdmin(
          parseInt(id)
        );
        if (response.success && response.data) {
          setBusiness(response.data);
          setAdminNotes(response.data.admin_notes || '');
        } else {
          setError(response.message || 'Failed to load business details');
        }
      } catch (err) {
        console.error('Error fetching business:', err);
        setError('Failed to load business details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [id]);

  const handleApprove = async () => {
    if (!business) return;

    try {
      setActionLoading(true);
      const response = await BusinessApiService.updateBusinessStatus(
        business.id,
        'approved',
        adminNotes || undefined
      );
      if (response.success) {
        setBusiness({
          ...business,
          status: 'approved',
          admin_notes: adminNotes,
        });
        alert('Business approved successfully!');
      } else {
        alert('Failed to approve business. Please try again.');
      }
    } catch (err) {
      console.error('Error approving business:', err);
      alert('Failed to approve business. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!business) return;

    if (!adminNotes.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    try {
      setActionLoading(true);
      const response = await BusinessApiService.updateBusinessStatus(
        business.id,
        'rejected',
        adminNotes
      );
      if (response.success) {
        setBusiness({
          ...business,
          status: 'rejected',
          admin_notes: adminNotes,
        });
        alert('Business rejected successfully!');
      } else {
        alert('Failed to reject business. Please try again.');
      }
    } catch (err) {
      console.error('Error rejecting business:', err);
      alert('Failed to reject business. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <div className="h-3 w-3 rounded-full bg-yellow-400" />;
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-3 w-3 rounded-full bg-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
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

  if (error || !business) {
    return (
      <div className="text-center py-12">
        <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Business not found
        </h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/admin/businesses')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Business List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/admin/businesses')}
              className="mr-4 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <div>
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                {business.name}
              </h2>
              <div className="mt-1 flex items-center">
                {getStatusIcon(business.status)}
                <span
                  className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                    business.status
                  )}`}
                >
                  {business.status.charAt(0).toUpperCase() +
                    business.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Logo and Basic Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-start space-x-4">
              {business.logo_url ? (
                <img
                  className="h-20 w-20 rounded-lg object-cover"
                  src={business.logo_url}
                  alt={`${business.name} logo`}
                />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-gray-200 flex items-center justify-center">
                  <BuildingOfficeIcon className="h-10 w-10 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {business.name}
                </h3>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center text-sm text-gray-500">
                    <UserIcon className="h-4 w-4 mr-2" />
                    {business.owner_name}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Formed in {business.year_formed}
                  </div>
                  {business.website && (
                    <div className="flex items-center text-sm text-gray-500">
                      <GlobeAltIcon className="h-4 w-4 mr-2" />
                      <a
                        href={business.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {business.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          {business.address && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Address
              </h3>
              <div className="flex items-start">
                <MapPinIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <p className="text-sm text-gray-700">{business.address}</p>
              </div>
            </div>
          )}

          {/* Mission Statement */}
          {business.mission_statement && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Mission Statement
              </h3>
              <div className="flex items-start">
                <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <p className="text-sm text-gray-700">
                  {business.mission_statement}
                </p>
              </div>
            </div>
          )}

          {/* Submission Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Submission Details
            </h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Submitted</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(business.submitted_at).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Last Updated
                </dt>
                <dd className="text-sm text-gray-900">
                  {new Date(business.updated_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="space-y-6">
          {/* Admin Notes */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Admin Notes
            </h3>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes about this business..."
            />
          </div>

          {/* Actions */}
          {business.status === 'pending' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  {actionLoading ? 'Processing...' : 'Approve Business'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircleIcon className="h-4 w-4 mr-2" />
                  {actionLoading ? 'Processing...' : 'Reject Business'}
                </button>
              </div>
            </div>
          )}

          {/* Current Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Current Status
            </h3>
            <div className="flex items-center">
              {getStatusIcon(business.status)}
              <span
                className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                  business.status
                )}`}
              >
                {business.status.charAt(0).toUpperCase() +
                  business.status.slice(1)}
              </span>
            </div>
            {business.admin_notes && (
              <div className="mt-3">
                <p className="text-sm text-gray-500">Previous admin notes:</p>
                <p className="text-sm text-gray-700 mt-1">
                  {business.admin_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessDetailScreen;
