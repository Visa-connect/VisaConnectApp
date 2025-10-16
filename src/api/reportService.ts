import { apiGet, apiPost } from './index';
import { adminApiGet, adminApiPost } from './adminApi';

export interface Report {
  id: number;
  report_id: string;
  reporter_id: string;
  target_type: 'job' | 'meetup';
  target_id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'removed';
  created_at: string;
  updated_at: string;
}

export interface CreateReportData {
  target_type: 'job' | 'meetup';
  target_id: string;
  reason: string;
}

export interface ReportStats {
  total_reports: number;
  pending_reports: number;
  resolved_reports: number;
  removed_reports: number;
  reports_this_week: number;
  reports_this_month: number;
}

export interface ReportTargetDetails {
  target_type: 'job' | 'meetup';
  job?: any;
  meetup?: any;
  poster?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    profile_photo_url?: string | null;
  } | null;
}

export interface SearchReportsParams {
  limit?: number;
  offset?: number;
  status?: 'pending' | 'resolved' | 'removed';
  target_type?: 'job' | 'meetup';
  reporter_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: 'created_at' | 'updated_at' | 'status';
  sort_order?: 'asc' | 'desc';
}

export interface ModerateReportData {
  notes?: string;
}

class ReportService {
  // User: Create a report
  async createReport(data: CreateReportData): Promise<Report> {
    return apiPost<Report>('/api/reports', data);
  }

  // User: Get their own reports
  async getMyReports(): Promise<Report[]> {
    const response = await apiGet<{ success: boolean; data: Report[] }>(
      '/api/reports/my-reports'
    );
    return response.data;
  }

  // User: Get specific report detail (only their own)
  async getReport(reportId: string): Promise<Report> {
    const response = await apiGet<{ success: boolean; data: Report }>(
      `/api/reports/${reportId}`
    );
    return response.data;
  }

  // Admin: Get all reports with pagination and filters
  async searchReports(
    params: SearchReportsParams = {}
  ): Promise<{ success: boolean; data: Report[]; total: number }> {
    const queryParams = new URLSearchParams();

    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.target_type)
      queryParams.append('target_type', params.target_type);
    if (params.reporter_id)
      queryParams.append('reporter_id', params.reporter_id);
    if (params.search) queryParams.append('search', params.search);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);

    const url = `/api/admin/reports${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;
    return adminApiGet<{ success: boolean; data: Report[]; total: number }>(
      url
    );
  }

  // Admin: Get report statistics
  async getReportStats(): Promise<ReportStats> {
    const response = await adminApiGet<{ success: boolean; data: ReportStats }>(
      '/api/admin/reports/stats'
    );
    return response.data;
  }

  // Admin: Get specific report
  async getAdminReport(reportId: string): Promise<Report> {
    const response = await adminApiGet<{
      success: boolean;
      data: Report;
    }>(`/api/admin/reports/${reportId}`);
    return response.data;
  }

  // Admin: Resolve report (keep post)
  async resolveReport(
    reportId: string,
    data: ModerateReportData = {}
  ): Promise<Report> {
    const response = await adminApiPost<{ success: boolean; data: Report }>(
      `/api/admin/reports/${reportId}/resolve`,
      data
    );
    return response.data;
  }

  // Admin: Remove report (remove post)
  async removeReport(
    reportId: string,
    data: ModerateReportData = {}
  ): Promise<Report> {
    const response = await adminApiPost<{ success: boolean; data: Report }>(
      `/api/admin/reports/${reportId}/remove`,
      data
    );
    return response.data;
  }

  // Admin: Get report target details (job/meetup + poster)
  async getReportTargetDetails(reportId: string): Promise<ReportTargetDetails> {
    const response = await adminApiGet<{
      success: boolean;
      data: ReportTargetDetails;
    }>(`/api/admin/reports/${reportId}/target`);
    return response.data;
  }
}

export const reportService = new ReportService();
