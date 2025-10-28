import pool from '../db/config';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string; // Required
  first_name?: string;
  last_name?: string;
  visa_type?: string;
  current_location?: {
    city: string;
    state: string;
    country: string;
  };
  occupation?: string; // New field for job/employer
  employer?: string; // New field for company name

  // Optional profile fields
  interests?: string[];
  nationality?: string;
  languages?: string[];
  first_time_in_us_year?: number;
  first_time_in_us_location?: string;
  first_time_in_us_visa?: string;
  job_discovery_method?: string;
  visa_change_journey?: string;
  other_us_jobs?: string[];
  hobbies?: string[];
  favorite_state?: string;
  preferred_outings?: string[];
  has_car?: boolean;
  offers_rides?: boolean;
  relationship_status?: string;
  road_trips?: boolean;
  favorite_place?: string;
  travel_tips?: string;
  willing_to_guide?: boolean;
  mentorship_interest?: boolean;
  job_boards?: string[];
  visa_advice?: string;
  profile_photo_url?: string | null;
  profile_photo_public_id?: string | null;
  bio?: string;
  resume_url?: string | null;
  resume_filename?: string | null;
  resume_public_id?: string | null;
  timezone?: string | null;
  helped_count?: number; // Count of unique users who have given this user a thumbs-up

  created_at?: Date;
  updated_at?: Date;
}

// Basic user data for initial registration
export interface BasicUserData {
  id?: string; // Optional ID for Firebase UID integration
  email: string; // Required
  first_name?: string;
  last_name?: string;
  visa_type?: string;
  current_location?: {
    city: string;
    state: string;
    country: string;
  };
  occupation?: string; // Job title/role
  employer?: string; // Company name
  timezone?: string | null; // User's timezone
}

// Extended user data for profile updates (includes all fields)
export interface CreateUserData extends BasicUserData {
  // Optional profile fields - can be filled in later
  interests?: string[];
  nationality?: string;
  languages?: string[];
  first_time_in_us_year?: number;
  first_time_in_us_location?: string;
  first_time_in_us_visa?: string;
  job_discovery_method?: string;
  visa_change_journey?: string;
  other_us_jobs?: string[];
  hobbies?: string[];
  favorite_state?: string;
  preferred_outings?: string[];
  has_car?: boolean;
  offers_rides?: boolean;
  relationship_status?: string;
  road_trips?: boolean;
  favorite_place?: string;
  travel_tips?: string;
  willing_to_guide?: boolean;
  mentorship_interest?: boolean;
  job_boards?: string[];
  visa_advice?: string;
  profile_photo_url?: string | null;
  profile_photo_public_id?: string | null;
  bio?: string;
  resume_url?: string | null;
  resume_filename?: string | null;
  resume_public_id?: string | null;
  timezone?: string | null;
  helped_count?: number; // Count of unique users who have given this user a thumbs-up
}

// Interface for chat thumbs-up data
export interface ChatThumbsUpData {
  giver_id: string;
  receiver_id: string;
  chat_message_id: string;
}

// Interface for thumbs-up response
export interface ThumbsUpResponse {
  success: boolean;
  message: string;
  helped_count?: number;
  already_given?: boolean;
}

