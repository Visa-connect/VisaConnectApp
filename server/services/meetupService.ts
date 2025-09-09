import pool from '../db/config';

// TypeScript interfaces
export interface MeetupCategory {
  id: string;
  name: string;
  description?: string;
  created_at: Date;
}

export interface Meetup {
  id?: number;
  creator_id: string;
  category_id: number;
  title: string;
  description: string;
  location: string;
  meetup_date: Date;
  max_participants?: number;
  is_active: boolean;
  photo_url?: string;
  photo_public_id?: string;
  created_at?: Date;
  updated_at?: Date;
  // Enhanced fields for API responses
  creator?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
    profile_photo_url?: string;
  };
  category?: MeetupCategory;
  interest_count?: number;
  is_interested?: boolean;
}

export interface MeetupInterest {
  id?: number;
  meetup_id: number;
  user_id: string;
  created_at?: Date;
}

export interface MeetupReport {
  id?: number;
  meetup_id: number;
  reporter_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  admin_notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateMeetupRequest {
  /** Required: The ID of the meetup category */
  category_id: number;
  /** Required: The title of the meetup (max 100 characters) */
  title: string;
  /** Required: Detailed description of the meetup (max 1000 characters) */
  description: string;
  /** Required: Location where the meetup will take place (max 200 characters) */
  location: string;
  /** Required: ISO string date when the meetup will occur (must be in the future) */
  meetup_date: string;
  /** Optional: Maximum number of participants allowed (1-1000) */
  max_participants?: number | null;
  /** Optional: Cloudinary secure URL for the meetup photo (max 500 characters, must be valid URL) */
  photo_url?: string | null;
  /** Optional: Cloudinary public ID for the meetup photo (max 255 characters, format: folder/filename) */
  photo_public_id?: string | null;
}

export interface UpdateMeetupRequest {
  /** Optional: The ID of the meetup category */
  category_id?: number;
  /** Optional: The title of the meetup (max 100 characters) */
  title?: string;
  /** Optional: Detailed description of the meetup (max 1000 characters) */
  description?: string;
  /** Optional: Location where the meetup will take place (max 200 characters) */
  location?: string;
  /** Optional: ISO string date when the meetup will occur (must be in the future) */
  meetup_date?: string;
  /** Optional: Maximum number of participants allowed (1-1000) */
  max_participants?: number | null;
  /** Optional: Whether the meetup is currently active */
  is_active?: boolean;
  /** Optional: Cloudinary secure URL for the meetup photo (max 500 characters, must be valid URL) */
  photo_url?: string | null;
  /** Optional: Cloudinary public ID for the meetup photo (max 255 characters, format: folder/filename) */
  photo_public_id?: string | null;
}

export interface SearchMeetupsRequest {
  keyword?: string;
  category_id?: number;
  location?: string;
  date_from?: string; // ISO string
  date_to?: string; // ISO string
  limit?: number;
  offset?: number;
}

class MeetupService {
  // Validate meetup data before creation/update
  private validateMeetupData(
    data: CreateMeetupRequest | UpdateMeetupRequest
  ): void {
    // Validate title
    if (data.title && (data.title.length < 1 || data.title.length > 100)) {
      throw new Error('Title must be between 1 and 100 characters');
    }

    // Validate description
    if (
      data.description &&
      (data.description.length < 1 || data.description.length > 1000)
    ) {
      throw new Error('Description must be between 1 and 1000 characters');
    }

    // Validate location
    if (
      data.location &&
      (data.location.length < 1 || data.location.length > 200)
    ) {
      throw new Error('Location must be between 1 and 200 characters');
    }

    // Validate max_participants
    if (
      data.max_participants &&
      (data.max_participants < 1 || data.max_participants > 1000)
    ) {
      throw new Error('Max participants must be between 1 and 1000');
    }

    // Validate photo_url format and length
    if (data.photo_url && data.photo_url.length > 500) {
      throw new Error('Photo URL must be 500 characters or less');
    }

    // Validate photo_public_id format and length
    if (data.photo_public_id && data.photo_public_id.length > 255) {
      throw new Error('Photo public ID must be 255 characters or less');
    }

    // Validate meetup_date is in the future (only for creation)
    if ('meetup_date' in data && data.meetup_date) {
      const meetupDate = new Date(data.meetup_date);
      if (isNaN(meetupDate.getTime())) {
        throw new Error('Invalid meetup date format');
      }
      if (meetupDate <= new Date()) {
        throw new Error('Meetup date must be in the future');
      }
    }
  }

