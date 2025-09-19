import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { BusinessApiService, Business } from '../api/businessApi';
import { JobsApiService, JobSubmission } from '../api/jobsApi';
import { uploadBusinessLogo } from '../api/cloudinary';

interface JobFormData {
  businessId: number;
  title: string;
  description: string;
  location: string;
  jobType: 'hourly' | 'fixed';
  rateFrom: string;
  rateTo: string;
  businessLogo?: string;
}

const PostJobScreen: React.FC = () => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<JobFormData>({
    businessId: 0,
    title: '',
    description: '',
    location: '',
    jobType: 'hourly',
    rateFrom: '',
    rateTo: '',
  });

  // Load user's verified businesses
  const loadBusinesses = async () => {
    try {
      setIsLoadingBusinesses(true);
      const response = await BusinessApiService.getUserBusinesses();
      if (response.success && response.data) {
        // Filter only verified businesses
        const verifiedBusinesses = response.data.filter(
          (business) => business.verified
        );
        setBusinesses(verifiedBusinesses);

        // Auto-select first verified business if available
        if (verifiedBusinesses.length > 0) {
          setSelectedBusiness(verifiedBusinesses[0]);
          setFormData((prev) => ({
            ...prev,
            businessId: verifiedBusinesses[0].id,
          }));
        }
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  const handleInputChange = (
    field: keyof JobFormData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleJobTypeChange = (jobType: 'hourly' | 'fixed') => {
    setFormData((prev) => ({ ...prev, jobType }));
  };

  const handleBusinessSelect = (business: Business) => {
    setSelectedBusiness(business);
    setFormData((prev) => ({
      ...prev,
      businessId: business.id,
      businessLogo: business.logo_url || undefined,
    }));
  };

  const handleLogoUpload = async (file: File) => {
    try {
      const result = await uploadBusinessLogo(file);
      if (result.success && result.url) {
        setFormData((prev) => ({ ...prev, businessLogo: result.url }));
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBusiness) {
      setSubmitError('Please select a business');
      return;
    }

    if (!formData.title || !formData.description || !formData.location) {
      setSubmitError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');

      const jobData: JobSubmission = {
        business_id: formData.businessId,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        job_type: formData.jobType,
        rate_from: formData.rateFrom ? parseFloat(formData.rateFrom) : null,
        rate_to: formData.rateTo ? parseFloat(formData.rateTo) : null,
        business_logo_url: formData.businessLogo,
      };

      const response = await JobsApiService.createJob(jobData);

      if (response.success) {
        // Show success message and navigate back to work portal
        alert('Job posted successfully!');
        navigate('/work');
      } else {
        setSubmitError('Failed to post job. Please try again.');
      }
    } catch (error: any) {
      console.error('Error posting job:', error);
      setSubmitError(error.message || 'Failed to post job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingBusinesses) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600">Loading verified businesses...</div>
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            No Verified Businesses
          </h1>
          <p className="text-gray-600 mb-6">
            You need to have a verified business to post jobs. Please submit
            your business for verification first.
          </p>
          <Button variant="primary" onClick={() => navigate('/add-business')}>
            Add Business
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900"
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
            <h1 className="text-2xl font-bold text-gray-900">Post a job</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Selection */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Business Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Business
                </label>
                <div className="space-y-2">
                  {businesses.map((business) => (
                    <div
                      key={business.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedBusiness?.id === business.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => handleBusinessSelect(business)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {business.name}
                          </div>
                          {business.address && (
                            <div className="text-sm text-gray-600">
                              {business.address}
                            </div>
                          )}
                        </div>
                        <div className="text-blue-600 text-sm font-medium">
                          Verified
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Logo
                </label>
                {selectedBusiness?.logo_url ? (
                  <div className="flex items-center space-x-4">
                    <img
                      src={selectedBusiness.logo_url}
                      alt="Business logo"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                    />
                    <div>
                      <p className="text-sm text-gray-600">
                        Using existing logo
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement)
                              .files?.[0];
                            if (file) handleLogoUpload(file);
                          };
                          input.click();
                        }}
                      >
                        Change Logo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleLogoUpload(file);
                      };
                      input.click();
                    }}
                    className="w-full justify-center"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Upload Business Logo
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Job Details */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Job Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter job title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange('description', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Describe the job requirements and responsibilities"
                  maxLength={160}
                  required
                />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {formData.description.length}/160
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location of job
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    handleInputChange('location', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter job location"
                  required
                />
              </div>
            </div>
          </div>

          {/* Job Type and Rate */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Compensation
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose one
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => handleJobTypeChange('hourly')}
                    className={`flex-1 p-3 border rounded-lg text-center transition-colors ${
                      formData.jobType === 'hourly'
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-3 h-3 rounded-full mr-2 ${
                          formData.jobType === 'hourly'
                            ? 'bg-blue-500'
                            : 'bg-gray-300'
                        }`}
                      ></div>
                      Hourly rate
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleJobTypeChange('fixed')}
                    className={`flex-1 p-3 border rounded-lg text-center transition-colors ${
                      formData.jobType === 'fixed'
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-3 h-3 rounded-full mr-2 ${
                          formData.jobType === 'fixed'
                            ? 'bg-blue-500'
                            : 'bg-gray-300'
                        }`}
                      ></div>
                      Fixed price
                    </div>
                  </button>
                </div>
              </div>

              {formData.jobType === 'hourly' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.rateFrom}
                        onChange={(e) =>
                          handleInputChange('rateFrom', e.target.value)
                        }
                        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="25.00"
                        step="0.01"
                        min="0"
                      />
                      <span className="absolute right-3 top-2 text-gray-500">
                        /hr
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.rateTo}
                        onChange={(e) =>
                          handleInputChange('rateTo', e.target.value)
                        }
                        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="35.00"
                        step="0.01"
                        min="0"
                      />
                      <span className="absolute right-3 top-2 text-gray-500">
                        /hr
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fixed Price
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.rateFrom}
                      onChange={(e) =>
                        handleInputChange('rateFrom', e.target.value)
                      }
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1000.00"
                      step="0.01"
                      min="0"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">
                      $
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-800">{submitError}</div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              className="px-8 py-3"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostJobScreen;
