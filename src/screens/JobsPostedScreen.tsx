import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  MapPinIcon,
  CalendarIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import Button from '../components/Button';
import DrawerMenu from '../components/DrawerMenu';
import { JobsApiService, JobWithBusiness } from '../api/jobsApi';
import { formatDate } from '../utils/time';
import { ApplicationsApiService } from '../api/applicationsApi';
import { BusinessApiService } from '../api/businessApi';

const JobsPostedScreen: React.FC = () => {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [jobs, setJobs] = useState<JobWithBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicationCounts, setApplicationCounts] = useState<
    Record<number, number>
  >({});

  const handleOverlayClick = () => {
    setIsDrawerOpen(false);
  };

  const handleBack = () => {
    navigate('/settings');
  };

  // Fetch business owner's jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, get user's businesses
        const businessesResponse = await BusinessApiService.getUserBusinesses();

        if (
          !businessesResponse.success ||
          !businessesResponse.data ||
          businessesResponse.data.length === 0
        ) {
          setJobs([]);
          setApplicationCounts({});
          setLoading(false);
          return;
        }

        // Get all jobs for user's businesses
        const allJobs: JobWithBusiness[] = [];
        const counts: Record<number, number> = {};

        for (const business of businessesResponse.data) {
          try {
            const jobsResponse = await JobsApiService.getJobsByBusiness(
              business.id,
              {
                limit: 50,
                order_by: 'created_at',
                order_direction: 'DESC',
              }
            );

            if (jobsResponse.success) {
              allJobs.push(...jobsResponse.data);

              // Fetch application counts for each job
              for (const job of jobsResponse.data) {
                try {
                  const appResponse =
                    await ApplicationsApiService.getJobApplications(job.id, {
                      limit: 1,
                    });
                  counts[job.id] = appResponse.pagination.total;
                } catch (err) {
                  console.error(
                    `Error fetching applications for job ${job.id}:`,
                    err
                  );
                  counts[job.id] = 0;
                }
              }
            }
          } catch (err) {
            console.error(
              `Error fetching jobs for business ${business.id}:`,
              err
            );
          }
        }

        // Sort all jobs by created_at (newest first)
        allJobs.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setJobs(allJobs);
        setApplicationCounts(counts);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load jobs. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatSalary = (job: JobWithBusiness) => {
    if (job.rate_from && job.rate_to) {
      return `$${job.rate_from}-$${job.rate_to} per ${
        job.job_type === 'hourly' ? 'hour' : 'project'
      }`;
    } else if (job.rate_from) {
      return `$${job.rate_from}+ per ${
        job.job_type === 'hourly' ? 'hour' : 'project'
      }`;
    }
    return 'Salary not specified';
  };

  const handleViewApplications = (jobId: number) => {
    navigate(`/job-applications/${jobId}`);
  };

  const handleEditJob = (jobId: number) => {
    navigate(`/post-job?edit=${jobId}`);
  };

  const handleViewJob = (jobId: number) => {
    navigate(`/job/${jobId}`);
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
                Jobs Posted
              </h1>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Loading your job postings...</p>
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
                Jobs Posted
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
              Jobs Posted
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <BriefcaseIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Jobs Posted Yet
            </h3>
            <p className="text-gray-600 mb-6">
              You haven't posted any jobs yet. First, add a business to your
              profile, then create your first job posting to start attracting
              talent!
            </p>
            <Button
              onClick={() => navigate('/post-job')}
              variant="primary"
              className="inline-flex"
            >
              Post a Job
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <p className="text-gray-600 mb-4">
                You have posted {jobs.length} job{jobs.length !== 1 ? 's' : ''}
              </p>
              <Button
                onClick={() => navigate('/post-job')}
                variant="primary"
                className="text-sm px-4 py-2 flex items-center"
                size="sm"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Post New Job
              </Button>
            </div>

            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {job.title}
                    </h3>
                    <p className="text-gray-600 mb-2">{job.business_name}</p>

                    <div className="flex items-center text-sm text-gray-500 space-x-4 mb-3">
                      <div className="flex items-center">
                        <MapPinIcon className="w-4 h-4 mr-1" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-1" />
                        <span>Posted {formatDate(job.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-600">
                        <strong>Pay:</strong> {formatSalary(job)}
                      </span>
                      <span className="text-gray-600">
                        <strong>Type:</strong> {job.job_type}
                      </span>
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col items-end space-y-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        job.status
                      )}`}
                    >
                      {job.status}
                    </span>
                    <span className="text-sm text-gray-600">
                      {applicationCounts[job.id] || 0} application
                      {(applicationCounts[job.id] || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => handleViewJob(job.id)}
                      variant="secondary"
                      className="flex items-center text-sm"
                      size="sm"
                    >
                      <EyeIcon className="w-4 h-4 mr-1" />
                      View Job
                    </Button>
                    <Button
                      onClick={() => handleViewApplications(job.id)}
                      variant="secondary"
                      className="flex items-center text-sm"
                      size="sm"
                    >
                      <BriefcaseIcon className="w-4 h-4 mr-1" />
                      View Applications ({applicationCounts[job.id] || 0})
                    </Button>
                    <Button
                      onClick={() => handleEditJob(job.id)}
                      variant="secondary"
                      className="flex items-center text-sm"
                      size="sm"
                    >
                      <PencilIcon className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsPostedScreen;
