import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../../stores/adminStore';
import { useAdminReports } from '../../hooks/useAdminReports';
import { PaginationControls } from '../../components/admin/PaginationControls';
import { ReportModerationModal } from '../../components/admin/ReportModerationModal';
import { SearchReportsParams } from '../../api/reportService';

const ReportsListScreen: React.FC = () => {
  const navigate = useNavigate();
  const { dispatch } = useAdminStore();
  const {
    reports,
    loading,
    error,
    updateReportStatus,
    refreshData,
    currentPage,
    totalPages,
    totalReports,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    searchReports,
  } = useAdminReports();

  // Filter state
  const [filters, setFilters] = useState<SearchReportsParams>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [moderationAction, setModerationAction] = useState<
    'resolve' | 'remove' | null
  >(null);

  // Fetch reports on component mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleView = (reportId: string) => {
    const report = reports.find((r) => r.report_id === reportId);
    if (report) {
      dispatch({ type: 'SET_SELECTED_REPORT', payload: report });
    }
    navigate(`/admin/reports/${reportId}`);
  };

  const handleModerationConfirm = async (notes?: string) => {
    if (!selectedReport || !moderationAction) return;

    try {
      await updateReportStatus(
        selectedReport.report_id,
        moderationAction,
        notes
      );
      setShowModerationModal(false);
      setSelectedReport(null);
      setModerationAction(null);
    } catch (error) {
      console.error('Failed to moderate report:', error);
    }
  };

  const handleFilterChange = (newFilters: Partial<SearchReportsParams>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    searchReports(updatedFilters);
  };

  const handleSearch = () => {
    const searchFilters = {
      ...filters,
      search: searchTerm.trim() || undefined,
    };
    setFilters(searchFilters);
    searchReports(searchFilters);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    searchReports({});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'removed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTargetTypeColor = (targetType: string) => {
    switch (targetType) {
      case 'job':
        return 'bg-blue-100 text-blue-800';
      case 'meetup':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && reports.length === 0) {
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
          onClick={refreshData}
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
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Report ID or reason..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) =>
                handleFilterChange({
                  status: (e.target.value as any) || undefined,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="removed">Removed</option>
            </select>
          </div>

          {/* Target Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Type
            </label>
            <select
              value={filters.target_type || ''}
              onChange={(e) =>
                handleFilterChange({
                  target_type: (e.target.value as any) || undefined,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="job">Jobs</option>
              <option value="meetup">Meetups</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end space-x-2">
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Search
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Report
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reporter
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No reports found.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr
                  key={report.report_id}
                  className={'cursor-pointer hover:bg-green-50'}
                  onClick={() => handleView(report.report_id)}
                  title={'Click to view post'}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {report.report_id.substring(0, 8)}...
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTargetTypeColor(
                          report.target_type
                        )}`}
                      >
                        {report.target_type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        report.status
                      )}`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {report.reporter_id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(report.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalReports}
          pageSize={pageSize}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          onPageChange={goToPage}
          onNextPage={nextPage}
          onPreviousPage={previousPage}
          loading={loading}
        />
      </div>

      {/* Moderation Modal */}
      <ReportModerationModal
        isOpen={showModerationModal}
        onClose={() => {
          setShowModerationModal(false);
          setSelectedReport(null);
          setModerationAction(null);
        }}
        onConfirm={handleModerationConfirm}
        report={selectedReport}
        action={moderationAction}
      />
    </div>
  );
};

export default ReportsListScreen;
