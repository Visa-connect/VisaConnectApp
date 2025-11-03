import { apiGet, apiPost, apiPut, apiDelete } from './index';

// Types for Tips, Trips, and Advice
export interface TipsTripsAdvicePost {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  post_type: 'tip' | 'trip' | 'advice';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  creator: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
    profile_photo_url?: string;
  };
  photos: {
    id: number;
    post_id: string;
    photo_url: string;
    photo_public_id: string;
    display_order: number;
    created_at: string;
  }[];
  comments: any[];
  likes: any[];
  likes_count: number;
  comments_count: number;
  is_liked?: boolean;
}

export interface CreateTipsTripsAdviceRequest {
  title: string;
  description: string;
  post_type: 'tip' | 'trip' | 'advice';
  photos?: {
    photo_url: string;
    photo_public_id: string;
    display_order?: number;
  }[];
}

export interface UpdateTipsTripsAdviceRequest {
  title?: string;
  description?: string;
  post_type?: 'tip' | 'trip' | 'advice';
  photos?: {
    photo_url: string;
    photo_public_id: string;
    display_order?: number;
  }[];
}

export interface SearchTipsTripsAdviceRequest {
  post_type?: 'tip' | 'trip' | 'advice';
  search?: string;
  creator_id?: string;
  page?: number;
  limit?: number;
}

export interface TipsTripsAdviceResponse {
  success: boolean;
  data: TipsTripsAdvicePost;
  message?: string;
}

export interface TipsTripsAdviceListResponse {
  success: boolean;
  data: TipsTripsAdvicePost[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  message?: string;
}

export interface CreateTipsTripsAdviceResponse {
  success: boolean;
  data: {
    postId: string;
  };
  message?: string;
}

export interface CommentRequest {
  comment: string;
}

export interface CommentResponse {
  success: boolean;
  data: any;
  message?: string;
}

export interface LikeResponse {
  success: boolean;
  data: {
    liked: boolean;
  };
  message?: string;
}

class TipsTripsAdviceService {
  // Create a new post
  async createPost(postData: CreateTipsTripsAdviceRequest): Promise<string> {
    const response: CreateTipsTripsAdviceResponse = await apiPost(
      '/api/tips-trips-advice',
      postData
    );
    return response.data.postId;
  }

  // Get a single post by ID
  async getPostById(postId: string): Promise<TipsTripsAdvicePost> {
    const response: TipsTripsAdviceResponse = await apiGet(
      `/api/tips-trips-advice/${postId}`
    );
    return response.data;
  }

  // Search posts with filters
  async searchPosts(
    searchParams: SearchTipsTripsAdviceRequest
  ): Promise<TipsTripsAdvicePost[]> {
    const queryParams = new URLSearchParams();

    if (searchParams.post_type) {
      queryParams.append('post_type', searchParams.post_type);
    }
    if (searchParams.search) {
      queryParams.append('search', searchParams.search);
    }
    if (searchParams.creator_id) {
      queryParams.append('creator_id', searchParams.creator_id);
    }
    if (searchParams.page) {
      queryParams.append('page', searchParams.page.toString());
    }
    if (searchParams.limit) {
      queryParams.append('limit', searchParams.limit.toString());
    }

    const response: TipsTripsAdviceListResponse = await apiGet(
      `/api/tips-trips-advice?${queryParams.toString()}`
    );
    return response.data;
  }

  // Update a post
  async updatePost(
    postId: string,
    updateData: UpdateTipsTripsAdviceRequest
  ): Promise<void> {
    await apiPut(`/api/tips-trips-advice/${postId}`, updateData);
  }

  // Delete a post
  async deletePost(postId: string): Promise<void> {
    await apiDelete(`/api/tips-trips-advice/${postId}`);
  }

  // Add a comment to a post
  async addComment(postId: string, comment: string): Promise<any> {
    const response: CommentResponse = await apiPost(
      `/api/tips-trips-advice/${postId}/comments`,
      { comment }
    );
    return response.data;
  }

  // Like/unlike a post
  async toggleLike(postId: string): Promise<{ liked: boolean }> {
    const response: LikeResponse = await apiPost(
      `/api/tips-trips-advice/${postId}/like`,
      {}
    );
    return response.data;
  }

  // Get user's posts
  async getUserPosts(
    postType?: 'tip' | 'trip' | 'advice'
  ): Promise<TipsTripsAdvicePost[]> {
    const queryParams = new URLSearchParams();
    if (postType) {
      queryParams.append('post_type', postType);
    }

    const response: TipsTripsAdviceListResponse = await apiGet(
      `/api/tips-trips-advice/user/posts?${queryParams.toString()}`
    );
    return response.data;
  }
}

export const tipsTripsAdviceService = new TipsTripsAdviceService();
