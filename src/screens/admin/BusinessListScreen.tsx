import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { BusinessApiService, Business } from '../../api/businessApi';
import { useAdminBusinesses } from '../../hooks/useAdminBusinesses';

type BusinessFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface Tab {
  key: BusinessFilter;
  label: string;
  count: number;
}

const BusinessListScreen: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<BusinessFilter>('all');

  // Use admin store for business data
  const {
    businesses,
    businessCounts,
    loading,
    error,
    fetchBusinesses,
    refreshData,
  } = useAdminBusinesses();

  // Filter businesses based on current filter
  const filteredBusinesses = businesses.filter(
    (business: Business) => filter === 'all' || business.status === filter
  );

  // Refresh data when filter changes
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleView = (businessId: number) => {
    navigate(`/admin/businesses/${businessId}`);
  };

  const handleApprove = async (businessId: number) => {
    if (window.confirm('Are you sure you want to approve this business?')) {
      try {
        const response = await BusinessApiService.updateBusinessStatus(
          businessId,
          'approved'
        );
        if (response.success) {
          await fetchBusinesses(); // Refresh the list
        } else {
          alert('Failed to approve business. Please try again.');
        }
      } catch (err) {
        console.error('Error approving business:', err);
        alert('Failed to approve business. Please try again.');
      }
    }
  };

  const handleReject = async (businessId: number) => {
    const adminNotes = window.prompt('Please provide a reason for rejection:');
    if (adminNotes !== null) {
      try {
        const response = await BusinessApiService.updateBusinessStatus(
          businessId,
          'rejected',
          adminNotes
        );
        if (response.success) {
          await fetchBusinesses(); // Refresh the list
        } else {
          alert('Failed to reject business. Please try again.');
        }
      } catch (err) {
        console.error('Error rejecting business:', err);
        alert('Failed to reject business. Please try again.');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
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

  // Use filtered businesses for display
  const displayBusinesses = filteredBusinesses;

  // Define tabs with proper typing
  const tabs: Tab[] = [
    { key: 'all', label: 'All', count: businessCounts.all },
    { key: 'pending', label: 'Pending', count: businessCounts.pending },
    { key: 'approved', label: 'Approved', count: businessCounts.approved },
    { key: 'rejected', label: 'Rejected', count: businessCounts.rejected },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Business Verifications
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Review and manage business submissions
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Business List */}
      {filteredBusinesses.length === 0 ? (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No businesses found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all'
              ? 'No businesses have been submitted yet.'
              : `No ${filter} businesses found.`}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {displayBusinesses.map((business: Business) => (
              <li key={business.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {business.logo_url ? (
                        <img
                          className="h-12 w-12 rounded-lg object-cover"
                          src={business.logo_url}
                          alt={`${business.name} logo`}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                          <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {business.name}
                        </p>
                        <div className="ml-2 flex items-center">
                          {getStatusIcon(business.status)}
                          <span
                            className={`ml-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              business.status
                            )}`}
                          >
                            {business.status.charAt(0).toUpperCase() +
                              business.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1">
                        <p className="text-sm text-gray-500">
                          Owner: {business.owner_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          Formed: {business.year_formed}
                        </p>
                        <p className="text-sm text-gray-500">
                          Submitted:{' '}
                          {new Date(business.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleView(business.id)}
                      className="text-gray-400 hover:text-gray-600"
                      title="View Details"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    {business.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(business.id)}
                          className="text-green-400 hover:text-green-600"
                          title="Approve"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleReject(business.id)}
                          className="text-red-400 hover:text-red-600"
                          title="Reject"
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BusinessListScreen;
