import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import Button from '../components/Button';
import DrawerMenu from '../components/DrawerMenu';
import {
  ApplicationsApiService,
  JobApplicationWithDetails,
} from '../api/applicationsApi';
import { formatDate } from '../utils/time';
import { JobsApiService, JobWithBusiness } from '../api/jobsApi';

const JobApplicationsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [job, setJob] = useState<JobWithBusiness | null>(null);
  const [applications, setApplications] = useState<JobApplicationWithDetails[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleOverlayClick = () => {
    setIsDrawerOpen(false);
  };

  const handleBack = () => {
    navigate('/jobs-posted');
  };

  const handleViewJob = () => {
    if (job) {
      navigate(`/job/${job.id}`);
    }
  };

  // Fetch job details and applications
  useEffect(() => {
    const fetchData = async () => {
      if (!jobId) {
        setError('Invalid job ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch job details and applications in parallel
        const [jobResponse, applicationsResponse] = await Promise.all([
          JobsApiService.getJobById(parseInt(jobId)),
          ApplicationsApiService.getJobApplications(parseInt(jobId), {
            limit: 100,
            order_by: 'created_at',
            order_direction: 'DESC',
          }),
        ]);

        if (jobResponse.success) {
          setJob(jobResponse.data);
        } else {
          setError('Failed to load job details');
          return;
        }

        if (applicationsResponse.success) {
          setApplications(applicationsResponse.data);
        } else {
          setError('Failed to load applications');
          return;
        }
      } catch (err) {
        console.error('Error fetching job applications:', err);
        setError('Failed to load job applications. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      case 'reviewed':
        return <ClockIcon className="w-5 h-5 text-blue-600" />;
      case 'pending':
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'reviewed':
        return 'Under Review';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DrawerMenu
          open={isDrawerOpen}
          onClose={handleOverlayClick}
          navigate={navigate}
          highlight={undefined}
        />

        {/* Header */}
        <div className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-center relative">
              <button
                onClick={handleBack}
                className="absolute left-0 p-2 -ml-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </button>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900">
                Job Applications
              </h1>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Loading applications...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DrawerMenu
          open={isDrawerOpen}
          onClose={handleOverlayClick}
          navigate={navigate}
          highlight={undefined}
        />

        {/* Header */}
        <div className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-center relative">
              <button
                onClick={handleBack}
                className="absolute left-0 p-2 -ml-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </button>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900">
                Job Applications
              </h1>
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="primary">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DrawerMenu
        open={isDrawerOpen}
        onClose={handleOverlayClick}
        navigate={navigate}
        highlight={undefined}
      />

      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-center relative">
            <button
              onClick={handleBack}
              className="absolute left-0 p-2 -ml-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <h1 className="text-lg md:text-2xl font-bold text-gray-900">
              Job Applications
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        {/* Job Details Header */}
        {job && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {job.title}
                </h2>
                <p className="text-gray-600 mb-2">{job.business_name}</p>

                <div className="flex items-center text-sm text-gray-500 space-x-4 mb-3">
                  <div className="flex items-center">
                    <MapPinIcon className="w-4 h-4 mr-1" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    <span>
                      Posted{' '}
                      {new Date(job.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="ml-4">
                <Button
                  onClick={handleViewJob}
                  variant="secondary"
                  className="text-sm px-4 py-2"
                >
                  View Job
                </Button>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-gray-700 text-sm">{job.description}</p>
            </div>
          </div>
        )}

        {/* Applications Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {applications.length} application
            {applications.length !== 1 ? 's' : ''} received
          </p>
        </div>

        {/* Applications List */}
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <BriefcaseIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Applications Yet
            </h3>
            <p className="text-gray-600">
              No one has applied to this job yet. Share your job posting to
              attract candidates!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <div
                key={application.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <UserIcon className="w-5 h-5 text-gray-400 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {application.user_first_name &&
                        application.user_last_name
                          ? `${application.user_first_name} ${application.user_last_name}`
                          : 'Anonymous Applicant'}
                      </h3>
                    </div>

                    {application.user_email && (
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <EnvelopeIcon className="w-4 h-4 mr-1" />
                        <span>{application.user_email}</span>
                      </div>
                    )}

                    <div className="flex items-center text-sm text-gray-500">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      <span>
                        Applied{' '}
                        {formatDate(application.created_at, {
                          includeTime: true,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col items-end">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(application.status)}
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          application.status
                        )}`}
                      >
                        {getStatusText(application.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">
                        Qualifications:
                      </span>
                      <p className="text-gray-600 mt-1">
                        {application.qualifications}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Available Start Date:
                      </span>
                      <p className="text-gray-600 mt-1">
                        {application.start_date}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Location:
                      </span>
                      <p className="text-gray-600 mt-1">
                        {application.location}
                      </p>
                    </div>
                    {application.visa_type && (
                      <div>
                        <span className="font-medium text-gray-700">
                          Visa Status:
                        </span>
                        <p className="text-gray-600 mt-1">
                          {application.visa_type}
                        </p>
                      </div>
                    )}
                  </div>

                  {application.resume_filename && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center text-sm">
                        <DocumentTextIcon className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-700">
                          Resume:
                        </span>
                        <span className="text-gray-600 ml-2">
                          {application.resume_filename}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobApplicationsScreen;
