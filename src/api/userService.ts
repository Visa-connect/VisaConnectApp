import { apiGet, apiPost, apiDelete } from './index';

export interface ThumbsUpData {
  receiver_id: string;
  chat_message_id: string;
}

export interface ThumbsUpResponse {
  success: boolean;
  message: string;
  helped_count?: number;
  already_given?: boolean;
}

export interface ThumbsUpStats {
  helped_count: number;
  thumbs_up_given: number;
}

class UserService {
  // Give a thumbs-up to a user
  async giveThumbsUp(data: ThumbsUpData): Promise<ThumbsUpResponse> {
    return apiPost<ThumbsUpResponse>('/api/user/thumbs-up', data);
  }

  // Remove a thumbs-up from a user
  async removeThumbsUp(receiverId: string): Promise<ThumbsUpResponse> {
    return apiDelete<ThumbsUpResponse>(`/api/user/thumbs-up/${receiverId}`);
  }

  // Check if user has given a thumbs-up to another user
  async hasGivenThumbsUp(
    receiverId: string
  ): Promise<{ success: boolean; has_given_thumbs_up: boolean }> {
    const response = await apiGet<{
      success: boolean;
      has_given_thumbs_up: boolean;
    }>(`/api/user/thumbs-up/${receiverId}`);
    return response;
  }

  // Get thumbs-up statistics for a user
  async getThumbsUpStats(userId: string): Promise<ThumbsUpStats> {
    const response = await apiGet<{ success: boolean; data: ThumbsUpStats }>(
      `/api/user/${userId}/thumbs-up-stats`
    );
    return response.data;
  }
}

export const userService = new UserService();
