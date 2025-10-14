import pool from '../db/config';

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
  year_formed?: number;
  owner_name?: string;
  mission_statement?: string;
  logo_url?: string;
  logo_public_id?: string;
  verified: boolean;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: Date;
  updated_at: Date;
  submitted_at: Date;
}

export interface BusinessWithUser extends Business {
  user_email: string;
  user_first_name?: string;
  user_last_name?: string;
}

export interface BusinessCategory {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
}

export class BusinessService {
  /**
   * Submit a new business for verification
   */
  async submitBusiness(
    userId: string,
    businessData: BusinessSubmission
  ): Promise<Business> {
    const client = await pool.connect();

    try {
      const query = `
        INSERT INTO businesses (
          user_id,
          name,
          year_formed,
          owner_name,
          address,
          mission_statement,
          logo_url,
          logo_public_id,
          status,
          submitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        userId,
        businessData.businessName,
        businessData.yearFormed,
        businessData.ownerName,
        businessData.businessAddress || null,
        businessData.missionStatement,
        businessData.logoUrl || null,
        businessData.logoPublicId || null,
        'pending',
        new Date(),
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get business by ID
   */
  async getBusinessById(businessId: number): Promise<Business | null> {
    const client = await pool.connect();

    try {
      const query = `
        SELECT b.*, bc.name as category_name
        FROM businesses b
        LEFT JOIN business_categories bc ON b.category_id = bc.id
        WHERE b.id = $1
      `;

      const result = await client.query(query, [businessId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Get business by ID with user information (admin use)
   */
  async getBusinessByIdWithUser(
    businessId: number
  ): Promise<BusinessWithUser | null> {
    const client = await pool.connect();

    try {
      const query = `
        SELECT 
          b.*, 
          bc.name as category_name,
          u.email as user_email,
          u.first_name as user_first_name,
          u.last_name as user_last_name
        FROM businesses b
        LEFT JOIN business_categories bc ON b.category_id = bc.id
        LEFT JOIN users u ON b.user_id = u.id
        WHERE b.id = $1
      `;

      const result = await client.query(query, [businessId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Get businesses by user ID
   */
  async getBusinessesByUserId(userId: string): Promise<Business[]> {
    const client = await pool.connect();

    try {
      const query = `
        SELECT b.*, bc.name as category_name
        FROM businesses b
        LEFT JOIN business_categories bc ON b.category_id = bc.id
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC
      `;

      const result = await client.query(query, [userId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get all pending businesses for admin review
   */
  async getPendingBusinesses(): Promise<Business[]> {
    const client = await pool.connect();

    try {
      // Use the helper function for consistency
      const { whereClause, queryParams } = this.buildWhereClause({
        status: 'pending',
      });

      const query = `
        SELECT b.*, bc.name as category_name, u.first_name, u.last_name, u.email
        FROM businesses b
        LEFT JOIN business_categories bc ON b.category_id = bc.id
        LEFT JOIN users u ON b.user_id = u.id
        ${whereClause}
        ORDER BY b.submitted_at ASC
      `;

      const result = await client.query(query, queryParams);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Helper function to build WHERE clause and parameters for business queries
   */
  private buildWhereClause(options?: {
    status?: 'pending' | 'approved' | 'rejected';
  }): { whereClause: string; queryParams: any[] } {
    const queryParams: any[] = [];
    let paramCount = 0;

    if (options?.status) {
      paramCount++;
      queryParams.push(options.status);
    }

    const whereClause = paramCount > 0 ? `WHERE b.status = $${paramCount}` : '';

    return { whereClause, queryParams };
  }

  /**
   * Validate and sanitize orderBy and orderDirection parameters
   */
  private validateOrderParams(
    orderBy?: string,
    orderDirection?: string
  ): {
    orderBy: string;
    orderDirection: string;
  } {
    // Whitelist of allowed orderBy fields
    const allowedOrderByFields = [
      'submitted_at',
      'updated_at',
      'name',
      'created_at',
    ];
    const sanitizedOrderBy = allowedOrderByFields.includes(orderBy || '')
      ? orderBy!
      : 'submitted_at';

    // Whitelist of allowed order directions
    const allowedDirections = ['ASC', 'DESC'];
    const sanitizedDirection = allowedDirections.includes(
      (orderDirection || '').toUpperCase()
    )
      ? (orderDirection || 'DESC').toUpperCase()
      : 'DESC';

    return {
      orderBy: sanitizedOrderBy,
      orderDirection: sanitizedDirection,
    };
  }

  /**
   * Get all businesses with optional filtering
   */
  async getAllBusinesses(options?: {
    status?: 'pending' | 'approved' | 'rejected';
    limit?: number;
    offset?: number;
    orderBy?: 'submitted_at' | 'updated_at' | 'name';
    orderDirection?: 'ASC' | 'DESC';
  }): Promise<{ businesses: Business[]; total: number }> {
    const client = await pool.connect();

    try {
      const {
        status,
        limit = 50,
        offset = 0,
        orderBy,
        orderDirection,
      } = options || {};

      // Validate and sanitize order parameters to prevent SQL injection
      const { orderBy: sanitizedOrderBy, orderDirection: sanitizedDirection } =
        this.validateOrderParams(orderBy, orderDirection);

      // Build WHERE clause and parameters
      const { whereClause, queryParams } = this.buildWhereClause({ status });

      // Count query for total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM businesses b
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Main query with additional parameters for LIMIT and OFFSET
      const mainQueryParams = [...queryParams, limit, offset];
      const mainQuery = `
        SELECT b.*, bc.name as category_name, u.first_name, u.last_name, u.email
        FROM businesses b
        LEFT JOIN business_categories bc ON b.category_id = bc.id
        LEFT JOIN users u ON b.user_id = u.id
        ${whereClause}
        ORDER BY b.${sanitizedOrderBy} ${sanitizedDirection}
        LIMIT $${mainQueryParams.length - 1} OFFSET $${mainQueryParams.length}
      `;

      const result = await client.query(mainQuery, mainQueryParams);

      return {
        businesses: result.rows,
        total,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Update business status (admin only)
   */
  async updateBusinessStatus(
    businessId: number,
    status: 'approved' | 'rejected',
    adminNotes?: string
  ): Promise<BusinessWithUser> {
    const client = await pool.connect();

    try {
      const query = `
        UPDATE businesses 
        SET status = $1, admin_notes = $2, verified = $3, updated_at = NOW()
        FROM users
        WHERE businesses.user_id = users.id AND businesses.id = $4
        RETURNING businesses.*, 
                 users.email as user_email,
                 users.first_name as user_first_name,
                 users.last_name as user_last_name
      `;

      const verified = status === 'approved';
      const values = [status, adminNotes || null, verified, businessId];

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Business not found');
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get all business categories
   */
  async getBusinessCategories(): Promise<BusinessCategory[]> {
    const client = await pool.connect();

    try {
      const query = `
        SELECT * FROM business_categories
        ORDER BY name ASC
      `;

      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Update business details
   */
  async updateBusiness(
    businessId: number,
    userId: string,
    updateData: Partial<BusinessSubmission>
  ): Promise<Business> {
    const client = await pool.connect();

    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updateData.businessName) {
        fields.push(`name = $${paramCount++}`);
        values.push(updateData.businessName);
      }

      if (updateData.yearFormed) {
        fields.push(`year_formed = $${paramCount++}`);
        values.push(updateData.yearFormed);
      }

      if (updateData.ownerName) {
        fields.push(`owner_name = $${paramCount++}`);
        values.push(updateData.ownerName);
      }

      if (updateData.businessAddress !== undefined) {
        fields.push(`address = $${paramCount++}`);
        values.push(updateData.businessAddress || null);
      }

      if (updateData.missionStatement) {
        fields.push(`mission_statement = $${paramCount++}`);
        values.push(updateData.missionStatement);
      }

      if (updateData.logoUrl !== undefined) {
        fields.push(`logo_url = $${paramCount++}`);
        values.push(updateData.logoUrl || null);
      }

      if (updateData.logoPublicId !== undefined) {
        fields.push(`logo_public_id = $${paramCount++}`);
        values.push(updateData.logoPublicId || null);
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = NOW()`);
      values.push(businessId, userId);

      const query = `
        UPDATE businesses 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount++} AND user_id = $${paramCount++}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Business not found or access denied');
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Delete business
   */
  async deleteBusiness(businessId: number, userId: string): Promise<boolean> {
    const client = await pool.connect();

    try {
      const query = `
        DELETE FROM businesses 
        WHERE id = $1 AND user_id = $2
      `;

      const result = await client.query(query, [businessId, userId]);
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Admin: Delete business (no ownership check)
   */
  async deleteBusinessAdmin(businessId: number): Promise<boolean> {
    const client = await pool.connect();

    try {
      const query = `
        DELETE FROM businesses 
        WHERE id = $1
      `;

      const result = await client.query(query, [businessId]);
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }
}

export const businessService = new BusinessService();
