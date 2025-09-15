import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const handlePhotoChange = (file: File) => {
    setSelectedPhoto(file);
    setUploadError('');
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
    } catch (error) {
      console.error('Error removing photo:', error);
      setUploadError('Failed to remove photo');
    }
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
              onChange={(e) => setBio(e.target.value)}
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

        {/* Global Update Button */}
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

        {/* Upload Error Display */}
        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm text-center">{uploadError}</p>
          </div>
        )}
      </div>

      {/* View Public Profile Button - Fixed in top right */}
      <button
        onClick={handleViewPublicProfile}
        className="fixed top-20 right-4 z-40 bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-colors"
        aria-label="View Public Profile"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      </button>
    </div>
  );
};

export default EditProfileScreen;
