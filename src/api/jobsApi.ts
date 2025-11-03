import { apiGet, apiPost, apiPut, apiDelete } from './index';

export interface Job {
  id: string;
  business_id: number;
  title: string;
  description: string;
  location: string;
  job_type: 'hourly' | 'fixed';
  rate_from: number | null;
  rate_to: number | null;
  business_logo_url: string | null;
  status: 'active' | 'paused' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface JobWithBusiness extends Job {
  business_name: string;
  business_address: string | null;
  business_website: string | null;
  business_owner_name: string | null;
}

export interface JobSubmission {
  business_id: number;
  title: string;
  description: string;
  location: string;
  job_type: 'hourly' | 'fixed';
  rate_from: number | null;
  rate_to: number | null;
  business_logo_url?: string;
}

export interface JobFilters {
  status?: 'active' | 'paused' | 'closed';
  job_type?: 'hourly' | 'fixed';
  location?: string;
  business_id?: number;
  limit?: number;
  offset?: number;
  order_by?: 'created_at' | 'title' | 'rate_from';
  order_direction?: 'ASC' | 'DESC';
}

export interface JobsResponse {
  success: boolean;
  data: JobWithBusiness[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface JobResponse {
  success: boolean;
  data: JobWithBusiness;
}

export interface JobStats {
  total: number;
  active: number;
  paused: number;
  closed: number;
}

export class JobsApiService {
  /**
   * Create a new job posting
   */
  static async createJob(jobData: JobSubmission): Promise<JobResponse> {
    return apiPost<JobResponse>('/api/jobs', jobData);
  }

  /**
   * Get all jobs with optional filtering
   */
  static async getAllJobs(filters: JobFilters = {}): Promise<JobsResponse> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = queryString ? `/api/jobs?${queryString}` : '/api/jobs';

    return apiGet<JobsResponse>(url);
  }

  /**
   * Get job by ID
   */
  static async getJobById(jobId: string): Promise<JobResponse> {
    return apiGet<JobResponse>(`/api/jobs/${jobId}`);
  }

  /**
   * Get jobs by business ID
   */
  static async getJobsByBusiness(
    businessId: number,
    filters: Omit<JobFilters, 'business_id'> = {}
  ): Promise<JobsResponse> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = queryString
      ? `/api/jobs/business/${businessId}?${queryString}`
      : `/api/jobs/business/${businessId}`;

    return apiGet<JobsResponse>(url);
  }

  /**
   * Update job details
   */
  static async updateJob(
    jobId: string,
    jobData: Partial<JobSubmission>
  ): Promise<JobResponse> {
    return apiPut<JobResponse>(`/api/jobs/${jobId}`, jobData);
  }

  /**
   * Update job status
   */
  static async updateJobStatus(
    jobId: string,
    status: 'active' | 'paused' | 'closed'
  ): Promise<JobResponse> {
    return apiPut<JobResponse>(`/api/jobs/${jobId}/status`, { status });
  }

  /**
   * Delete job
   */
  static async deleteJob(
    jobId: string
  ): Promise<{ success: boolean; message: string }> {
    return apiDelete<{ success: boolean; message: string }>(
      `/api/jobs/${jobId}`
    );
  }

  /**
   * Get job statistics (admin only)
   */
  static async getJobStats(
    businessId?: number
  ): Promise<{ success: boolean; data: JobStats }> {
    const url = businessId
      ? `/api/jobs/admin/stats?business_id=${businessId}`
      : '/api/jobs/admin/stats';
    return apiGet<{ success: boolean; data: JobStats }>(url);
  }
}
