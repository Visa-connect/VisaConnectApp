import {
  adminApiGet,
  adminApiPost,
  adminApiPut,
  adminApiDelete,
} from './adminApi';

export interface AdminUser {
  id: string;
  firebase_uid: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  date_of_birth?: string;
  nationality?: string;
  visa_type?: string;
  current_location?:
    | string
    | {
        city?: string;
        state?: string;
        country?: string;
      };
  occupation?: string;
  profile_photo_url?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  email_verified: boolean;
  phone_verified: boolean;
  admin_notes?: string;
}

export interface SearchUsersParams {
  limit?: number;
  offset?: number;
  search?: string;
  visa_type?: string;
  nationality?: string;
  is_active?: boolean;
  is_verified?: boolean;
  sort_by?: 'created_at' | 'last_login_at' | 'first_name' | 'email';
  sort_order?: 'asc' | 'desc';
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  date_of_birth?: string;
  nationality?: string;
  visa_type?: string;
  current_location?: string;
  occupation?: string;
  is_active?: boolean;
  is_verified?: boolean;
  admin_notes?: string;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  verified_users: number;
  new_users_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
}

class AdminUserService {
  // Search users with admin authentication
  async searchUsers(
    params: SearchUsersParams = {}
  ): Promise<{ success: boolean; data: AdminUser[]; total: number }> {
    const queryParams = new URLSearchParams();

    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.visa_type) queryParams.append('visa_type', params.visa_type);
    if (params.nationality)
      queryParams.append('nationality', params.nationality);
    if (params.is_active !== undefined)
      queryParams.append('is_active', params.is_active.toString());
    if (params.is_verified !== undefined)
      queryParams.append('is_verified', params.is_verified.toString());
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);

    const url = `/api/admin/users${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;
    return adminApiGet<{ success: boolean; data: AdminUser[]; total: number }>(
      url
    );
  }

  // Get user by ID with admin authentication
  async getUserById(userId: string): Promise<AdminUser> {
    return adminApiGet<AdminUser>(`/api/admin/users/${userId}`);
  }

  // Update user with admin authentication
  async updateUser(
    userId: string,
    userData: UpdateUserData
  ): Promise<AdminUser> {
    return adminApiPut<AdminUser>(`/api/admin/users/${userId}`, userData);
  }

  // Deactivate user with admin authentication
  async deactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return adminApiPost<{ success: boolean; message: string }>(
      `/api/admin/users/${userId}/deactivate`,
      {}
    );
  }

  // Activate user with admin authentication
  async activateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return adminApiPost<{ success: boolean; message: string }>(
      `/api/admin/users/${userId}/activate`,
      {}
    );
  }

  // Verify user with admin authentication
  async verifyUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return adminApiPost<{ success: boolean; message: string }>(
      `/api/admin/users/${userId}/verify`,
      {}
    );
  }

  // Delete user with admin authentication
  async deleteUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return adminApiDelete<{ success: boolean; message: string }>(
      `/api/admin/users/${userId}`
    );
  }

  // Get user statistics
  async getUserStats(): Promise<UserStats> {
    return adminApiGet<UserStats>('/api/admin/users/stats');
  }

  // Send verification email to user
  async sendVerificationEmail(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return adminApiPost<{ success: boolean; message: string }>(
      `/api/admin/users/${userId}/send-verification`,
      {}
    );
  }

  // Reset user password (admin initiated)
  async resetUserPassword(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return adminApiPost<{ success: boolean; message: string }>(
      `/api/admin/users/${userId}/reset-password`,
      {}
    );
  }
}

export const adminUserService = new AdminUserService();
export default adminUserService;
