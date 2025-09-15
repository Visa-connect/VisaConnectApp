import { apiGet, apiPost, apiPut, apiDelete } from './index';

// Business types
export interface BusinessSubmission {
  businessName: string;
  yearFormed: number;
  ownerName: string;
  businessAddress?: string;
  missionStatement: string;
  logoUrl?: string;
  logoPublicId?: string;
}

export interface Business {
  id: number;
  user_id: string;
  category_id?: number;
  name: string;
  description?: string;
  address?: string;
  website?: string;
  verified: boolean;
  year_formed?: number;
  owner_name?: string;
  mission_statement?: string;
  logo_url?: string;
  logo_public_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessCategory {
  id: number;
  name: string;
  description?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

// Business API service
export class BusinessApiService {
  /**
   * Submit a new business for verification
   */
  static async submitBusiness(
    businessData: BusinessSubmission
  ): Promise<ApiResponse<Business>> {
    return apiPost<ApiResponse<Business>>('/api/business/submit', businessData);
  }

  /**
   * Get user's businesses
   */
  static async getUserBusinesses(): Promise<ApiResponse<Business[]>> {
    return apiGet<ApiResponse<Business[]>>('/api/business/user');
  }

  /**
   * Get business by ID
   */
  static async getBusinessById(
    businessId: number
  ): Promise<ApiResponse<Business>> {
    return apiGet<ApiResponse<Business>>(`/api/business/${businessId}`);
  }

  /**
   * Update business
   */
  static async updateBusiness(
    businessId: number,
    updateData: Partial<BusinessSubmission>
  ): Promise<ApiResponse<Business>> {
    return apiPut<ApiResponse<Business>>(
      `/api/business/${businessId}`,
      updateData
    );
  }

  /**
   * Delete business
   */
  static async deleteBusiness(businessId: number): Promise<ApiResponse<void>> {
    return apiDelete<ApiResponse<void>>(`/api/business/${businessId}`);
  }

  /**
   * Get business categories
   */
  static async getBusinessCategories(): Promise<
    ApiResponse<BusinessCategory[]>
  > {
    return apiGet<ApiResponse<BusinessCategory[]>>('/api/business/categories');
  }

  /**
   * Admin: Get pending businesses
   */
  static async getPendingBusinesses(): Promise<ApiResponse<Business[]>> {
    return apiGet<ApiResponse<Business[]>>('/api/business/admin/pending');
  }

  /**
   * Admin: Update business status
   */
  static async updateBusinessStatus(
    businessId: number,
    status: 'approved' | 'rejected',
    adminNotes?: string
  ): Promise<ApiResponse<Business>> {
    return apiPut<ApiResponse<Business>>(
      `/api/business/admin/${businessId}/status`,
      {
        status,
        adminNotes,
      }
    );
  }
}

// Export individual functions for convenience
export const {
  submitBusiness,
  getUserBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  getBusinessCategories,
  getPendingBusinesses,
  updateBusinessStatus,
} = BusinessApiService;
