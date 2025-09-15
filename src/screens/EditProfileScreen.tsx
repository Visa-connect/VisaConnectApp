import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeIcon } from '@heroicons/react/24/outline';
import { useUserStore } from '../stores/userStore';
import PhotoUpload from '../components/PhotoUpload';
import { uploadProfilePhoto } from '../api/cloudinary';

const EditProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useUserStore();

  // Form state
  const [bio, setBio] = useState(
    user?.bio ||
      'Looking to get some people together to enjoy the beautiful city of Miami.'
  );
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | undefined>(
    user?.profile_photo_url
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');

  // Business state - for now using mock data, will be replaced with real data later
  const [hasBusiness, setHasBusiness] = useState(false); // Mock: user has a business
  const [businessData, setBusinessData] = useState({
    name: 'Miamis Best Sushi',
    businessName: "Raphael's Cafe",
    address: '123 S Main St. Miami, FL 33131',
    website: 'www.RaphaelsCafe.com',
    verified: true,
  });

  // Track if there are unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
        photoPublicId = uploadResult.publicId;
      }

      // Update user profile with new photo URL and public_id
      await updateUser({
        bio,
        profile_photo_url: photoUrl,
        profile_photo_public_id: photoPublicId,
      });

      setIsUploading(false);
      setHasUnsavedChanges(false);
      navigate('/settings');
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
    if (user?.uid) {
      navigate(`/public-profile/${user.uid}`);
    } else {
      navigate('/public-profile');
    }
  };

  const handleAddBusiness = () => {
    navigate('/add-business');
  };

  const handleUpdateBusiness = () => {
    // TODO: Navigate to update business screen or open modal
    console.log('Update business clicked');
  };

  return (
    <div>
      {/* Main Content */}
      <div className="px-4 py-6 max-w-2xl mx-auto w-full">
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
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {bio.length}/160
            </div>
          </div>
        </div>

        {/* Business Call-to-Action Section */}
        {!hasBusiness && (
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
        )}

        {/* Business Listing Section */}
        {hasBusiness && (
          <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900">{businessData.name}</h2>
              {businessData.verified && (
                <span className="text-blue-600 text-sm font-medium">
                  Verified
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-sm text-gray-700">
                {businessData.businessName}
              </div>
              <div className="text-sm text-gray-700">
                {businessData.address}
              </div>
              <div className="text-sm text-gray-700">
                {businessData.website}
              </div>
            </div>

            <button
              onClick={handleUpdateBusiness}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Update Profile
            </button>
          </div>
        )}

        {/* Global Update Button - Only show when there are unsaved changes */}
        {hasUnsavedChanges && (
          <button
            onClick={handleSaveProfile}
            disabled={isUploading}
            className={`w-full py-4 px-6 rounded-lg font-medium text-lg transition-colors shadow-sm ${
              isUploading
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Update'}
          </button>
        )}

        {/* Upload Error Display */}
        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm text-center">{uploadError}</p>
          </div>
        )}
      </div>

      {/* View Public Profile Icon - Fixed in top right */}
      <button
        onClick={handleViewPublicProfile}
        className="fixed top-20 right-4 z-40 bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-colors"
        aria-label="View Public Profile"
      >
        <EyeIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default EditProfileScreen;
