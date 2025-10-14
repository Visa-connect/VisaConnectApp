import {
  adminApiGet,
  adminApiPost,
  adminApiPut,
  adminApiDelete,
} from './adminApi';

export interface AdminEmployer {
  id: number;
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  size?: string;
  logo_url?: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  contact_email?: string;
  phone_number?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  is_verified: boolean;
  verification_status: 'pending' | 'approved' | 'rejected';
  verification_notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  verified_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  year_formed?: number;
  submitted_at: string;
}

export interface SearchEmployersParams {
  limit?: number;
  offset?: number;
  search?: string;
  industry?: string;
  verification_status?: 'pending' | 'approved' | 'rejected';
  is_active?: boolean;
  sort_by?: 'created_at' | 'name' | 'verification_status';
  sort_order?: 'asc' | 'desc';
}

export interface UpdateEmployerData {
  name?: string;
  description?: string;
  website?: string;
  industry?: string;
  size?: string;
  contact_email?: string;
  phone_number?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  is_active?: boolean;
  verification_notes?: string;
}

export interface EmployerStats {
  total_employers: number;
  pending_verification: number;
  approved_employers: number;
  rejected_employers: number;
  active_employers: number;
  new_employers_today: number;
  new_employers_this_week: number;
  new_employers_this_month: number;
}

class AdminEmployerService {
  // Search employers with admin authentication
  async searchEmployers(
    params: SearchEmployersParams = {}
  ): Promise<{ success: boolean; data: AdminEmployer[]; total: number }> {
    const queryParams = new URLSearchParams();

    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.industry) queryParams.append('industry', params.industry);
    if (params.verification_status)
      queryParams.append('verification_status', params.verification_status);
    if (params.is_active !== undefined)
      queryParams.append('is_active', params.is_active.toString());
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);

    const url = `/api/business/admin/all${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;
    return adminApiGet<{
      success: boolean;
      data: AdminEmployer[];
      total: number;
    }>(url);
  }

  // Get employer by ID with admin authentication
  async getEmployerById(employerId: string | number): Promise<AdminEmployer> {
    return adminApiGet<AdminEmployer>(`/api/business/admin/${employerId}`);
  }

  // Update employer with admin authentication
  async updateEmployer(
    employerId: string | number,
    employerData: UpdateEmployerData
  ): Promise<AdminEmployer> {
    return adminApiPut<AdminEmployer>(
      `/api/business/admin/${employerId}`,
      employerData
    );
  }

  // Approve employer verification
  async approveEmployer(
    employerId: string | number,
    verificationNotes?: string
  ): Promise<{ success: boolean; message: string }> {
    return adminApiPost<{ success: boolean; message: string }>(
      `/api/business/admin/${employerId}/approve`,
      { verification_notes: verificationNotes }
    );
  }

  // Reject employer verification
  async rejectEmployer(
    employerId: string | number,
    rejectionReason: string,
    verificationNotes?: string
  ): Promise<{ success: boolean; message: string }> {
    return adminApiPost<{ success: boolean; message: string }>(
      `/api/business/admin/${employerId}/reject`,
      {
        rejection_reason: rejectionReason,
        verification_notes: verificationNotes,
      }
    );
  }

  // Deactivate employer
  async deactivateEmployer(
    employerId: string | number
  ): Promise<{ success: boolean; message: string }> {
    return adminApiPost<{ success: boolean; message: string }>(
      `/api/business/admin/${employerId}/deactivate`,
      {}
    );
  }

  // Activate employer
  async activateEmployer(
    employerId: string | number
  ): Promise<{ success: boolean; message: string }> {
    return adminApiPost<{ success: boolean; message: string }>(
      `/api/business/admin/${employerId}/activate`,
      {}
    );
  }

  // Delete employer
  async deleteEmployer(
    employerId: string | number
  ): Promise<{ success: boolean; message: string }> {
    return adminApiDelete<{ success: boolean; message: string }>(
      `/api/business/admin/${employerId}`
    );
  }

  // Get employer statistics
  async getEmployerStats(): Promise<EmployerStats> {
    return adminApiGet<EmployerStats>('/api/business/admin/stats');
  }

  // Send verification email to employer
  async sendVerificationEmail(
    employerId: string | number
  ): Promise<{ success: boolean; message: string }> {
    return adminApiPost<{ success: boolean; message: string }>(
      `/api/business/admin/${employerId}/send-verification`,
      {}
    );
  }

  // Get employer verification documents
  async getVerificationDocuments(
    employerId: string | number
  ): Promise<{ success: boolean; documents: any[] }> {
    return adminApiGet<{ success: boolean; documents: any[] }>(
      `/api/business/admin/${employerId}/documents`
    );
  }
}

export const adminEmployerService = new AdminEmployerService();
