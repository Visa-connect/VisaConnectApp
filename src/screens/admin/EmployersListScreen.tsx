import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAdminStore } from '../../stores/adminStore';
import { AdminEmployer } from '../../api/adminEmployerService';

const EmployersListScreen: React.FC = () => {
  const navigate = useNavigate();
  const { dispatch } = useAdminStore();
  const [employers, setEmployers] = useState<AdminEmployer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all');

  const fetchEmployers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the existing admin business API endpoint
      const response = await fetch('/api/business/admin/all', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch employers');
      }

      const data = await response.json();
      setEmployers(data.data || []);
    } catch (err) {
      console.error('Error fetching employers:', err);
      setError('Failed to load employers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployers();
  }, [fetchEmployers]);

  const handleView = (employerId: number | string) => {
    const employer = employers.find(
      (e) => e.id.toString() === employerId.toString()
    );
    if (employer) {
      dispatch({ type: 'SET_SELECTED_EMPLOYER', payload: employer });
    }
    navigate(`/admin/employers/${employerId}`);
  };

  const handleEdit = (employerId: number | string) => {
    const employer = employers.find(
      (e) => e.id.toString() === employerId.toString()
    );
    if (employer) {
      dispatch({ type: 'SET_SELECTED_EMPLOYER', payload: employer });
    }
    navigate(`/admin/employers/${employerId}/edit`);
  };

  const handleDelete = async (employerId: number | string) => {
    if (window.confirm('Are you sure you want to delete this employer?')) {
      try {
        // TODO: Implement delete employer API call
        console.log('Delete employer:', employerId);
        await fetchEmployers(); // Refresh the list
      } catch (err) {
        console.error('Error deleting employer:', err);
        alert('Failed to delete employer. Please try again.');
      }
    }
  };

  const getStatusColor = (status: string) => {
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

  const filteredEmployers = employers.filter(
    (employer) => filter === 'all' || employer.status === filter
  );

  const tabs = [
    { key: 'all' as const, label: 'All', count: employers.length },
    {
      key: 'pending' as const,
      label: 'Pending',
      count: employers.filter((e) => e.status === 'pending').length,
    },
    {
      key: 'approved' as const,
      label: 'Approved',
      count: employers.filter((e) => e.status === 'approved').length,
    },
    {
      key: 'rejected' as const,
      label: 'Rejected',
      count: employers.filter((e) => e.status === 'rejected').length,
    },
  ];

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
          onClick={fetchEmployers}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Employers</h1>
          <button
            onClick={() => navigate('/admin/employers/create')}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Create new employer
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 mb-6">
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

      {/* Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Business
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Year Formed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submitted
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEmployers.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No employers found.
                </td>
              </tr>
            ) : (
              filteredEmployers.map((employer) => (
                <tr key={employer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {employer.logo_url ? (
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          src={employer.logo_url}
                          alt={employer.name}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 font-semibold text-sm">
                            {employer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employer.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {employer.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {employer.owner_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employer.year_formed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employer.address || 'Not specified'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        employer.status
                      )}`}
                    >
                      {employer.status.charAt(0).toUpperCase() +
                        employer.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(employer.submitted_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(employer.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(employer.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(employer.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployersListScreen;
