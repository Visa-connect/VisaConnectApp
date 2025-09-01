import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  ChevronDownIcon,
  CalendarIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import Button from '../components/Button';
import {
  meetupService,
  MeetupCategory,
  CreateMeetupRequest,
} from '../api/meetupService';

interface PostMeetupForm {
  category_id: number | null;
  title: string;
  dateTime: string;
  location: string;
  description: string;
  photo_url: string | null;
  photo_public_id: string | null;
}

const PostMeetupScreen: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<PostMeetupForm>({
    category_id: null,
    title: '',
    dateTime: '',
    location: '',
    description: '',
    photo_url: null,
    photo_public_id: null,
  });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categories, setCategories] = useState<MeetupCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await meetupService.getCategories();
        setCategories(fetchedCategories);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories. Please try again.');
      }
    };

    fetchCategories();
  }, []);

  const handleInputChange = (
    field: keyof PostMeetupForm,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      // TODO: Implement actual image upload to Cloudinary or similar service
      // For now, we'll just store the file name and create a placeholder URL
      const placeholderUrl = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        photo_url: placeholderUrl,
        photo_public_id: `temp_${Date.now()}`, // Temporary ID
      }));
    }
  };

  const handlePost = async () => {
    if (!formData.category_id) {
      setError('Please select a category');
      return;
    }

    if (
      !formData.title ||
      !formData.dateTime ||
      !formData.location ||
      !formData.description
    ) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const meetupData: CreateMeetupRequest = {
        category_id: formData.category_id,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        meetup_date: formData.dateTime,
        max_participants: undefined, // Optional field
        photo_url: formData.photo_url || undefined,
        photo_public_id: formData.photo_public_id || undefined,
      };

      await meetupService.createMeetup(meetupData);

      // Navigate back to meetups screen after successful post
      navigate('/meetups');
    } catch (err) {
      console.error('Error creating meetup:', err);
      setError('Failed to create meetup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* App Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b">
        <button onClick={handleBack} className="p-2 -ml-2">
          <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
        </button>
        <h1 className="font-bold text-lg text-gray-900">Post a Meetup</h1>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      {/* Form */}
      <div className="p-4 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        )}
        {/* Choose Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Choose Category
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <span
                className={
                  formData.category_id ? 'text-gray-900' : 'text-gray-500'
                }
              >
                {formData.category_id
                  ? categories.find((cat) => cat.id === formData.category_id)
                      ?.name
                  : 'Select a category'}
              </span>
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            </button>

            {showCategoryDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      handleInputChange('category_id', category.id);
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg focus:outline-none focus:bg-gray-50"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Enter meetup title"
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Date and Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date and time
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={formData.dateTime}
              onChange={(e) => handleInputChange('dateTime', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 pl-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <CalendarIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            placeholder="Enter meetup location"
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (be as detailed as possible)
          </label>
          <div className="relative">
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter meetup description"
              maxLength={160}
              rows={4}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {formData.description.length}/160
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 pt-4">
          {/* Upload Image Button */}
          <div>
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <label
              htmlFor="image-upload"
              className="w-full bg-sky-400 text-white rounded-lg px-4 py-3 flex items-center justify-center cursor-pointer hover:bg-sky-500 transition-colors"
            >
              <span className="mr-2">Upload image</span>
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
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </label>
            {formData.photo_url && (
              <p className="text-sm text-gray-600 mt-2">Photo selected</p>
            )}
          </div>

          {/* Post Button */}
          <Button
            variant="primary"
            onClick={handlePost}
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PostMeetupScreen;