  // Get all meetup categories
  async getCategories(): Promise<MeetupCategory[]> {
    try {
      const result = await pool.query(
        'SELECT id, name, description, created_at FROM meetup_categories ORDER BY name'
      );
      return result.rows.map((row) => ({
        id: row.id.toString(),
        name: row.name,
        description: row.description,
        created_at: row.created_at,
      }));
    } catch (error) {
      console.error('Error fetching meetup categories:', error);
      throw new Error('Failed to fetch meetup categories');
    }
  }

  // Create a new meetup
  async createMeetup(
    userId: string,
    meetupData: CreateMeetupRequest
  ): Promise<number> {
    try {
      // Validate input data
      this.validateMeetupData(meetupData);

      const result = await pool.query(
        `INSERT INTO meetups (
          creator_id, category_id, title, description, location, 
          meetup_date, max_participants, is_active, photo_url, photo_public_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) 
        RETURNING id`,
        [
          userId,
          meetupData.category_id,
          meetupData.title,
          meetupData.description,
          meetupData.location,
          new Date(meetupData.meetup_date),
          meetupData.max_participants,
          true,
          meetupData.photo_url || null,
          meetupData.photo_public_id || null,
        ]
      );
      return result.rows[0].id;
    } catch (error) {
      console.error('Error creating meetup:', error);
      throw new Error('Failed to create meetup');
    }
  }

