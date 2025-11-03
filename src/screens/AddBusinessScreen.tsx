import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import Button from '../components/Button';
import { BusinessApiService, BusinessSubmission } from '../api/businessApi';
import { uploadBusinessLogo } from '../api/firebaseStorage';

const AddBusinessScreen: React.FC = () => {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    businessName: '',
    yearFormed: '',
    ownerName: '',
    businessAddress: '',
    missionStatement: '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!formData.yearFormed.trim()) {
      newErrors.yearFormed = 'Year formed is required';
    } else if (!/^\d{4}$/.test(formData.yearFormed)) {
      newErrors.yearFormed = 'Please enter a valid year (e.g., 2020)';
    }

    if (!formData.ownerName.trim()) {
      newErrors.ownerName = 'Your name is required';
    }

    if (!formData.missionStatement.trim()) {
      newErrors.missionStatement = 'Mission statement is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let logoUrl = '';
      let logoPublicId = '';

      // Upload logo if provided
      if (logoFile) {
        const uploadResult = await uploadBusinessLogo(logoFile);
        if (!uploadResult.success) {
          setErrors({ logo: uploadResult.error || 'Failed to upload logo' });
          return;
        }
        logoUrl = uploadResult.url || '';
        logoPublicId = uploadResult.fileName || '';
      }

      // Prepare business submission data
      const businessData: BusinessSubmission = {
        businessName: formData.businessName.trim(),
        yearFormed: parseInt(formData.yearFormed),
        ownerName: formData.ownerName.trim(),
        businessAddress: formData.businessAddress.trim() || undefined,
        missionStatement: formData.missionStatement.trim(),
        logoUrl: logoUrl || undefined,
        logoPublicId: logoPublicId || undefined,
      };

      // Submit business to backend
      const response = await BusinessApiService.submitBusiness(businessData);

      if (response.success) {
        // Show success message and navigate back
        alert(
          'Business submitted successfully! It will be reviewed by our admin team.'
        );
        navigate('/edit-profile');
      } else {
        throw new Error(response.message || 'Failed to submit business');
      }
    } catch (error) {
      console.error('Error submitting business:', error);
      setErrors({
        submit:
          error instanceof Error ? error.message : 'Failed to submit business',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/edit-profile');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-center relative">
            <button
              onClick={handleBack}
              className="absolute left-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              Add business details
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* Introduction Text */}
        <div className="mb-6">
          <p className="text-gray-600 text-sm leading-relaxed">
            Once you complete this information, it will be reviewed by the Visa
            Connect team. We will contact you within 24-48 hours via email.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Business Name */}
          <div>
            <label
              htmlFor="businessName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Name of business
            </label>
            <input
              type="text"
              id="businessName"
              name="businessName"
              value={formData.businessName}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.businessName ? 'border-red-300' : 'border-gray-300'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="Enter business name"
              disabled={isSubmitting}
            />
            {errors.businessName && (
              <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
            )}
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Business logo
            </label>
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Business logo preview"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="flex flex-col items-center">
                  <CloudArrowUpIcon className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">
                    Upload Business logo
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Year Formed */}
          <div>
            <label
              htmlFor="yearFormed"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Year formed
            </label>
            <input
              type="text"
              id="yearFormed"
              name="yearFormed"
              value={formData.yearFormed}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.yearFormed ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., 2020"
              maxLength={4}
            />
            {errors.yearFormed && (
              <p className="mt-1 text-sm text-red-600">{errors.yearFormed}</p>
            )}
          </div>

          {/* Owner Name */}
          <div>
            <label
              htmlFor="ownerName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Your name
            </label>
            <div className="relative">
              <input
                type="text"
                id="ownerName"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleInputChange}
                maxLength={160}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.ownerName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your full name"
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {formData.ownerName.length}/160
              </div>
            </div>
            {errors.ownerName && (
              <p className="mt-1 text-sm text-red-600">{errors.ownerName}</p>
            )}
          </div>

          {/* Business Address */}
          <div>
            <label
              htmlFor="businessAddress"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Business address (optional)
            </label>
            <div className="relative">
              <input
                type="text"
                id="businessAddress"
                name="businessAddress"
                value={formData.businessAddress}
                onChange={handleInputChange}
                maxLength={160}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter business address"
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {formData.businessAddress.length}/160
              </div>
            </div>
          </div>

          {/* Mission Statement */}
          <div>
            <label
              htmlFor="missionStatement"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Mission statement
            </label>
            <div className="relative">
              <textarea
                id="missionStatement"
                name="missionStatement"
                value={formData.missionStatement}
                onChange={handleInputChange}
                maxLength={160}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.missionStatement ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe your business mission and values"
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {formData.missionStatement.length}/160
              </div>
            </div>
            {errors.missionStatement && (
              <p className="mt-1 text-sm text-red-600">
                {errors.missionStatement}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="w-full py-3 px-6 text-lg"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBusinessScreen;
