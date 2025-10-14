import pool from '../db/config';
import { v4 as uuidv4 } from 'uuid';
import { emailService, NewReportEmailData } from './emailService';

export interface Report {
  id: number;
  report_id: string;
  reporter_id: string;
  target_type: 'job' | 'meetup';
  target_id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'removed';
  created_at: Date;
  updated_at: Date;
}

export interface CreateReportData {
  reporter_id: string;
  target_type: 'job' | 'meetup';
  target_id: string;
  reason: string;
}

export interface UpdateReportData {
  status?: 'pending' | 'resolved' | 'removed';
}

export interface SearchReportsParams {
  limit?: number;
  offset?: number;
  status?: 'pending' | 'resolved' | 'removed';
  target_type?: 'job' | 'meetup';
  reporter_id?: string;
  search?: string; // Search by report_id or reason text
  date_from?: string;
  date_to?: string;
  sort_by?: 'created_at' | 'updated_at' | 'status';
  sort_order?: 'asc' | 'desc';
}

class ReportService {
  // Create a new report with de-duplication
  async createReport(data: CreateReportData): Promise<Report> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if there's already an open report for this target by this reporter
      const existingReport = await client.query(
        `SELECT id, status FROM reports 
         WHERE reporter_id = $1 AND target_type = $2 AND target_id = $3 AND status = 'pending'`,
        [data.reporter_id, data.target_type, data.target_id]
      );

      if (existingReport.rows.length > 0) {
        // Return existing pending report instead of creating duplicate
        const report = await this.getReportById(existingReport.rows[0].id);
        await client.query('COMMIT');
        return report;
      }

      // Create new report
      const reportId = uuidv4();
      const result = await client.query(
        `INSERT INTO reports (report_id, reporter_id, target_type, target_id, reason)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          reportId,
          data.reporter_id,
          data.target_type,
          data.target_id,
          data.reason,
        ]
      );

      // TODO: Add audit trail entry for creation when audit trail table is implemented

      await client.query('COMMIT');

      // Send email notification to admin for new report
      try {
        const emailData: NewReportEmailData = {
          reportId: reportId,
          reporterId: data.reporter_id,
          targetType: data.target_type,
          targetId: data.target_id,
          reason: data.reason,
          reportedAt: new Date(),
        };

        // Send email asynchronously (don't wait for it)
        emailService.sendNewReportNotification(emailData).catch((error) => {
          console.error('Failed to send new report notification email:', error);
        });

        console.log(
          `📧 New report notification email queued for report ${reportId}`
        );
      } catch (emailError) {
        // Don't fail the report creation if email fails
        console.error(
          'Error preparing new report notification email:',
          emailError
        );
      }

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get report by ID
  async getReportById(id: number): Promise<Report> {
    const result = await pool.query('SELECT * FROM reports WHERE id = $1', [
      id,
    ]);
    if (result.rows.length === 0) {
      throw new Error('Report not found');
    }
    return result.rows[0];
  }

  // Get report by report_id (UUID)
  async getReportByReportId(reportId: string): Promise<Report> {
    const result = await pool.query(
      'SELECT * FROM reports WHERE report_id = $1',
      [reportId]
    );
    if (result.rows.length === 0) {
      throw new Error('Report not found');
    }
    return result.rows[0];
  }

  // Get report (audit trail functionality to be added later)
  async getReport(reportId: string): Promise<Report> {
    const reportResult = await pool.query(
      'SELECT * FROM reports WHERE report_id = $1',
      [reportId]
    );
    if (reportResult.rows.length === 0) {
      throw new Error('Report not found');
    }

    return reportResult.rows[0];
  }

  // Search reports with pagination and filters
  async searchReports(
    params: SearchReportsParams = {}
  ): Promise<{ reports: Report[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      status,
      target_type,
      reporter_id,
      search,
      date_from,
      date_to,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = params;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (target_type) {
      whereConditions.push(`target_type = $${paramIndex}`);
      queryParams.push(target_type);
      paramIndex++;
    }

    if (reporter_id) {
      whereConditions.push(`reporter_id = $${paramIndex}`);
      queryParams.push(reporter_id);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(
        `(report_id::text ILIKE $${paramIndex} OR reason ILIKE $${paramIndex})`
      );
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (date_from) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(date_to);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM reports ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const dataQuery = `
      SELECT * FROM reports 
      ${whereClause}
      ORDER BY ${sort_by} ${sort_order.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const dataResult = await pool.query(dataQuery, queryParams);

    return {
      reports: dataResult.rows,
      total,
    };
  }

  // Update report status (admin only)
  async updateReportStatus(
    reportId: string,
    status: 'resolved' | 'removed',
    adminId: string,
    notes?: string
  ): Promise<Report> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update report status
      const result = await client.query(
        'UPDATE reports SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE report_id = $2 RETURNING *',
        [status, reportId]
      );

      if (result.rows.length === 0) {
        throw new Error('Report not found');
      }

      // TODO: Add audit trail entry when audit trail table is implemented

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get reports by reporter (user can only see their own reports)
  async getReportsByReporter(reporterId: string): Promise<Report[]> {
    const result = await pool.query(
      'SELECT * FROM reports WHERE reporter_id = $1 ORDER BY created_at DESC',
      [reporterId]
    );
    return result.rows;
  }

  // Get report statistics for admin dashboard
  async getReportStats(): Promise<{
    total_reports: number;
    pending_reports: number;
    resolved_reports: number;
    removed_reports: number;
    reports_this_week: number;
    reports_this_month: number;
  }> {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_reports,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reports,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_reports,
        COUNT(CASE WHEN status = 'removed' THEN 1 END) as removed_reports,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as reports_this_week,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as reports_this_month
      FROM reports
    `);

    return result.rows[0];
  }

  // Check if user can access report (reporter or admin)
  async canAccessReport(
    reportId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<boolean> {
    if (isAdmin) return true;

    const result = await pool.query(
      'SELECT reporter_id FROM reports WHERE report_id = $1',
      [reportId]
    );

    return result.rows.length > 0 && result.rows[0].reporter_id === userId;
  }
}

export const reportService = new ReportService();
