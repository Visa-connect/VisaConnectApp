import pool from '../db/config';

export interface Job {
  id: number;
  business_id: number;
  title: string;
  description: string;
  location: string;
  job_type: 'hourly' | 'fixed';
  rate_from: number | null;
  rate_to: number | null;
  business_logo_url: string | null;
  status: 'active' | 'paused' | 'closed';
  created_at: Date;
  updated_at: Date;
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

class JobsService {
  /**
   * Create a new job posting
   */
  async createJob(jobData: JobSubmission): Promise<Job> {
    const query = `
      INSERT INTO jobs (
        business_id, title, description, location, job_type, 
        rate_from, rate_to, business_logo_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      jobData.business_id,
      jobData.title,
      jobData.description,
      jobData.location,
      jobData.job_type,
      jobData.rate_from,
      jobData.rate_to,
      jobData.business_logo_url || null,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get job by ID
   */
  async getJobById(jobId: number): Promise<JobWithBusiness | null> {
    const query = `
      SELECT 
        j.*,
        b.name as business_name,
        b.address as business_address,
        b.website as business_website,
        b.owner_name as business_owner_name
      FROM jobs j
      JOIN businesses b ON j.business_id = b.id
      WHERE j.id = $1
    `;

    const result = await pool.query(query, [jobId]);
    return result.rows[0] || null;
  }

  /**
   * Get all jobs with optional filtering and pagination
   */
  async getAllJobs(
    filters: JobFilters = {}
  ): Promise<{ jobs: JobWithBusiness[]; total: number }> {
    const {
      status = 'active',
      job_type,
      location,
      business_id,
      limit = 20,
      offset = 0,
      order_by = 'created_at',
      order_direction = 'DESC',
    } = filters;

    // Validate order parameters
    const validOrderBy = ['created_at', 'title', 'rate_from'].includes(order_by)
      ? order_by
      : 'created_at';
    const validOrderDirection = ['ASC', 'DESC'].includes(order_direction)
      ? order_direction
      : 'DESC';

    // Build WHERE clause
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramCount = 0;

    whereConditions.push(`j.status = $${++paramCount}`);
    queryParams.push(status);

    if (job_type) {
      whereConditions.push(`j.job_type = $${++paramCount}`);
      queryParams.push(job_type);
    }

    if (location) {
      whereConditions.push(`LOWER(j.location) LIKE LOWER($${++paramCount})`);
      queryParams.push(`%${location}%`);
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
      FROM jobs j
      JOIN businesses b ON j.business_id = b.id
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Main query
    const mainQuery = `
      SELECT 
        j.*,
        b.name as business_name,
        b.address as business_address,
        b.website as business_website,
        b.owner_name as business_owner_name
      FROM jobs j
      JOIN businesses b ON j.business_id = b.id
      ${whereClause}
      ORDER BY j.${validOrderBy} ${validOrderDirection}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    queryParams.push(limit, offset);

    const result = await pool.query(mainQuery, queryParams);
    return { jobs: result.rows, total };
  }

  /**
   * Get jobs posted by a specific business
   */
  async getJobsByBusiness(
    businessId: number,
    filters: Omit<JobFilters, 'business_id'> = {}
  ): Promise<{ jobs: JobWithBusiness[]; total: number }> {
    return this.getAllJobs({ ...filters, business_id: businessId });
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: number,
    status: 'active' | 'paused' | 'closed'
  ): Promise<Job | null> {
    const query = `
      UPDATE jobs 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [status, jobId]);
    return result.rows[0] || null;
  }

  /**
   * Update job details
   */
  async updateJob(
    jobId: number,
    jobData: Partial<JobSubmission>
  ): Promise<Job | null> {
    const allowedFields = [
      'title',
      'description',
      'location',
      'job_type',
      'rate_from',
      'rate_to',
      'business_logo_url',
    ];
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(jobData).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${++paramCount}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return null;
    }

    updates.push(`updated_at = NOW()`);
    values.push(jobId);

    const query = `
      UPDATE jobs 
      SET ${updates.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete job
   */
  async deleteJob(jobId: number): Promise<boolean> {
    const query = 'DELETE FROM jobs WHERE id = $1';
    const result = await pool.query(query, [jobId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Check if user owns the business that posted the job
   */
  async checkJobOwnership(jobId: number, userId: number): Promise<boolean> {
    const query = `
      SELECT 1
      FROM jobs j
      JOIN businesses b ON j.business_id = b.id
      WHERE j.id = $1 AND b.user_id = $2
    `;

    const result = await pool.query(query, [jobId, userId]);
    return result.rows.length > 0;
  }

  /**
   * Get job statistics
   */
  async getJobStats(businessId?: number): Promise<{
    total: number;
    active: number;
    paused: number;
    closed: number;
  }> {
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed
      FROM jobs
    `;

    const values: any[] = [];
    if (businessId) {
      query += ' WHERE business_id = $1';
      values.push(businessId);
    }

    const result = await pool.query(query, values);
    const stats = result.rows[0];

    return {
      total: parseInt(stats.total),
      active: parseInt(stats.active),
      paused: parseInt(stats.paused),
      closed: parseInt(stats.closed),
    };
  }
}

export const jobsService = new JobsService();
