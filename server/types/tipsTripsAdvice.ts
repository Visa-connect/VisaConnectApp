/**
 * TypeScript interfaces for Tips, Trips, and Advice system
 */

export type PostType = 'tip' | 'trip' | 'advice';

export interface TipsTripsAdvicePhoto {
  id: number;
  post_id: number;
  photo_url: string;
  photo_public_id: string;
  display_order: number;
  created_at: string;
}

export interface TipsTripsAdviceComment {
  id: number;
  post_id: number;
  user_id: string;
  comment: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
    profile_photo_url?: string;
  };
}

export interface TipsTripsAdviceLike {
  id: number;
  post_id: number;
  user_id: string;
  created_at: string;
}

export interface TipsTripsAdvice {
  id: number;
  title: string;
  description: string;
  creator_id: string;
  post_type: PostType;
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
  photos: TipsTripsAdvicePhoto[];
  comments: TipsTripsAdviceComment[];
  likes: TipsTripsAdviceLike[];
  likes_count: number;
  comments_count: number;
  is_liked?: boolean;
}

// Request/Response interfaces
export interface CreateTipsTripsAdviceRequest {
  /** Required: The title of the post (max 200 characters) */
  title: string;
  /** Required: Detailed description of the post */
  description: string;
  /** Required: Type of post - tip, trip, or advice */
  post_type: PostType;
  /** Optional: Array of photo URLs and public IDs */
  photos?: {
    photo_url: string;
    photo_public_id: string;
    display_order?: number;
  }[];
}

export interface UpdateTipsTripsAdviceRequest {
  /** Optional: The title of the post (max 200 characters) */
  title?: string;
  /** Optional: Detailed description of the post */
  description?: string;
  /** Optional: Type of post - tip, trip, or advice */
  post_type?: PostType;
  /** Optional: Array of photo URLs and public IDs */
  photos?: {
    photo_url: string;
    photo_public_id: string;
    display_order?: number;
  }[];
  /** Optional: Array of existing photo IDs to keep */
  photosToKeep?: number[];
}

export interface SearchTipsTripsAdviceRequest {
  /** Optional: Filter by post type */
  post_type?: PostType;
  /** Optional: Search term for title and description */
  search?: string;
  /** Optional: Filter by creator ID */
  creator_id?: string;
  /** Optional: Page number for pagination */
  page?: number;
  /** Optional: Number of items per page */
  limit?: number;
}

export interface TipsTripsAdviceResponse {
  success: boolean;
  data: TipsTripsAdvice;
  message?: string;
}

export interface TipsTripsAdviceListResponse {
  success: boolean;
  data: TipsTripsAdvice[];
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
    postId: number;
  };
  message?: string;
}

export interface AddCommentRequest {
  /** Required: The comment text */
  comment: string;
}

export interface CommentResponse {
  success: boolean;
  data: TipsTripsAdviceComment;
  message?: string;
}

export interface LikeResponse {
  success: boolean;
  message: string;
}
