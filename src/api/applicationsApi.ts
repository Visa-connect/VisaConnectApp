import { apiGet, apiPost, apiPut, apiDelete } from './index';

export interface JobApplication {
  id: string;
  job_id: string;
  user_id: string;
  qualifications: string;
  location: string;
  visa_type: string | null;
  start_date: string;
  resume_url: string | null;
  resume_filename: string | null;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface JobApplicationWithDetails extends JobApplication {
  job_title: string;
  business_name: string;
  user_first_name: string | null;
  user_last_name: string | null;
  user_email: string | null;
}

export interface ApplicationSubmission {
  job_id: string;
  qualifications: string;
  location: string;
  visa_type: string;
  start_date: string;
  resume_url?: string;
  resume_filename?: string;
}

export interface ApplicationsResponse {
  success: boolean;
  data: JobApplicationWithDetails[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ApplicationResponse {
  success: boolean;
  data: JobApplicationWithDetails;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  reviewed: number;
  accepted: number;
  rejected: number;
}

export class ApplicationsApiService {
  /**
   * Submit a new job application
   */
  static async submitApplication(
    applicationData: ApplicationSubmission
  ): Promise<ApplicationResponse> {
    return apiPost<ApplicationResponse>('/api/applications', applicationData);
  }

  /**
   * Get applications for a specific job
   */
  static async getJobApplications(
    jobId: string,
    filters: {
      status?: string;
      limit?: number;
      offset?: number;
      order_by?: string;
      order_direction?: string;
    } = {}
  ): Promise<ApplicationsResponse> {
    const params = new URLSearchParams();
    params.append('job_id', jobId.toString());

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = queryString
      ? `/api/applications/job/${jobId}?${queryString}`
      : `/api/applications/job/${jobId}`;

    return apiGet<ApplicationsResponse>(url);
  }

  /**
   * Check if user has applied to specific jobs (bulk check)
   */
  static async checkAppliedJobs(jobIds: string[]): Promise<{
    success: boolean;
    data: string[];
  }> {
    const response = await apiPost<{ success: boolean; data: string[] }>(
      '/api/applications/check-applications',
      { jobIds }
    );
    return response;
  }

  /**
   * Get user's applications
   */
  static async getMyApplications(
    filters: {
      status?: string;
      limit?: number;
      offset?: number;
      order_by?: string;
      order_direction?: string;
    } = {}
  ): Promise<ApplicationsResponse> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = queryString
      ? `/api/applications/my-applications?${queryString}`
      : '/api/applications/my-applications';

    return apiGet<ApplicationsResponse>(url);
  }

  /**
   * Get application by ID
   */
  static async getApplicationById(
    applicationId: string
  ): Promise<ApplicationResponse> {
    return apiGet<ApplicationResponse>(`/api/applications/${applicationId}`);
  }

  /**
   * Update application status
   */
  static async updateApplicationStatus(
    applicationId: string,
    status: 'pending' | 'reviewed' | 'accepted' | 'rejected'
  ): Promise<ApplicationResponse> {
    return apiPut<ApplicationResponse>(
      `/api/applications/${applicationId}/status`,
      { status }
    );
  }

  /**
   * Delete application
   */
  static async deleteApplication(
    applicationId: string
  ): Promise<{ success: boolean; message: string }> {
    return apiDelete<{ success: boolean; message: string }>(
      `/api/applications/${applicationId}`
    );
  }

  /**
   * Get application statistics
   */
  static async getApplicationStats(
    businessId?: number
  ): Promise<{ success: boolean; data: ApplicationStats }> {
    const url = businessId
      ? `/api/applications/stats?business_id=${businessId}`
      : '/api/applications/stats';
    return apiGet<{ success: boolean; data: ApplicationStats }>(url);
  }

  /**
   * Check if user has applied to a job
   */
  static async hasAppliedToJob(
    jobId: string
  ): Promise<{ success: boolean; hasApplied: boolean }> {
    try {
      const response = await this.getMyApplications({ limit: 1000 });
      const hasApplied = response.data.some((app) => app.job_id === jobId);
      return { success: true, hasApplied };
    } catch (error) {
      console.error('Error checking application status:', error);
      return { success: false, hasApplied: false };
    }
  }
}
