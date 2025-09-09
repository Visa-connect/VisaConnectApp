import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import {
  meetupService,
  Meetup,
  MeetupCategory,
  CreateMeetupRequest,
} from '../api/meetupService';
import { uploadMeetupPhoto, deleteMeetupPhoto } from '../api/cloudinary';
import Button from '../components/Button';

interface EditMeetupForm {
  category_id: number | null;
  title: string;
  description: string;
  location: string;
  meetup_date: string;
  meetup_time: string;
  max_participants: number | null;
  photo_url: string | null;
  photo_public_id: string | null;
}

const EditMeetupScreen: React.FC = () => {
  const navigate = useNavigate();
  const { meetupId } = useParams<{ meetupId: string }>();
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [categories, setCategories] = useState<MeetupCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<EditMeetupForm>({
    category_id: null,
    title: '',
    description: '',
    location: '',
    meetup_date: '',
    meetup_time: '',
    max_participants: null,
    photo_url: null,
    photo_public_id: null,
  });

  const fetchMeetupData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch meetup details and categories in parallel
      const [meetupData, categoriesData] = await Promise.all([
        meetupService.getMeetup(parseInt(meetupId!)),
        meetupService.getCategories(),
      ]);

      setMeetup(meetupData);
      setCategories(categoriesData);

      // Pre-populate form with existing meetup data
      const meetupDate = new Date(meetupData.meetup_date);
      setFormData({
        category_id: meetupData.category_id,
        title: meetupData.title,
        description: meetupData.description,
        location: meetupData.location,
        meetup_date: meetupDate.toISOString().split('T')[0],
        meetup_time: meetupDate.toTimeString().slice(0, 5),
        max_participants: meetupData.max_participants || null,
        photo_url: meetupData.photo_url || null,
        photo_public_id: meetupData.photo_public_id || null,
      });
    } catch (err) {
      console.error('Error fetching meetup data:', err);
      setError('Failed to load meetup data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [meetupId]);

  useEffect(() => {
    if (meetupId) {
      fetchMeetupData();
    }
  }, [meetupId, fetchMeetupData]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'max_participants' || name === 'category_id'
          ? value
            ? parseInt(value)
            : null
          : value,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Delete old image if exists
      if (formData.photo_public_id) {
        try {
          await deleteMeetupPhoto(formData.photo_public_id);
        } catch (deleteErr) {
          console.warn('Failed to delete old image:', deleteErr);
        }
      }

      // Upload new image
      const result = await uploadMeetupPhoto(file);
      setFormData((prev) => ({
        ...prev,
        photo_url: result.url || null,
        photo_public_id: result.publicId || null,
      }));
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!meetupId) {
      setError('Invalid meetup ID');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Combine date and time
      const meetupDateTime = new Date(
        `${formData.meetup_date}T${formData.meetup_time}`
      );

      const meetupData: CreateMeetupRequest = {
        category_id: formData.category_id!,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        meetup_date: meetupDateTime.toISOString(),
        max_participants: formData.max_participants,
        photo_url: formData.photo_url,
        photo_public_id: formData.photo_public_id,
      };

      await meetupService.updateMeetup(parseInt(meetupId), meetupData);

      setSuccessMessage('Meetup updated successfully!');

      // Redirect to meetup details after a short delay
      setTimeout(() => {
        navigate(`/meetups/${meetupId}`);
      }, 1500);
    } catch (err) {
      console.error('Error updating meetup:', err);
      setError('Failed to update meetup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBackClick = () => {
    navigate('/meetups-posted');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500">Loading meetup data...</div>
        </div>
      </div>
    );
  }

  if (error && !meetup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <Button variant="secondary" onClick={handleBackClick}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Header */}
      <div className="hidden md:block bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackClick}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to My Meetups
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Mobile Back Button */}
        <div className="md:hidden mb-6">
          <button
            onClick={handleBackClick}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to My Meetups
          </button>
        </div>

        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Meetup</h1>
          <p className="text-gray-600 mt-2">Update your meetup details</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-green-700">{successMessage}</div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div>
              <label
                htmlFor="category_id"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Category *
              </label>
              <select
                id="category_id"
                name="category_id"
                value={formData.category_id || ''}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter meetup title"
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="meetup_date"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Date *
                </label>
                <input
                  type="date"
                  id="meetup_date"
                  name="meetup_date"
                  value={formData.meetup_date}
                  onChange={handleInputChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label
                  htmlFor="meetup_time"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Time *
                </label>
                <input
                  type="time"
                  id="meetup_time"
                  name="meetup_time"
                  value={formData.meetup_time}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Location *
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter meetup location"
              />
            </div>

            {/* Max Participants */}
            <div>
              <label
                htmlFor="max_participants"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Maximum Participants (Optional)
              </label>
              <input
                type="number"
                id="max_participants"
                name="max_participants"
                value={formData.max_participants || ''}
                onChange={handleInputChange}
                min="1"
                max="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Leave empty for unlimited"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                maxLength={1000}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your meetup..."
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meetup Photo
              </label>

              {formData.photo_url ? (
                <div className="relative">
                  <img
                    src={formData.photo_url}
                    alt="Meetup preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <label className="absolute top-2 right-2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 cursor-pointer shadow-lg transition-colors">
                    {uploading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <PencilIcon className="w-4 h-4" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-8 h-8 mb-4 text-gray-500"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 20 16"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> a
                      photo
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG or GIF (MAX. 5MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleBackClick}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={saving || uploading}
              >
                {saving ? 'Updating...' : 'Update Meetup'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditMeetupScreen;
