import {
  adminApiGet,
  adminApiPost,
  adminApiPostFormData,
  adminApiPutFormData,
  adminApiDelete,
} from './adminApi';

export interface TipsTripsAdvicePhoto {
  id: string;
  photo_url: string;
  photo_public_id: string;
}

export interface TipsTripsAdvicePost {
  id: string;
  title: string;
  description: string;
  post_type: 'tip' | 'trip' | 'advice';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  creator: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    profile_photo_url: string | null;
  };
  photos?: TipsTripsAdvicePhoto[];
  likes_count: number;
  comments_count: number;
  is_liked?: boolean;
}

export interface SearchPostsParams {
  limit?: number;
  offset?: number;
  post_type?: 'tip' | 'trip' | 'advice';
  search?: string;
  is_active?: boolean;
}

export interface CreatePostData {
  title: string;
  description: string;
  post_type: 'tip' | 'trip' | 'advice';
  photos?: File[];
}

export interface UpdatePostData {
  title?: string;
  description?: string;
  post_type?: 'tip' | 'trip' | 'advice';
  is_active?: boolean;
  photos?: File[]; // New photos to add
  existingPhotoIds?: number[]; // IDs of existing photos to keep
}

class AdminTipsTripsAdviceService {
  // Search posts with admin authentication
  async searchPosts(
    params: SearchPostsParams = {}
  ): Promise<{ success: boolean; data: TipsTripsAdvicePost[] }> {
    const queryParams = new URLSearchParams();

    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.post_type) queryParams.append('post_type', params.post_type);
    if (params.search) queryParams.append('search', params.search);
    if (params.is_active !== undefined)
      queryParams.append('is_active', params.is_active.toString());

    const url = `/api/tips-trips-advice${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;
    return adminApiGet<{ success: boolean; data: TipsTripsAdvicePost[] }>(url);
  }

  // Get post by ID with admin authentication
  async getPostById(postId: string): Promise<TipsTripsAdvicePost> {
    return adminApiGet<TipsTripsAdvicePost>(
      `/api/admin/tips-trips-advice/${postId}`
    );
  }

  // Create new post with admin authentication
  async createPost(postData: CreatePostData): Promise<TipsTripsAdvicePost> {
    // Check if we have photos (File objects)
    const hasPhotos = postData.photos && postData.photos.length > 0;

    if (hasPhotos) {
      // Use FormData for file uploads
      const formData = new FormData();
      formData.append('title', postData.title);
      formData.append('description', postData.description);
      formData.append('post_type', postData.post_type);

      postData.photos?.forEach((photo) => {
        formData.append('photos', photo);
      });

      return adminApiPostFormData<TipsTripsAdvicePost>(
        '/api/admin/tips-trips-advice',
        formData
      );
    } else {
      // Use JSON for posts without photos
      return adminApiPost<TipsTripsAdvicePost>(
        '/api/admin/tips-trips-advice',
        postData
      );
    }
  }

  // Update post with admin authentication
  async updatePost(
    postId: string,
    postData: UpdatePostData
  ): Promise<TipsTripsAdvicePost> {
    // Always use FormData since the backend expects multipart/form-data
    const formData = new FormData();
    if (postData.title) formData.append('title', postData.title);
    if (postData.description)
      formData.append('description', postData.description);
    if (postData.post_type) formData.append('post_type', postData.post_type);
    if (postData.is_active !== undefined)
      formData.append('is_active', postData.is_active.toString());

    // Add new photos if provided
    if (postData.photos && postData.photos.length > 0) {
      postData.photos.forEach((photo) => {
        formData.append('photos', photo);
      });
    }

    // Add existing photo IDs to keep
    if (postData.existingPhotoIds && postData.existingPhotoIds.length > 0) {
      postData.existingPhotoIds.forEach((photoId) => {
        formData.append('existingPhotoIds', photoId.toString());
      });
    }

    return adminApiPutFormData<TipsTripsAdvicePost>(
      `/api/admin/tips-trips-advice/${postId}`,
      formData
    );
  }

  // Delete post with admin authentication
  async deletePost(
    postId: string
  ): Promise<{ success: boolean; message: string }> {
    return adminApiDelete<{ success: boolean; message: string }>(
      `/api/admin/tips-trips-advice/${postId}`
    );
  }

  // Add comment with admin authentication
  async addComment(
    postId: string,
    content: string
  ): Promise<{ success: boolean; comment: any }> {
    return adminApiPost<{ success: boolean; comment: any }>(
      `/api/tips-trips-advice/${postId}/comments`,
      { content }
    );
  }

  // Toggle like with admin authentication
  async toggleLike(
    postId: string
  ): Promise<{ success: boolean; is_liked: boolean; likes_count: number }> {
    return adminApiPost<{
      success: boolean;
      is_liked: boolean;
      likes_count: number;
    }>(`/api/tips-trips-advice/${postId}/like`, {});
  }
}

export const adminTipsTripsAdviceService = new AdminTipsTripsAdviceService();
