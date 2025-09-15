import {
  adminApiGet,
  adminApiPost,
  adminApiPut,
  adminApiDelete,
} from './adminApi';

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
  photos?: {
    id: string;
    url: string;
    public_id: string;
  }[];
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
  photos?: File[];
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
    return adminApiGet<TipsTripsAdvicePost>(`/api/tips-trips-advice/${postId}`);
  }

  // Create new post with admin authentication
  async createPost(postData: CreatePostData): Promise<TipsTripsAdvicePost> {
    return adminApiPost<TipsTripsAdvicePost>(
      '/api/tips-trips-advice',
      postData
    );
  }

  // Update post with admin authentication
  async updatePost(
    postId: string,
    postData: UpdatePostData
  ): Promise<TipsTripsAdvicePost> {
    return adminApiPut<TipsTripsAdvicePost>(
      `/api/tips-trips-advice/${postId}`,
      postData
    );
  }

  // Delete post with admin authentication
  async deletePost(
    postId: string
  ): Promise<{ success: boolean; message: string }> {
    return adminApiDelete<{ success: boolean; message: string }>(
      `/api/tips-trips-advice/${postId}`
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
export default adminTipsTripsAdviceService;