  // Get a meetup by ID with enhanced data
  async getMeetup(meetupId: number, userId?: string): Promise<Meetup | null> {
    try {
      const result = await pool.query(
        `SELECT m.*, 
                c.name as category_name, c.description as category_description,
                u.first_name, u.last_name, u.email, u.profile_photo_url
         FROM meetups m
         LEFT JOIN meetup_categories c ON m.category_id = c.id
         LEFT JOIN users u ON m.creator_id = u.id
         WHERE m.id = $1`,
        [meetupId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const meetup: Meetup = {
        id: row.id,
        creator_id: row.creator_id,
        category_id: row.category_id,
        title: row.title,
        description: row.description,
        location: row.location,
        meetup_date: row.meetup_date,
        max_participants: row.max_participants,
        is_active: row.is_active,
        photo_url: row.photo_url,
        photo_public_id: row.photo_public_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        creator: {
          id: row.creator_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          profile_photo_url: row.profile_photo_url,
        },
        category: {
          id: row.category_id.toString(),
          name: row.category_name,
          description: row.category_description,
          created_at: row.created_at,
        },
      };

      // Get interest count
      const interestResult = await pool.query(
        'SELECT COUNT(*) as count FROM meetup_interests WHERE meetup_id = $1',
        [meetupId]
      );
      meetup.interest_count = parseInt(interestResult.rows[0].count);

      // Check if current user is interested
      if (userId) {
        const userInterestResult = await pool.query(
          'SELECT id FROM meetup_interests WHERE meetup_id = $1 AND user_id = $2',
          [meetupId, userId]
        );
        meetup.is_interested = userInterestResult.rows.length > 0;
      }

      return meetup;
    } catch (error) {
      console.error('Error fetching meetup:', error);
      throw new Error('Failed to fetch meetup');
    }
  }

  // Search meetups with filters
  async searchMeetups(
    searchParams: SearchMeetupsRequest,
    userId?: string
  ): Promise<Meetup[]> {
    try {
      let query = `
        SELECT m.*, 
               c.name as category_name, c.description as category_description,
               u.first_name, u.last_name, u.email, u.profile_photo_url,
               COALESCE(interest_counts.interest_count, 0) as interest_count,
               CASE WHEN user_interests.meetup_id IS NOT NULL THEN true ELSE false END as is_interested
        FROM meetups m
        LEFT JOIN meetup_categories c ON m.category_id = c.id
        LEFT JOIN users u ON m.creator_id = u.id
        LEFT JOIN (
          SELECT meetup_id, COUNT(*) as interest_count
          FROM meetup_interests
          GROUP BY meetup_id
        ) interest_counts ON m.id = interest_counts.meetup_id
        LEFT JOIN (
          SELECT DISTINCT meetup_id
          FROM meetup_interests
          ${userId ? 'WHERE user_id = $1' : 'WHERE 1=0'}
        ) user_interests ON m.id = user_interests.meetup_id
        WHERE m.is_active = true
      `;
      const params: any[] = [];
      let paramCount = 0;

      // Add userId parameter if provided
      if (userId) {
        paramCount++;
        params.push(userId);
      }

      // Apply filters
      if (searchParams.category_id) {
        paramCount++;
        query += ` AND m.category_id = $${paramCount}`;
        params.push(searchParams.category_id);
      }

      if (searchParams.date_from) {
        paramCount++;
        query += ` AND m.meetup_date >= $${paramCount}`;
        params.push(new Date(searchParams.date_from));
      }

      if (searchParams.date_to) {
        paramCount++;
        query += ` AND m.meetup_date <= $${paramCount}`;
        params.push(new Date(searchParams.date_to));
      }

      // Apply keyword search
      if (searchParams.keyword) {
        paramCount++;
        query += ` AND (
          m.title ILIKE $${paramCount} OR 
          m.description ILIKE $${paramCount} OR 
          m.location ILIKE $${paramCount}
        )`;
        params.push(`%${searchParams.keyword}%`);
      }

      // Order by meetup date (upcoming first)
      query += ' ORDER BY m.meetup_date ASC';

      // Apply limit and offset
      if (searchParams.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(searchParams.limit);
      }

      if (searchParams.offset) {
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(searchParams.offset);
      }

      const result = await pool.query(query, params);
      const meetups: Meetup[] = [];

      for (const row of result.rows) {
        const meetup: Meetup = {
          id: row.id,
          creator_id: row.creator_id,
          category_id: row.category_id,
          title: row.title,
          description: row.description,
          location: row.location,
          meetup_date: row.meetup_date,
          max_participants: row.max_participants,
          is_active: row.is_active,
          photo_url: row.photo_url,
          photo_public_id: row.photo_public_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          creator: {
            id: row.creator_id,
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            profile_photo_url: row.profile_photo_url,
          },
          category: {
            id: row.category_id.toString(),
            name: row.category_name,
            description: row.category_description,
            created_at: row.created_at,
          },
        };

        // Interest count and user interest status are now included in the main query
        meetup.interest_count = parseInt(row.interest_count) || 0;
        meetup.is_interested = row.is_interested;

        meetups.push(meetup);
      }

      return meetups;
    } catch (error) {
      console.error('Error searching meetups:', error);
      throw new Error('Failed to search meetups');
    }
  }

  // Express interest in a meetup
  async expressInterest(meetupId: number, userId: string): Promise<void> {
    try {
      // Check if already interested
      const existingResult = await pool.query(
        'SELECT id FROM meetup_interests WHERE meetup_id = $1 AND user_id = $2',
        [meetupId, userId]
      );

      if (existingResult.rows.length > 0) {
        throw new Error('You have already expressed interest in this meetup');
      }

      // Add interest
      await pool.query(
        'INSERT INTO meetup_interests (meetup_id, user_id, created_at) VALUES ($1, $2, NOW())',
        [meetupId, userId]
      );

      // TODO: Send email and chat message to meetup creator
      // This will be implemented in the notification service
    } catch (error) {
      console.error('Error expressing interest:', error);
      throw new Error('Failed to express interest');
    }
  }

  // Remove interest in a meetup
  async removeInterest(meetupId: number, userId: string): Promise<void> {
    try {
      const result = await pool.query(
        'DELETE FROM meetup_interests WHERE meetup_id = $1 AND user_id = $2 RETURNING id',
        [meetupId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('No interest found for this meetup');
      }
    } catch (error) {
      console.error('Error removing interest:', error);
      throw new Error('Failed to remove interest');
    }
  }

  // Report a meetup
  async reportMeetup(
    meetupId: number,
    reporterId: string,
    reason: string
  ): Promise<number> {
    try {
      const result = await pool.query(
        `INSERT INTO meetup_reports (
          meetup_id, reporter_id, reason, status, created_at, updated_at
        ) VALUES ($1, $2, $3, 'pending', NOW(), NOW()) 
        RETURNING id`,
        [meetupId, reporterId, reason]
      );
      return result.rows[0].id;
    } catch (error) {
      console.error('Error reporting meetup:', error);
      throw new Error('Failed to report meetup');
    }
  }

  // Get user's created meetups
  async getUserMeetups(userId: string): Promise<Meetup[]> {
    try {
      const result = await pool.query(
        `SELECT m.*, 
                c.name as category_name, c.description as category_description
         FROM meetups m
         LEFT JOIN meetup_categories c ON m.category_id = c.id
         WHERE m.creator_id = $1
         ORDER BY m.created_at DESC`,
        [userId]
      );

      const meetups: Meetup[] = [];

      for (const row of result.rows) {
        const meetup: Meetup = {
          id: row.id,
          creator_id: row.creator_id,
          category_id: row.category_id,
          title: row.title,
          description: row.description,
          location: row.location,
          meetup_date: row.meetup_date,
          max_participants: row.max_participants,
          is_active: row.is_active,
          photo_url: row.photo_url,
          photo_public_id: row.photo_public_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          category: {
            id: row.category_id.toString(),
            name: row.category_name,
            description: row.category_description,
            created_at: row.created_at,
          },
        };

        // Get interest count
        const interestResult = await pool.query(
          'SELECT COUNT(*) as count FROM meetup_interests WHERE meetup_id = $1',
          [meetup.id]
        );
        meetup.interest_count = parseInt(interestResult.rows[0].count);

        meetups.push(meetup);
      }

      return meetups;
    } catch (error) {
      console.error('Error fetching user meetups:', error);
      throw new Error('Failed to fetch user meetups');
    }
  }

  // Get user's interested meetups
  async getUserInterestedMeetups(userId: string): Promise<Meetup[]> {
    try {
      const result = await pool.query(
        `SELECT m.*, 
                c.name as category_name, c.description as category_description,
                u.first_name, u.last_name, u.email, u.profile_photo_url
         FROM meetups m
         LEFT JOIN meetup_categories c ON m.category_id = c.id
         LEFT JOIN users u ON m.creator_id = u.id
         INNER JOIN meetup_interests mi ON m.id = mi.meetup_id
         WHERE mi.user_id = $1
         ORDER BY mi.created_at DESC`,
        [userId]
      );

      const meetups: Meetup[] = [];

      for (const row of result.rows) {
        const meetup: Meetup = {
          id: row.id,
          creator_id: row.creator_id,
          category_id: row.category_id,
          title: row.title,
          description: row.description,
          location: row.location,
          meetup_date: row.meetup_date,
          max_participants: row.max_participants,
          is_active: row.is_active,
          photo_url: row.photo_url,
          photo_public_id: row.photo_public_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          creator: {
            id: row.creator_id,
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            profile_photo_url: row.profile_photo_url,
          },
          category: {
            id: row.category_id.toString(),
            name: row.category_name,
            description: row.category_description,
            created_at: row.created_at,
          },
          is_interested: true,
        };

        // Get interest count
        const interestResult = await pool.query(
          'SELECT COUNT(*) as count FROM meetup_interests WHERE meetup_id = $1',
          [meetup.id]
        );
        meetup.interest_count = parseInt(interestResult.rows[0].count);

        meetups.push(meetup);
      }

      return meetups;
    } catch (error) {
      console.error('Error fetching user interested meetups:', error);
      throw new Error('Failed to fetch user interested meetups');
    }
  }

  // Update a meetup (only by creator)
  async updateMeetup(
    meetupId: number,
    userId: string,
    updateData: UpdateMeetupRequest
  ): Promise<void> {
    try {
      // Validate input data
      this.validateMeetupData(updateData);

      // Check if user is the creator
      const meetupResult = await pool.query(
        'SELECT creator_id FROM meetups WHERE id = $1',
        [meetupId]
      );

      if (meetupResult.rows.length === 0) {
        throw new Error('Meetup not found');
      }

      if (meetupResult.rows[0].creator_id !== userId) {
        throw new Error('Only the creator can update this meetup');
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      if (updateData.category_id !== undefined) {
        paramCount++;
        updateFields.push(`category_id = $${paramCount}`);
        params.push(updateData.category_id);
      }

      if (updateData.title !== undefined) {
        paramCount++;
        updateFields.push(`title = $${paramCount}`);
        params.push(updateData.title);
      }

      if (updateData.description !== undefined) {
        paramCount++;
        updateFields.push(`description = $${paramCount}`);
        params.push(updateData.description);
      }

      if (updateData.location !== undefined) {
        paramCount++;
        updateFields.push(`location = $${paramCount}`);
        params.push(updateData.location);
      }

      if (updateData.meetup_date !== undefined) {
        paramCount++;
        updateFields.push(`meetup_date = $${paramCount}`);
        params.push(new Date(updateData.meetup_date));
      }

      if (updateData.max_participants !== undefined) {
        paramCount++;
        updateFields.push(`max_participants = $${paramCount}`);
        params.push(updateData.max_participants);
      }

      if (updateData.is_active !== undefined) {
        paramCount++;
        updateFields.push(`is_active = $${paramCount}`);
        params.push(updateData.is_active);
      }

      if (updateData.photo_url !== undefined) {
        paramCount++;
        updateFields.push(`photo_url = $${paramCount}`);
        params.push(updateData.photo_url);
      }

      if (updateData.photo_public_id !== undefined) {
        paramCount++;
        updateFields.push(`photo_public_id = $${paramCount}`);
        params.push(updateData.photo_public_id);
      }

      if (updateFields.length === 0) {
        return; // No fields to update
      }

      paramCount++;
      updateFields.push(`updated_at = $${paramCount}`);
      params.push(new Date());

      paramCount++;
      params.push(meetupId);

      const query = `UPDATE meetups SET ${updateFields.join(
        ', '
      )} WHERE id = $${paramCount}`;
      await pool.query(query, params);
    } catch (error) {
      console.error('Error updating meetup:', error);
      throw new Error('Failed to update meetup');
    }
  }

  // Delete a meetup (only by creator)
  async deleteMeetup(meetupId: number, userId: string): Promise<void> {
    try {
      // Check if user is the creator
      const meetupResult = await pool.query(
        'SELECT creator_id FROM meetups WHERE id = $1',
        [meetupId]
      );

      if (meetupResult.rows.length === 0) {
        throw new Error('Meetup not found');
      }

      if (meetupResult.rows[0].creator_id !== userId) {
        throw new Error('Only the creator can delete this meetup');
      }

      await pool.query('DELETE FROM meetups WHERE id = $1', [meetupId]);
    } catch (error) {
      console.error('Error deleting meetup:', error);
      throw new Error('Failed to delete meetup');
    }
  }
}

// Direct module-level instantiation
// In Node.js, modules are cached after first require, making this naturally thread-safe
// for the single-threaded event loop model
export const meetupService = new MeetupService();
