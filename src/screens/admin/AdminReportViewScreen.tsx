import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  FlagIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import Button from '../../components/Button';
import { reportService, Report } from '../../api/reportService';
import { useAdminStore } from '../../stores/adminStore';
import { ReportModerationModal } from '../../components/admin/ReportModerationModal';

const AdminReportViewScreen: React.FC = () => {
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId: string }>();
  const { state } = useAdminStore();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    // First try to get the report from the admin store
    if (state.selectedReport && !hasFetched.current) {
      setReport(state.selectedReport);
      setLoading(false);
      hasFetched.current = true;
      return;
    }

    // Fallback: fetch from API if not in store and not already fetched
    if (!hasFetched.current) {
      const fetchReport = async () => {
        if (!reportId) return;

        try {
          setLoading(true);
          setError(null);
          const reportData = await reportService.getAdminReport(reportId);
          console.log('Fetched report data from API:', reportData);
          setReport(reportData);
          hasFetched.current = true;
        } catch (err) {
          console.error('Error fetching report:', err);
          setError('Failed to load report. Please try again.');
        } finally {
          setLoading(false);
        }
      };

      fetchReport();
    }
  }, [reportId, state.selectedReport]);

  const handleBack = () => {
    navigate('/admin/reports');
  };

  const handleModerate = () => {
    setIsModerationModalOpen(true);
  };

  const handleModerationComplete = () => {
    setIsModerationModalOpen(false);
    // Refresh the report data
    if (reportId) {
      reportService
        .getAdminReport(reportId)
        .then(setReport)
        .catch(console.error);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'resolved':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'removed':
        return <XCircleIcon className="h-5 w-5" />;
      default:
        return <FlagIcon className="h-5 w-5" />;
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
          Back to Reports
        </button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Report not found</p>
        <button
          onClick={handleBack}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Back to Reports
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
            Back to Reports
          </button>

          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                report.status
              )}`}
            >
              {getStatusIcon(report.status)}
              <span className="ml-1 capitalize">{report.status}</span>
            </span>

            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getTargetTypeColor(
                report.target_type
              )}`}
            >
              {report.target_type.charAt(0).toUpperCase() +
                report.target_type.slice(1)}
            </span>

            {report.status === 'pending' && (
              <Button
                onClick={handleModerate}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                <FlagIcon className="h-4 w-4 mr-2" />
                Moderate
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* Report Header */}
        <div className="px-6 py-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full">
              <FlagIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Report #{report.report_id.slice(-8)}
              </h1>
              <p className="text-gray-600 flex items-center mt-1">
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                {report.target_type.charAt(0).toUpperCase() +
                  report.target_type.slice(1)}{' '}
                Report
              </p>
              <div className="flex items-center mt-2 space-x-4">
                <span className="text-sm text-gray-500 flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Created {formatDate(report.created_at)}
                </span>
                {report.updated_at !== report.created_at && (
                  <span className="text-sm text-gray-500 flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Updated {formatDateTime(report.updated_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Report Details */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FlagIcon className="h-5 w-5 mr-2" />
                Report Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Report ID
                  </label>
                  <p className="text-gray-900 font-mono text-sm">
                    {report.report_id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Status
                  </label>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        report.status
                      )}`}
                    >
                      {getStatusIcon(report.status)}
                      <span className="ml-1 capitalize">{report.status}</span>
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Target Type
                  </label>
                  <div className="mt-1">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getTargetTypeColor(
                        report.target_type
                      )}`}
                    >
                      {report.target_type.charAt(0).toUpperCase() +
                        report.target_type.slice(1)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Target ID
                  </label>
                  <p className="text-gray-900 font-mono text-sm">
                    {report.target_id}
                  </p>
                </div>
              </div>
            </div>

            {/* Reporter Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <UserIcon className="h-5 w-5 mr-2" />
                Reporter Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Reporter ID
                  </label>
                  <p className="text-gray-900 font-mono text-sm">
                    {report.reporter_id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Created At
                  </label>
                  <p className="text-gray-900">
                    {formatDateTime(report.created_at)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Last Updated
                  </label>
                  <p className="text-gray-900">
                    {formatDateTime(report.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Report Reason */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Report Reason
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {report.reason}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Moderation Modal */}
      {isModerationModalOpen && report && (
        <ReportModerationModal
          report={report}
          isOpen={isModerationModalOpen}
          onClose={() => setIsModerationModalOpen(false)}
          onConfirm={handleModerationComplete}
          action={null}
        />
      )}
    </div>
  );
};

export default AdminReportViewScreen;
