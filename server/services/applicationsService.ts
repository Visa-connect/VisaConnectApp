import pool from '../db/config';
import { emailService, JobApplicationEmailData } from './emailService';

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
  created_at: Date;
  updated_at: Date;
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
  user_id: string;
  qualifications: string;
  location: string;
  visa_type?: string;
  start_date: string;
  resume_url?: string;
  resume_filename?: string;
}

export interface ApplicationFilters {
  job_id?: string;
  user_id?: string;
  status?: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  business_id?: number;
  limit?: number;
  offset?: number;
  order_by?: 'created_at' | 'status' | 'user_id';
  order_direction?: 'ASC' | 'DESC';
}

export class ApplicationsService {
  /**
   * Create a new job application
   */
  async createApplication(
    applicationData: ApplicationSubmission
  ): Promise<JobApplication> {
    const query = `
      INSERT INTO job_applications (
        job_id, user_id, qualifications, location, visa_type, 
        start_date, resume_url, resume_filename
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      applicationData.job_id,
      applicationData.user_id,
      applicationData.qualifications,
      applicationData.location,
      applicationData.visa_type || null,
      applicationData.start_date,
      applicationData.resume_url || null,
      applicationData.resume_filename || null,
    ];

    const result = await pool.query(query, values);
    const application = result.rows[0];

    // Send email notifications asynchronously
    this.sendApplicationEmails(application).catch((error) => {
      console.error('Failed to send application emails:', error);
    });

    return application;
  }

  /**
   * Get application by ID
   */
  async getApplicationById(
    applicationId: string
  ): Promise<JobApplicationWithDetails | null> {
    const query = `
      SELECT 
        ja.*,
        j.title as job_title,
        b.name as business_name,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.email as user_email
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      JOIN businesses b ON j.business_id = b.id
      LEFT JOIN users u ON ja.user_id = u.id
      WHERE ja.id = $1
    `;

    const result = await pool.query(query, [applicationId]);
    return result.rows[0] || null;
  }

  /**
   * Get applications with optional filtering and pagination
   */
  async getApplications(
    filters: ApplicationFilters = {}
  ): Promise<{ applications: JobApplicationWithDetails[]; total: number }> {
    const {
      job_id,
      user_id,
      status,
      business_id,
      limit = 20,
      offset = 0,
      order_by = 'created_at',
      order_direction = 'DESC',
    } = filters;

    // Validate order parameters
    const validOrderBy = ['created_at', 'status', 'user_id'].includes(order_by)
      ? order_by
      : 'created_at';
    const validOrderDirection = ['ASC', 'DESC'].includes(order_direction)
      ? order_direction
      : 'DESC';

    // Build WHERE clause
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramCount = 0;

    if (job_id) {
      whereConditions.push(`ja.job_id = $${++paramCount}`);
      queryParams.push(job_id);
    }

    if (user_id) {
      whereConditions.push(`ja.user_id = $${++paramCount}`);
      queryParams.push(user_id);
    }

    if (status) {
      whereConditions.push(`ja.status = $${++paramCount}`);
      queryParams.push(status);
    }

    if (business_id) {
      whereConditions.push(`j.business_id = $${++paramCount}`);
      queryParams.push(business_id);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Main query
    const mainQuery = `
      SELECT 
        ja.*,
        j.title as job_title,
        b.name as business_name,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.email as user_email
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      JOIN businesses b ON j.business_id = b.id
      LEFT JOIN users u ON ja.user_id = u.id
      ${whereClause}
      ORDER BY ja.${validOrderBy} ${validOrderDirection}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    queryParams.push(limit, offset);

    const result = await pool.query(mainQuery, queryParams);
    return { applications: result.rows, total };
  }

  /**
   * Get applications for a specific job
   */
  async getApplicationsByJob(
    jobId: string,
    filters: Omit<ApplicationFilters, 'job_id'> = {}
  ): Promise<{ applications: JobApplicationWithDetails[]; total: number }> {
    return this.getApplications({ ...filters, job_id: jobId });
  }

  /**
   * Get applications by a specific user
   */
  async getApplicationsByUser(
    userId: string,
    filters: Omit<ApplicationFilters, 'user_id'> = {}
  ): Promise<{ applications: JobApplicationWithDetails[]; total: number }> {
    return this.getApplications({ ...filters, user_id: userId });
  }

