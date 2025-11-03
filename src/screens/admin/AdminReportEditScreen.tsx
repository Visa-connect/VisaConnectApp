import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, FlagIcon } from '@heroicons/react/24/outline';
import Button from '../../components/Button';
import {
  reportService,
  Report,
  ReportTargetDetails,
} from '../../api/reportService';
import { useAdminStore } from '../../stores/adminStore';
import ReportTargetModal from '../../components/admin/ReportTargetModal';

const AdminReportEditScreen: React.FC = () => {
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId: string }>();
  const { state } = useAdminStore();
  const [loading, setLoading] = useState(false);
  const [loadingReport, setLoadingReport] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [formData, setFormData] = useState({
    status: 'pending' as 'pending' | 'resolved' | 'removed',
    notes: '',
  });
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetDetails, setTargetDetails] =
    useState<ReportTargetDetails | null>(null);

  useEffect(() => {
    // First try to get the report from the admin store
    if (state.selectedReport) {
      const reportData = state.selectedReport;
      setReport(reportData);
      setFormData({
        status: reportData.status,
        notes: '',
      });
      setLoadingReport(false);
      return;
    }

    // Fallback: fetch from API if not in store
    const fetchReport = async () => {
      if (!reportId) return;

      try {
        setLoadingReport(true);
        const reportData = await reportService.getAdminReport(reportId);
        setReport(reportData);
        setFormData({
          status: reportData.status,
          notes: '',
        });
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Failed to load report. Please try again.');
      } finally {
        setLoadingReport(false);
      }
    };

    fetchReport();
  }, [reportId, state.selectedReport]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!report) {
      setError('Report not found');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the appropriate API method based on status change
      if (formData.status === 'resolved') {
        await reportService.resolveReport(report.report_id, {
          notes: formData.notes || undefined,
        });
      } else if (formData.status === 'removed') {
        await reportService.removeReport(report.report_id, {
          notes: formData.notes || undefined,
        });
      } else {
        // For pending status, we can't directly update via API
        // This would require a different endpoint or we skip this case
        setError('Cannot change status back to pending');
        return;
      }

      navigate('/admin/reports');
    } catch (err) {
      console.error('Error updating report:', err);
      setError('Failed to update report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/admin/reports');
  };

  const openTargetModal = async () => {
    if (!report) return;
    try {
      const data = await reportService.getReportTargetDetails(report.report_id);
      setTargetDetails(data);
      setIsTargetModalOpen(true);
    } catch (error) {
      console.error('Failed to load target details', error);
    }
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

  if (loadingReport) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Report not found</p>
        <Button onClick={handleBack} variant="primary">
          Back to Reports
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
          <h1 className="text-3xl font-bold text-gray-900">Moderate Report</h1>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          {/* Report Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <FlagIcon className="h-5 w-5 mr-2" />
                Report Information
              </div>
              <button
                onClick={openTargetModal}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {report.target_type === 'job' ? 'View job' : 'View meetup'}
              </button>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Report ID
                </label>
                <p className="text-gray-900 font-mono text-sm mt-1">
                  {report.report_id}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Target Type
                </label>
                <p className="text-gray-900 capitalize mt-1">
                  {report.target_type}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Reporter ID
                </label>
                <p className="text-gray-900 font-mono text-sm mt-1">
                  {report.reporter_id}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Created At
                </label>
                <p className="text-gray-900 text-sm mt-1">
                  {formatDateTime(report.created_at)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Current Status
                </label>
                <p className="text-gray-900 capitalize mt-1">{report.status}</p>
              </div>
            </div>
          </div>

          {/* Report Reason */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Report Reason
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {report.reason}
              </p>
            </div>
          </div>

          {/* Moderation Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Moderation Action
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Action to Take *
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="pending">Keep Pending</option>
                  <option value="resolved">Resolve (Keep Post)</option>
                  <option value="removed">Remove Post</option>
                </select>
                <div className="mt-2 text-sm text-gray-600">
                  <p>
                    <strong>Resolve:</strong> Mark report as resolved, post
                    remains visible
                  </p>
                  <p>
                    <strong>Remove:</strong> Mark report as resolved and remove
                    the reported post
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Admin Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any notes about your moderation decision..."
                />
              </div>
            </div>
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
              onClick={handleSubmit}
            >
              {loading ? 'Processing...' : 'Submit Action'}
            </Button>
          </div>
        </div>
      </div>

      {/* Target Modal */}
      {isTargetModalOpen && (
        <ReportTargetModal
          isOpen={isTargetModalOpen}
          onClose={() => setIsTargetModalOpen(false)}
          data={targetDetails}
        />
      )}
    </div>
  );
};

export default AdminReportEditScreen;