class UserService {
  // Create a new user with basic information
  async createUser(userData: BasicUserData): Promise<User> {
    const id = userData.id || uuidv4();
    const query = `
              INSERT INTO users (
                id, email, first_name, last_name, visa_type, current_location, occupation, employer, timezone, created_at, updated_at
              )
              VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
              )
              RETURNING *
            `;

    const values = [
      id,
      userData.email,
      userData.first_name,
      userData.last_name,
      userData.visa_type,
      userData.current_location
        ? JSON.stringify(userData.current_location)
        : null,
      userData.occupation,
      userData.employer,
      userData.timezone,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Get user by ID
  async getUserById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  // Update user with basic or detailed profile information
  async updateUser(
    id: string,
    updates: Partial<CreateUserData>
  ): Promise<User | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Whitelist of allowed column names to prevent SQL injection
    const allowedColumns = new Set([
      'first_name',
      'last_name',
      'visa_type',
      'current_location',
      'occupation',
      'employer',
      'interests',
      'nationality',
      'languages',
      'first_time_in_us_year',
      'first_time_in_us_location',
      'first_time_in_us_visa',
      'job_discovery_method',
      'visa_change_journey',
      'other_us_jobs',
      'hobbies',
      'favorite_state',
      'preferred_outings',
      'has_car',
      'offers_rides',
      'relationship_status',
      'road_trips',
      'favorite_place',
      'travel_tips',
      'willing_to_guide',
      'mentorship_interest',
      'job_boards',
      'visa_advice',
      'profile_photo_url',
      'profile_photo_public_id',
      'bio',
      'resume_url',
      'resume_filename',
      'resume_public_id',
      'timezone',
      'helped_count',
    ]);

    // Special handling for JSON fields
    const jsonFields = new Set(['current_location']);

    // Iterate through all update fields dynamically
    for (const [key, value] of Object.entries(updates)) {
      // Validate that the column name is in our whitelist
      if (!allowedColumns.has(key)) {
        throw new Error(`Invalid column name: ${key}`);
      }

      if (value !== undefined) {
        setClause.push(`${key} = $${paramCount++}`);

        // Handle JSON fields
        if (jsonFields.has(key)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (setClause.length === 0) {
      return this.getUserById(id);
    }

    values.push(id);
    const query = `
      UPDATE users 
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  // Update detailed profile information
  async updateProfileDetails(
    id: string,
    profileData: Partial<CreateUserData>
  ): Promise<User | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Profile detail fields
    if (profileData.interests !== undefined) {
      setClause.push(`interests = $${paramCount++}`);
      values.push(profileData.interests);
    }
    if (profileData.nationality !== undefined) {
      setClause.push(`nationality = $${paramCount++}`);
      values.push(profileData.nationality);
    }
    if (profileData.languages !== undefined) {
      setClause.push(`languages = $${paramCount++}`);
      values.push(profileData.languages);
    }
    if (profileData.first_time_in_us_year !== undefined) {
      setClause.push(`first_time_in_us_year = $${paramCount++}`);
      values.push(profileData.first_time_in_us_year);
    }
    if (profileData.first_time_in_us_location !== undefined) {
      setClause.push(`first_time_in_us_location = $${paramCount++}`);
      values.push(profileData.first_time_in_us_location);
    }
    if (profileData.first_time_in_us_visa !== undefined) {
      setClause.push(`first_time_in_us_visa = $${paramCount++}`);
      values.push(profileData.first_time_in_us_visa);
    }
    if (profileData.job_discovery_method !== undefined) {
      setClause.push(`job_discovery_method = $${paramCount++}`);
      values.push(profileData.job_discovery_method);
    }
    if (profileData.visa_change_journey !== undefined) {
      setClause.push(`visa_change_journey = $${paramCount++}`);
      values.push(profileData.visa_change_journey);
    }
    if (profileData.other_us_jobs !== undefined) {
      setClause.push(`other_us_jobs = $${paramCount++}`);
      values.push(profileData.other_us_jobs);
    }
    if (profileData.hobbies !== undefined) {
      setClause.push(`hobbies = $${paramCount++}`);
      values.push(profileData.hobbies);
    }
    if (profileData.favorite_state !== undefined) {
      setClause.push(`favorite_state = $${paramCount++}`);
      values.push(profileData.favorite_state);
    }
    if (profileData.preferred_outings !== undefined) {
      setClause.push(`preferred_outings = $${paramCount++}`);
      values.push(profileData.preferred_outings);
    }
    if (profileData.has_car !== undefined) {
      setClause.push(`has_car = $${paramCount++}`);
      values.push(profileData.has_car);
    }
    if (profileData.offers_rides !== undefined) {
      setClause.push(`offers_rides = $${paramCount++}`);
      values.push(profileData.offers_rides);
    }
    if (profileData.relationship_status !== undefined) {
      setClause.push(`relationship_status = $${paramCount++}`);
      values.push(profileData.relationship_status);
    }
    if (profileData.road_trips !== undefined) {
      setClause.push(`road_trips = $${paramCount++}`);
      values.push(profileData.road_trips);
    }
    if (profileData.favorite_place !== undefined) {
      setClause.push(`favorite_place = $${paramCount++}`);
      values.push(profileData.favorite_place);
    }
    if (profileData.travel_tips !== undefined) {
      setClause.push(`travel_tips = $${paramCount++}`);
      values.push(profileData.travel_tips);
    }
    if (profileData.willing_to_guide !== undefined) {
      setClause.push(`willing_to_guide = $${paramCount++}`);
      values.push(profileData.willing_to_guide);
    }
    if (profileData.mentorship_interest !== undefined) {
      setClause.push(`mentorship_interest = $${paramCount++}`);
      values.push(profileData.mentorship_interest);
    }
    if (profileData.job_boards !== undefined) {
      setClause.push(`job_boards = $${paramCount++}`);
      values.push(profileData.job_boards);
    }
    if (profileData.visa_advice !== undefined) {
      setClause.push(`visa_advice = $${paramCount++}`);
      values.push(profileData.visa_advice);
    }
    if (profileData.profile_photo_url !== undefined) {
      setClause.push(`profile_photo_url = $${paramCount++}`);
      values.push(profileData.profile_photo_url);
    }
    if (profileData.profile_photo_public_id !== undefined) {
      setClause.push(`profile_photo_public_id = $${paramCount++}`);
      values.push(profileData.profile_photo_public_id);
    }

    if (setClause.length === 0) {
      return this.getUserById(id);
    }

    values.push(id);
    const query = `
      UPDATE users 
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  // Delete user
  async deleteUser(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Get all users (with pagination)
  async getAllUsers(
    limit: number = 50,
    offset: number = 0
  ): Promise<{ users: User[]; total: number }> {
    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM users';
    const countResult = await pool.query(countQuery);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated users
    const usersQuery =
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    const usersResult = await pool.query(usersQuery, [limit, offset]);

    return {
      users: usersResult.rows,
      total,
    };
  }

  // Search users by criteria
  async searchUsers(criteria: {
    visa_type?: string;
    location?: { city?: string; state?: string; country?: string };
    interests?: string[];
  }): Promise<User[]> {
    let query = 'SELECT * FROM users WHERE 1=1';
    const values: any[] = [];
    let paramCount = 1;

    if (criteria.visa_type) {
      query += ` AND visa_type = $${paramCount++}`;
      values.push(criteria.visa_type);
    }

    if (criteria.location) {
      if (criteria.location.country) {
        query += ` AND current_location->>'country' = $${paramCount++}`;
        values.push(criteria.location.country);
      }
      if (criteria.location.state) {
        query += ` AND current_location->>'state' = $${paramCount++}`;
        values.push(criteria.location.state);
      }
      if (criteria.location.city) {
        query += ` AND current_location->>'city' = $${paramCount++}`;
        values.push(criteria.location.city);
      }
    }

    if (criteria.interests && criteria.interests.length > 0) {
      query += ` AND interests && $${paramCount++}`;
      values.push(criteria.interests);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Search users by text query (for Connect screen)
  async searchUsersByText(
    searchQuery: string,
    currentUserId: string
  ): Promise<User[]> {
    const query = `
      SELECT id, first_name, last_name, visa_type, current_location, occupation, 
             profile_photo_url, bio, created_at
      FROM users 
      WHERE id != $1 
        AND (
          LOWER(first_name) LIKE LOWER($2) OR
          LOWER(last_name) LIKE LOWER($2) OR
          LOWER(occupation) LIKE LOWER($2) OR
          LOWER(visa_type) LIKE LOWER($2) OR
          LOWER(current_location::text) LIKE LOWER($2) OR
          LOWER(bio) LIKE LOWER($2)
        )
      ORDER BY 
        CASE 
          WHEN LOWER(first_name) LIKE LOWER($2) OR LOWER(last_name) LIKE LOWER($2) THEN 1
          WHEN LOWER(occupation) LIKE LOWER($2) THEN 2
          WHEN LOWER(visa_type) LIKE LOWER($2) THEN 3
          ELSE 4
        END,
        created_at DESC
      LIMIT 20
    `;

    const searchTerm = `%${searchQuery}%`;
    const result = await pool.query(query, [currentUserId, searchTerm]);
    return result.rows;
  }

  // Give a thumbs-up to a user (chat functionality)
  async giveThumbsUp(data: ChatThumbsUpData): Promise<ThumbsUpResponse> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if thumbs-up already exists (prevent duplicates)
      const existingThumbsUp = await client.query(
        'SELECT id FROM chat_thumbs_up WHERE giver_id = $1 AND receiver_id = $2',
        [data.giver_id, data.receiver_id]
      );

      if (existingThumbsUp.rows.length > 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: 'You have already given this user a thumbs-up',
          already_given: true,
        };
      }

      // Insert new thumbs-up record
      await client.query(
        `INSERT INTO chat_thumbs_up (giver_id, receiver_id, chat_message_id)
         VALUES ($1, $2, $3)`,
        [data.giver_id, data.receiver_id, data.chat_message_id]
      );

      // Update helped_count for the receiver
      await client.query(
        'UPDATE users SET helped_count = helped_count + 1, updated_at = NOW() WHERE id = $1',
        [data.receiver_id]
      );

      // Get updated helped_count
      const updatedUser = await client.query(
        'SELECT helped_count FROM users WHERE id = $1',
        [data.receiver_id]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Thumbs-up given successfully',
        helped_count: updatedUser.rows[0]?.helped_count || 0,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Remove a thumbs-up from a user (if needed)
  async removeThumbsUp(
    giverId: string,
    receiverId: string
  ): Promise<ThumbsUpResponse> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if thumbs-up exists
      const existingThumbsUp = await client.query(
        'SELECT id FROM chat_thumbs_up WHERE giver_id = $1 AND receiver_id = $2',
        [giverId, receiverId]
      );

      if (existingThumbsUp.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: 'No thumbs-up found to remove',
        };
      }

      // Remove thumbs-up record
      await client.query(
        'DELETE FROM chat_thumbs_up WHERE giver_id = $1 AND receiver_id = $2',
        [giverId, receiverId]
      );

      // Update helped_count for the receiver (decrease by 1)
      await client.query(
        'UPDATE users SET helped_count = GREATEST(helped_count - 1, 0), updated_at = NOW() WHERE id = $1',
        [receiverId]
      );

      // Get updated helped_count
      const updatedUser = await client.query(
        'SELECT helped_count FROM users WHERE id = $1',
        [receiverId]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Thumbs-up removed successfully',
        helped_count: updatedUser.rows[0]?.helped_count || 0,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Check if a user has given a thumbs-up to another user
  async hasGivenThumbsUp(
    giverId: string,
    receiverId: string
  ): Promise<boolean> {
    const result = await pool.query(
      'SELECT id FROM chat_thumbs_up WHERE giver_id = $1 AND receiver_id = $2',
      [giverId, receiverId]
    );
    return result.rows.length > 0;
  }

  // Get thumbs-up statistics for a user
  async getThumbsUpStats(userId: string): Promise<{
    helped_count: number;
    thumbs_up_given: number;
  }> {
    // Get helped_count from users table
    const userResult = await pool.query(
      'SELECT helped_count FROM users WHERE id = $1',
      [userId]
    );

    // Get count of thumbs-up given by this user
    const givenResult = await pool.query(
      'SELECT COUNT(*) as count FROM chat_thumbs_up WHERE giver_id = $1',
      [userId]
    );

    return {
      helped_count: userResult.rows[0]?.helped_count || 0,
      thumbs_up_given: parseInt(givenResult.rows[0]?.count || '0'),
    };
  }
}

export const userService = new UserService();
