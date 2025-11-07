import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Button from '../components/Button';
import {
  tipsTripsAdviceService,
  CreateTipsTripsAdviceRequest,
} from '../api/tipsTripsAdviceService';
import {
  compressImages,
  formatFileSize,
  CompressionResult,
} from '../utils/imageCompression';

interface PhotoItem {
  file: File;
  preview: string;
  compression?: CompressionResult;
}

const PostTipsTripsAdviceScreen: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    post_type: 'tip' as 'tip' | 'trip' | 'advice',
  });
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const previewUrlsRef = useRef<string[]>([]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    try {
      setCompressing(true);
      setCompressionProgress(0);

      const compressionResults = await compressImages(
        files,
        {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.85,
          format: 'jpeg',
          maxSizeKB: 2048,
        },
        (completed, total) => {
          setCompressionProgress(Math.round((completed / total) * 100));
        }
      );

      const newPhotos = compressionResults.map((result) => {
        const previewUrl = URL.createObjectURL(result.file);
        previewUrlsRef.current.push(previewUrl);
        return {
          file: result.file,
          preview: previewUrl,
          compression: result,
        };
      });

      setPhotos((prev) => [...prev, ...newPhotos]);
    } catch (err) {
      console.error('Error compressing images:', err);
      setError('Failed to compress images. Please try again.');
    } finally {
      setCompressing(false);
      setCompressionProgress(0);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      const previewUrl = newPhotos[index].preview;
      URL.revokeObjectURL(previewUrl);
      previewUrlsRef.current = previewUrlsRef.current.filter(
        (url) => url !== previewUrl
      );
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const postData: CreateTipsTripsAdviceRequest = {
        title: formData.title,
        description: formData.description,
        post_type: formData.post_type,
        photos: photos.map((photo) => photo.file),
      };

      await tipsTripsAdviceService.createPost(postData);
      navigate('/tips-trips-advice');
    } catch (err) {
      console.error('Error creating post:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create post. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/tips-trips-advice');
  };

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <button
            onClick={handleBack}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Post</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="mb-6">
            <label
              htmlFor="post_type"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Post Type *
            </label>
            <select
              id="post_type"
              name="post_type"
              value={formData.post_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="tip">Tip</option>
              <option value="trip">Trip</option>
              <option value="advice">Advice</option>
            </select>
          </div>

          <div className="mb-6">
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
              placeholder="Enter a compelling title for your post"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-6">
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
              rows={6}
              placeholder="Share your tip, trip experience, or advice in detail..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos (Optional)
            </label>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <PhotoIcon className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span>{' '}
                      photos
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, WebP up to 10MB
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoChange}
                    disabled={compressing}
                    className="hidden"
                  />
                </label>
              </div>

              {compressing && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm text-blue-700">
                        Compressing images... {compressionProgress}%
                      </p>
                      <div className="mt-2 bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${compressionProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {photos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                      {photo.compression && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 rounded-b-lg">
                          <div className="truncate">
                            {photo.compression.compressionRatio > 0 && (
                              <span className="text-green-400">
                                -{photo.compression.compressionRatio}%
                              </span>
                            )}
                            <span className="ml-1">
                              {formatFileSize(photo.compression.compressedSize)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleBack}
              className="px-6 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="px-6 py-2"
            >
              {loading ? 'Creating...' : 'Create Post'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PostTipsTripsAdviceScreen;