  /**
   * Get applications for a business (all jobs posted by the business)
   */
  async getApplicationsByBusiness(
    businessId: number,
    filters: Omit<ApplicationFilters, 'business_id'> = {}
  ): Promise<{ applications: JobApplicationWithDetails[]; total: number }> {
    return this.getApplications({ ...filters, business_id: businessId });
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(
    applicationId: string,
    status: 'pending' | 'reviewed' | 'accepted' | 'rejected'
  ): Promise<JobApplication | null> {
    const query = `
      UPDATE job_applications 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [status, applicationId]);
    return result.rows[0] || null;
  }

  /**
   * Update application details
   */
  async updateApplication(
    applicationId: string,
    applicationData: Partial<ApplicationSubmission>
  ): Promise<JobApplication | null> {
    const allowedFields = [
      'qualifications',
      'location',
      'visa_type',
      'start_date',
      'resume_url',
      'resume_filename',
    ];
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(applicationData).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${++paramCount}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return null;
    }

    updates.push(`updated_at = NOW()`);
    values.push(applicationId);

    const query = `
      UPDATE job_applications 
      SET ${updates.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete application
   */
  async deleteApplication(applicationId: string): Promise<boolean> {
    const query = 'DELETE FROM job_applications WHERE id = $1';
    const result = await pool.query(query, [applicationId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Check if user has already applied to a job
   */
  async hasUserAppliedToJob(jobId: string, userId: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM job_applications 
      WHERE job_id = $1 AND user_id = $2
    `;

    const result = await pool.query(query, [jobId, userId]);
    return result.rows.length > 0;
  }

  /**
   * Get which job IDs from a list the user has applied to (bulk check)
   */
  async getAppliedJobIds(
    userId: string,
    jobIds: string[]
  ): Promise<Set<string>> {
    if (jobIds.length === 0) {
      return new Set();
    }

    const placeholders = jobIds.map((_, index) => `$${index + 2}`).join(',');
    const query = `
      SELECT job_id 
      FROM job_applications 
      WHERE user_id = $1 AND job_id IN (${placeholders})
    `;

    const values = [userId, ...jobIds];
    const result = await pool.query(query, values);

    return new Set(result.rows.map((row) => row.job_id as string));
  }

  /**
   * Get application statistics
   */
  async getApplicationStats(businessId?: number): Promise<{
    total: number;
    pending: number;
    reviewed: number;
    accepted: number;
    rejected: number;
  }> {
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN ja.status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN ja.status = 'reviewed' THEN 1 END) as reviewed,
        COUNT(CASE WHEN ja.status = 'accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN ja.status = 'rejected' THEN 1 END) as rejected
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
    `;

    const values: any[] = [];
    if (businessId) {
      query += ' WHERE j.business_id = $1';
      values.push(businessId);
    }

    const result = await pool.query(query, values);
    const stats = result.rows[0];

    return {
      total: parseInt(stats.total),
      pending: parseInt(stats.pending),
      reviewed: parseInt(stats.reviewed),
      accepted: parseInt(stats.accepted),
      rejected: parseInt(stats.rejected),
    };
  }

  /**
   * Send email notifications for a job application
   */
  private async sendApplicationEmails(
    application: JobApplication
  ): Promise<void> {
    try {
      // Get job and business details
      const jobQuery = `
        SELECT 
          j.title as job_title,
          j.description as job_description,
          b.name as business_name,
          b.owner_name as business_owner_name,
          u.email as business_owner_email
        FROM jobs j
        JOIN businesses b ON j.business_id = b.id
        JOIN users u ON b.user_id = u.id
        WHERE j.id = $1
      `;

      const jobResult = await pool.query(jobQuery, [application.job_id]);
      if (jobResult.rows.length === 0) {
        console.error('Job not found for application:', application.job_id);
        return;
      }

      const job = jobResult.rows[0];

      // Get user details
      const userQuery = `
        SELECT first_name, last_name, email, timezone
        FROM users
        WHERE id = $1
      `;

      const userResult = await pool.query(userQuery, [application.user_id]);
      if (userResult.rows.length === 0) {
        console.error('User not found for application:', application.user_id);
        return;
      }

      const user = userResult.rows[0];
      const applicantName =
        `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
        'Unknown User';

      // Prepare email data
      const emailData: JobApplicationEmailData = {
        jobTitle: job.job_title,
        businessName: job.business_name,
        businessOwnerEmail: job.business_owner_email,
        businessOwnerName: job.business_owner_name,
        applicantName: applicantName,
        applicantEmail: user.email,
        qualifications: application.qualifications,
        location: application.location,
        visaType: application.visa_type || undefined,
        startDate: application.start_date,
        resumeUrl: application.resume_url || undefined,
        resumeFilename: application.resume_filename || undefined,
        appliedAt: application.created_at,
        jobId: application.job_id,
        userTimezone: user.timezone,
      };

      // Send emails in parallel
      await Promise.all([
        emailService.sendJobApplicationNotificationToBusiness(emailData),
        emailService.sendJobApplicationConfirmationToApplicant(emailData),
      ]);

      console.log(`✅ Application emails sent for job ${application.job_id}`);
    } catch (error) {
      console.error('Error sending application emails:', error);
    }
  }
}

const applicationsService = new ApplicationsService();
export default applicationsService;
