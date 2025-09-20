import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import Button from '../components/Button';
import DrawerMenu from '../components/DrawerMenu';
import { JobsApiService, JobWithBusiness } from '../api/jobsApi';
import { BusinessApiService } from '../api/businessApi';
import { useUserStore } from '../stores/userStore';

const JobDetailsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();
  const { user } = useUserStore(); // Keep for future use
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [job, setJob] = useState<JobWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false); // Keep for future use
  const [userBusinesses, setUserBusinesses] = useState<number[]>([]);
  const [isJobOwner, setIsJobOwner] = useState(false);

  const handleOverlayClick = () => {
    setIsDrawerOpen(false);
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Fetch user's businesses to check ownership
  const fetchUserBusinesses = async () => {
    try {
      const response = await BusinessApiService.getUserBusinesses();
      if (response.success && response.data) {
        const businessIds = response.data.map((business) => business.id);
        setUserBusinesses(businessIds);
      }
    } catch (err) {
      console.error('Error fetching user businesses:', err);
    }
  };

  // Check if current user owns this job
  const checkJobOwnership = useCallback(() => {
    if (job && userBusinesses.length > 0) {
      setIsJobOwner(userBusinesses.includes(job.business_id));
    }
  }, [job, userBusinesses]);

  // Fetch job details and user businesses
  useEffect(() => {
    const fetchData = async () => {
      if (!jobId) {
        setError('Job ID not provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch job details and user businesses in parallel
        const [jobResponse] = await Promise.all([
          JobsApiService.getJobById(parseInt(jobId)),
          fetchUserBusinesses(),
        ]);

        if (jobResponse.success) {
          setJob(jobResponse.data);
        } else {
          setError('Failed to load job details. Please try again.');
        }
      } catch (err) {
        console.error('Error fetching job details:', err);
        setError('Failed to load job details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId]);

  // Check job ownership when job and user businesses are loaded
  useEffect(() => {
    checkJobOwnership();
  }, [checkJobOwnership]);

  // Handle apply button click
  const handleApply = () => {
    if (!job) return;
    navigate(`/apply/${job.id}`);
  };

  // Handle update job button click
  const handleUpdateJob = () => {
    if (!job) return;
    navigate(`/post-job?edit=${job.id}`);
  };

  // Format salary display
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

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return 'Posted just now';
    if (diffInHours === 1) return 'Posted 1 hour ago';
    if (diffInHours < 24) return `Posted ${diffInHours} hours ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Posted 1 day ago';
    return `Posted ${diffInDays} days ago`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Loading job details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error || 'Job not found'}</p>
            <Button onClick={handleBack} variant="primary">
              Go Back
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
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-lg md:text-2xl font-bold text-gray-900">
              Job Details
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        {/* Job Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <span className="text-sm text-gray-500">
                  {formatTimeAgo(job.created_at)}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                {job.title}
              </h2>
              <div className="flex items-center mb-4">
                {job.business_logo_url ? (
                  <img
                    src={job.business_logo_url}
                    alt={job.business_name}
                    className="w-12 h-12 rounded-full object-cover mr-3"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                    <BuildingOfficeIcon className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {job.business_name}
                  </h3>
                  {job.business_address && (
                    <p className="text-sm text-gray-500">
                      {job.business_address}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="ml-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {job.status}
              </span>
            </div>
          </div>

          {/* Job Key Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center text-gray-700">
              <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium">Location:</span>
              <span className="ml-2 text-sm">{job.location}</span>
            </div>
            <div className="flex items-center text-gray-700">
              <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium">Type:</span>
              <span className="ml-2 text-sm capitalize">{job.job_type}</span>
            </div>
            <div className="flex items-center text-gray-700">
              <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium">Pay:</span>
              <span className="ml-2 text-sm">{formatSalary(job)}</span>
            </div>
          </div>
        </div>

        {/* Job Description */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Job Description
          </h3>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {job.description}
            </p>
          </div>
        </div>

        {/* Business Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            About {job.business_name}
          </h3>
          <div className="space-y-3">
            {job.business_address && (
              <div className="flex items-start text-gray-700">
                <MapPinIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <span className="text-sm font-medium">Address:</span>
                  <p className="text-sm">{job.business_address}</p>
                </div>
              </div>
            )}
            {job.business_website && (
              <div className="flex items-center text-gray-700">
                <svg
                  className="h-5 w-5 text-gray-400 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                <div>
                  <span className="text-sm font-medium">Website:</span>
                  <a
                    href={job.business_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    {job.business_website}
                  </a>
                </div>
              </div>
            )}
            {job.business_owner_name && (
              <div className="flex items-center text-gray-700">
                <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <span className="text-sm font-medium">Contact:</span>
                  <p className="text-sm">{job.business_owner_name}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Additional Information
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium">Job ID:</span> #{job.id}
            </p>
            <p>
              <span className="font-medium">Posted:</span>{' '}
              {new Date(job.created_at).toLocaleDateString()}
            </p>
            <p>
              <span className="font-medium">Last Updated:</span>{' '}
              {new Date(job.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Apply/Update Button */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {isJobOwner ? (
            <Button
              onClick={handleUpdateJob}
              variant="primary"
              className="w-full py-4 text-lg font-medium"
            >
              Update Job
            </Button>
          ) : (
            <Button
              onClick={handleApply}
              disabled={isApplying}
              variant="primary"
              className="w-full py-4 text-lg font-medium"
            >
              {isApplying ? 'Applying...' : 'Apply Now'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetailsScreen;
