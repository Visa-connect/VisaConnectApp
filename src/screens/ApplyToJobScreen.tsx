import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CloudArrowUpIcon, HandRaisedIcon } from '@heroicons/react/24/outline';
import Button from '../components/Button';
import DrawerMenu from '../components/DrawerMenu';
import Modal from '../components/Modal';
import LocationInput from '../components/LocationInput';
import { JobsApiService, JobWithBusiness } from '../api/jobsApi';
import {
  ApplicationsApiService,
  ApplicationSubmission,
} from '../api/applicationsApi';
import { visaTypes, startDateOptions } from '../utils/visaTypes';
import { LocationData } from '../types/location';

interface ApplicationFormData {
  qualifications: string;
  location: LocationData;
  visa: string;
  startDate: string;
  resume?: File;
}

const ApplyToJobScreen: React.FC = () => {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [job, setJob] = useState<JobWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState<ApplicationFormData>({
    qualifications: '',
    location: { address: '' },
    visa: '',
    startDate: '',
  });

  const handleOverlayClick = () => {
    setIsDrawerOpen(false);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    navigate(`/job/${jobId}`);
  };

  // Fetch job details
  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!jobId) {
        setError('Job ID not provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await JobsApiService.getJobById(parseInt(jobId));

        if (response.success) {
          setJob(response.data);
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

    fetchJobDetails();
  }, [jobId]);

  // Handle form input changes
  const handleInputChange = (
    field: keyof ApplicationFormData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLocationChange = (location: LocationData) => {
    setFormData((prev) => ({ ...prev, location }));
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        resume: file,
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!job) return;

    // Basic validation
    if (!formData.qualifications.trim()) {
      alert('Please explain your qualifications.');
      return;
    }
    if (!formData.location.address.trim()) {
      alert('Please provide your location.');
      return;
    }
    if (!formData.startDate.trim()) {
      alert('Please specify when you can start.');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Handle resume file upload to cloud storage
      // For now, we'll skip the resume upload and just submit the form data

      const applicationData: ApplicationSubmission = {
        job_id: job.id,
        qualifications: formData.qualifications,
        location: formData.location.address,
        visa_type: formData.visa || undefined,
        start_date: formData.startDate,
        // resume_url: formData.resume ? 'uploaded_url_here' : undefined,
        // resume_filename: formData.resume?.name,
      };

      const response = await ApplicationsApiService.submitApplication(
        applicationData
      );

      if (response.success) {
        setShowSuccessModal(true);
      } else {
        throw new Error('Failed to submit application');
      }
    } catch (err: any) {
      console.error('Error submitting application:', err);
      const errorMessage =
        err.message || 'Failed to submit application. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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
              Apply
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        {/* Job Title */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            {job.title}
          </h2>
          <p className="text-gray-600">
            at <span className="font-semibold">{job.business_name}</span>
          </p>
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Qualifications */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label
              htmlFor="qualifications"
              className="block text-sm font-medium text-gray-700 mb-3"
            >
              Explain your qualifications and why you would be good for this
              job.
            </label>
            <textarea
              id="qualifications"
              value={formData.qualifications}
              onChange={(e) =>
                handleInputChange('qualifications', e.target.value)
              }
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Describe your relevant experience, skills, and why you're interested in this position..."
              required
            />
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <LocationInput
              value={formData.location.address}
              onChange={handleLocationChange}
              placeholder="Enter your current location"
              required
              label="What is your location?"
            />
          </div>

          {/* Visa */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label
              htmlFor="visa"
              className="block text-sm font-medium text-gray-700 mb-3"
            >
              What VISA do you have, if any?
            </label>
            <select
              id="visa"
              value={formData.visa}
              onChange={(e) => handleInputChange('visa', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {visaTypes.map((visa) => (
                <option key={visa.value} value={visa.value}>
                  {visa.label}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700 mb-3"
            >
              How soon can you start?
            </label>
            <select
              id="startDate"
              value={formData.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {startDateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Resume Upload */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label
              htmlFor="resume"
              className="block text-sm font-medium text-gray-700 mb-3"
            >
              Upload resume (optional)
            </label>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <input
                  type="file"
                  id="resume"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="resume"
                  className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                >
                  <CloudArrowUpIcon className="h-6 w-6 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    {formData.resume
                      ? formData.resume.name
                      : 'Click to upload resume'}
                  </span>
                </label>
              </div>
            </div>
            {formData.resume && (
              <p className="mt-2 text-sm text-green-600">
                ✓ Resume uploaded: {formData.resume.name}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="primary"
            className="w-full py-4 text-lg font-medium"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </form>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
        showCloseButton={false}
        size="md"
        className="text-center"
      >
        <div className="py-4">
          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Thank you for applying for a job on Visa Connect!
          </h3>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <HandRaisedIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          {/* Message */}
          <p className="text-gray-700 text-sm leading-relaxed mb-6">
            Your application has been emailed to the employer. If they are
            interested they will contact you via email address.
          </p>

          {/* Done Button */}
          <Button
            onClick={handleCloseSuccessModal}
            variant="primary"
            className="w-full py-3 text-base font-medium"
          >
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ApplyToJobScreen;
