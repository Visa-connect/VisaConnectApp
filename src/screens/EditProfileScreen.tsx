import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeIcon } from '@heroicons/react/24/outline';
import { useUserStore } from '../stores/userStore';
import PhotoUpload from '../components/PhotoUpload';
import { uploadProfilePhoto } from '../api/firebaseStorage';
import { BusinessApiService, Business } from '../api/businessApi';
import { apiPatch } from '../api';

const EditProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useUserStore();

  // Form state
  const [bio, setBio] = useState(user?.bio);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | undefined>(
    user?.profile_photo_url
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');

  // Business state
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);
  const [businessError, setBusinessError] = useState<string>('');

  // Track if there are unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load user's businesses
  const loadBusinesses = async () => {
    try {
      setIsLoadingBusinesses(true);
      setBusinessError('');
      const response = await BusinessApiService.getUserBusinesses();
      if (response.success && response.data) {
        setBusinesses(response.data);
      } else {
        setBusinessError('Failed to load businesses');
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
      setBusinessError('Failed to load businesses');
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  // Load businesses on component mount
  useEffect(() => {
    loadBusinesses();
  }, []);

  // Reset unsaved changes when user data changes
  useEffect(() => {
    setHasUnsavedChanges(false);
  }, [user]);

  const handlePhotoChange = (file: File) => {
    setSelectedPhoto(file);
    setUploadError('');
    setHasUnsavedChanges(true);
    // Create preview URL for immediate display
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl(previewUrl);
  };

  const handlePhotoRemove = async () => {
    try {
      // If there's an existing photo, we'll need to handle deletion on the backend
      // For now, just clear the local state
      setSelectedPhoto(null);
      setPhotoPreviewUrl(undefined);
      setUploadError('');
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error removing photo:', error);
      setUploadError('Failed to remove photo');
    }
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBio(e.target.value);
    setHasUnsavedChanges(true);
  };

  const handleSaveProfile = async () => {
    try {
      setIsUploading(true);
      setUploadError('');

      let photoUrl = user?.profile_photo_url;
      let photoPublicId = user?.profile_photo_public_id;

      // Upload new photo to Cloudinary if selected
      if (selectedPhoto) {
        const uploadResult = await uploadProfilePhoto(selectedPhoto);

        if (!uploadResult.success) {
          setUploadError(uploadResult.error || 'Failed to upload photo');
          setIsUploading(false);
          return;
        }

        photoUrl = uploadResult.url;
        photoPublicId = uploadResult.fileName;
      }

      // Prepare update data for API
      const updateData = {
        bio,
        profile_photo_url: photoUrl,
        profile_photo_public_id: photoPublicId,
      };

      // Send to backend API
      await apiPatch('/api/user/profile', updateData);

      // Update local store with new data
      updateUser(updateData);

      setIsUploading(false);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setUploadError('Failed to save profile');
      setIsUploading(false);
    }
  };

  const handleWizardClick = () => {
    navigate('/background');
  };

  const handleViewPublicProfile = () => {
    navigate('/public-profile');
  };

  const handleAddBusiness = () => {
    navigate('/add-business');
  };

  const handleUpdateBusiness = (businessId: number) => {
    navigate(`/edit-business/${businessId}`);
  };

  return (
    <div>
      {/* Main Content */}
      <div className="px-4 py-6 max-w-2xl mx-auto w-full relative">
        {/* View Public Profile Icon - Top right aligned with content */}
        <button
          onClick={handleViewPublicProfile}
          className="absolute top-6 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="View Public Profile"
        >
          <EyeIcon className="w-5 h-5" />
        </button>

        {/* Profile Header */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-4">
            {/* Profile Picture with PhotoUpload component */}
            <PhotoUpload
              currentPhotoUrl={photoPreviewUrl}
              onPhotoChange={handlePhotoChange}
              onPhotoRemove={handlePhotoRemove}
              size="md"
              className="mx-auto"
            />
          </div>

          {/* User Name */}
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {user?.first_name} {user?.last_name}
          </h1>

          {/* Wizard Link */}
          <button
            onClick={handleWizardClick}
            className="text-blue-600 underline text-sm hover:text-blue-700"
          >
            Review and edit all preferences (wizard)
          </button>
        </div>

        {/* Bio Section */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-3">Bio</h2>
          <div className="relative">
            <textarea
              value={bio}
              onChange={handleBioChange}
              maxLength={160}
              className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Tell us about yourself..."
            />
          </div>
        </div>

        {/* Global Update Button - Only show when there are unsaved changes */}
        {hasUnsavedChanges && (
          <button
            onClick={handleSaveProfile}
            disabled={isUploading}
            className={`w-full py-4 px-6 rounded-lg font-medium text-lg transition-colors shadow-sm mb-4 ${
              isUploading
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Update Profile'}
          </button>
        )}

        {/* Business Call-to-Action Section */}
        {/* Business Section */}
        {isLoadingBusinesses ? (
          <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : businessError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-600">{businessError}</p>
            <button
              onClick={loadBusinesses}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        ) : businesses.length === 0 ? (
          <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-3">
              Do you have a business?
            </h2>
            <button
              onClick={handleAddBusiness}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Add Business
            </button>
          </div>
        ) : (
          <div className="space-y-4 mb-4">
            {businesses.map((business) => (
              <div
                key={business.id}
                onClick={() => handleUpdateBusiness(business.id)}
                className="bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-gray-900">{business.name}</h2>
                  <div className="flex items-center space-x-2">
                    {business.verified && (
                      <span className="text-blue-600 text-sm font-medium">
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {business.owner_name && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Owner:</span>{' '}
                      {business.owner_name}
                    </div>
                  )}
                  {business.year_formed && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Year Formed:</span>{' '}
                      {business.year_formed}
                    </div>
                  )}
                  {business.address && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Address:</span>{' '}
                      {business.address}
                    </div>
                  )}
                  {business.website && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Website:</span>{' '}
                      {business.website}
                    </div>
                  )}
                  {business.mission_statement && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Mission:</span>{' '}
                      {business.mission_statement}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={handleAddBusiness}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors border-2 border-dashed border-gray-300"
            >
              + Add Another Business
            </button>
          </div>
        )}

        {/* Upload Error Display */}
        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm text-center">{uploadError}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditProfileScreen;
