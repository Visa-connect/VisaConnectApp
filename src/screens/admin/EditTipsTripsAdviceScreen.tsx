import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Button from '../../components/Button';
import {
  adminTipsTripsAdviceService,
  TipsTripsAdvicePost,
  UpdatePostData,
} from '../../api/adminTipsTripsAdviceService';
import { useAdminStore } from '../../stores/adminStore';
import {
  compressImages,
  formatFileSize,
  CompressionResult,
} from '../../utils/imageCompression';

const EditTipsTripsAdviceScreen: React.FC = () => {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const { state } = useAdminStore();
  const [loading, setLoading] = useState(false);
  const [loadingPost, setLoadingPost] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<TipsTripsAdvicePost | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    post_type: 'tip' as 'tip' | 'trip' | 'advice',
  });
  const [photos, setPhotos] = useState<
    { file: File; preview: string; compression?: CompressionResult }[]
  >([]);
  const [existingPhotos, setExistingPhotos] = useState<
    { id: number; photo_url: string; photo_public_id: string }[]
  >([]);
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);

  useEffect(() => {
    // First try to get the post from the admin store
    if (state.selectedTipsTripsAdvicePost) {
      const postData = state.selectedTipsTripsAdvicePost;
      setPost(postData);
      setFormData({
        title: postData.title,
        description: postData.description,
        post_type: postData.post_type,
      });
      setExistingPhotos(
        (postData.photos || []).map(
          (photo: NonNullable<TipsTripsAdvicePost['photos']>[0]) => ({
            id: parseInt(photo.id),
            photo_url: photo.photo_url,
            photo_public_id: photo.photo_public_id,
          })
        )
      );
      setLoadingPost(false);
      return;
    }

    // Fallback: fetch from API if not in store
    const fetchPost = async () => {
      if (!postId) return;

      try {
        setLoadingPost(true);
        const postData = await adminTipsTripsAdviceService.getPostById(postId);
        console.log('Fetched post data from API for edit:', postData);
        setPost(postData);
        setFormData({
          title: postData.title,
          description: postData.description,
          post_type: postData.post_type,
        });
        setExistingPhotos(
          (postData.photos || []).map(
            (photo: NonNullable<TipsTripsAdvicePost['photos']>[0]) => ({
              id: parseInt(photo.id),
              photo_url: photo.photo_url,
              photo_public_id: photo.photo_public_id,
            })
          )
        );
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('Failed to load post. Please try again.');
      } finally {
        setLoadingPost(false);
      }
    };

    fetchPost();
  }, [postId, state.selectedTipsTripsAdvicePost]);

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

      // Compress images with progress tracking
      const compressionResults = await compressImages(
        files,
        {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.85,
          format: 'jpeg',
          maxSizeKB: 2048, // 2MB target
        },
        (completed, total) => {
          setCompressionProgress(Math.round((completed / total) * 100));
        }
      );

      // Create new photos with compression info
      const newPhotos = compressionResults.map((result) => ({
        file: result.file,
        preview: URL.createObjectURL(result.file),
        compression: result,
      }));

      setPhotos((prev) => [...prev, ...newPhotos]);

      // Log compression results
      compressionResults.forEach((result, index) => {
        console.log(`Photo ${index + 1} compressed:`, {
          originalSize: formatFileSize(result.originalSize),
          compressedSize: formatFileSize(result.compressedSize),
          compressionRatio: `${result.compressionRatio}%`,
          dimensions: `${result.dimensions.original.width}x${result.dimensions.original.height} → ${result.dimensions.compressed.width}x${result.dimensions.compressed.height}`,
        });
      });
    } catch (error) {
      console.error('Error compressing images:', error);
      setError('Failed to compress images. Please try again.');
    } finally {
      setCompressing(false);
      setCompressionProgress(0);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    if (!postId) {
      setError('Post ID is missing');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Handle photo updates
      const newPhotos = photos.map((photo) => photo.file);
      const hasNewPhotos = newPhotos.length > 0;
      const hasDeletedPhotos = existingPhotos.length > 0; // If we started with photos but now have fewer

      const updateData: UpdatePostData = {
        title: formData.title,
        description: formData.description,
        post_type: formData.post_type,
        ...(hasNewPhotos && { photos: newPhotos }), // New photos to add
        ...(hasDeletedPhotos && {
          existingPhotoIds: existingPhotos.map((p) => p.id),
        }), // Photos to keep
      };

      console.log('Frontend sending update data:', {
        title: updateData.title,
        description: updateData.description,
        post_type: updateData.post_type,
        hasNewPhotos,
        newPhotosCount: newPhotos.length,
        hasDeletedPhotos,
        existingPhotosCount: existingPhotos.length,
        existingPhotoIds: existingPhotos.map((p) => p.id),
      });

      await adminTipsTripsAdviceService.updatePost(postId, updateData);
      navigate('/admin/tipsTripsAndAdvice');
    } catch (err) {
      console.error('Error updating post:', err);
      setError('Failed to update post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/admin/tipsTripsAndAdvice');
  };

  if (loadingPost) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Post not found</p>
        <Button onClick={handleBack} variant="primary">
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <button
            onClick={handleBack}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Post</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          {/* Post Type */}
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

          {/* Title */}
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

          {/* Description */}
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

          {/* Existing Photos */}
          {existingPhotos.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Photos
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {existingPhotos.map((photo, index) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photo.photo_url}
                      alt={`Existing content ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Photos */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add New Photos (Optional)
            </label>
            <div className="space-y-4">
              {/* Photo Upload Button */}
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <PhotoIcon className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> new
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

              {/* Compression Progress */}
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

              {/* New Photo Previews */}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo.preview}
                        alt={`New content ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>

                      {/* Compression Info */}
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

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Buttons */}
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
              {loading ? 'Updating...' : 'Update Post'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditTipsTripsAdviceScreen;
