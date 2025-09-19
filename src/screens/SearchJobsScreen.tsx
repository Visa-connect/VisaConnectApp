import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import Button from '../components/Button';
import DrawerMenu from '../components/DrawerMenu';
import { JobsApiService, JobWithBusiness, JobFilters } from '../api/jobsApi';

const SearchJobsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState<JobWithBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<JobFilters>({
    status: 'active',
    limit: 20,
    offset: 0,
    order_by: 'created_at',
    order_direction: 'DESC',
  });
  const [totalJobs, setTotalJobs] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const handleOverlayClick = () => {
    setIsDrawerOpen(false);
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Fetch jobs
  const fetchJobs = useCallback(
    async (searchFilters: JobFilters = filters) => {
      try {
        setLoading(true);
        setError(null);

        const response = await JobsApiService.getAllJobs(searchFilters);

        if (response.success) {
          setJobs(response.data);
          setTotalJobs(response.pagination.total);
          setHasMore(response.pagination.hasMore);
        } else {
          setError('Failed to load jobs. Please try again.');
          setJobs([]);
        }
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load jobs. Please try again.');
        setJobs([]);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Load jobs on component mount
  useEffect(() => {
    fetchJobs();
  }, []);

  // Handle search
  const handleSearch = useCallback(async () => {
    const searchFilters = {
      ...filters,
      location: searchQuery.trim() || undefined,
      offset: 0,
    };
    setFilters(searchFilters);
    await fetchJobs(searchFilters);
  }, [searchQuery, filters, fetchJobs]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    const clearedFilters = {
      ...filters,
      location: undefined,
      offset: 0,
    };
    setFilters(clearedFilters);
    fetchJobs(clearedFilters);
  };

  // Handle job type filter
  const handleJobTypeFilter = (jobType: 'hourly' | 'fixed' | 'all') => {
    const newFilters = {
      ...filters,
      job_type: jobType === 'all' ? undefined : jobType,
      offset: 0,
    };
    setFilters(newFilters);
    fetchJobs(newFilters);
  };

  // Handle job click
  const handleJobClick = (jobId: number) => {
    navigate(`/job/${jobId}`);
  };

  // Format salary display
  const formatSalary = (job: JobWithBusiness) => {
    if (job.rate_from && job.rate_to) {
      return `${job.job_type === 'hourly' ? 'Hourly' : 'Fixed'}: $${
        job.rate_from
      }-$${job.rate_to}`;
    } else if (job.rate_from) {
      return `${job.job_type === 'hourly' ? 'Hourly' : 'Fixed'}: $${
        job.rate_from
      }+`;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <DrawerMenu
        open={isDrawerOpen}
        onClose={handleOverlayClick}
        navigate={navigate}
        highlight={undefined}
      />

      {/* Header */}
      <div className="bg-white shadow-sm">
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
              Search Jobs
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search jobs by location, employer or keyword"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="block w-full pl-12 pr-12 py-4 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
              >
                <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => handleJobTypeFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !filters.job_type
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Jobs
          </button>
          <button
            onClick={() => handleJobTypeFilter('hourly')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filters.job_type === 'hourly'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Hourly
          </button>
          <button
            onClick={() => handleJobTypeFilter('fixed')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filters.job_type === 'fixed'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Fixed
          </button>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">
            {loading
              ? 'Loading jobs...'
              : `${totalJobs} job${totalJobs !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading jobs...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchJobs()} variant="primary">
              Try Again
            </Button>
          </div>
        )}

        {/* Job Listings */}
        {!loading && !error && (
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  No jobs found matching your criteria.
                </p>
                <Button onClick={clearSearch} variant="primary">
                  Clear Filters
                </Button>
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => handleJobClick(job.id)}
                  className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-sm text-gray-500">
                          {formatTimeAgo(job.created_at)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-blue-600 hover:text-blue-800 mb-2">
                        {job.title}
                      </h3>
                      <p className="text-gray-700 text-sm mb-2">
                        {formatSalary(job)}
                      </p>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {job.description}
                      </p>
                      <div className="flex items-center text-gray-500 text-sm">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        <span>{job.location}</span>
                      </div>
                    </div>
                    {job.business_logo_url && (
                      <div className="ml-4 flex-shrink-0">
                        <img
                          src={job.business_logo_url}
                          alt={job.business_name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {job.business_name}
                        </p>
                        {job.business_address && (
                          <p className="text-gray-500 text-xs">
                            {job.business_address}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {job.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Load More Button */}
        {!loading && !error && hasMore && (
          <div className="text-center mt-8">
            <Button
              onClick={() => {
                const newFilters = {
                  ...filters,
                  offset: (filters.offset || 0) + 20,
                };
                setFilters(newFilters);
                fetchJobs(newFilters);
              }}
              variant="primary"
              className="px-8 py-3"
            >
              Load More Jobs
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchJobsScreen;
