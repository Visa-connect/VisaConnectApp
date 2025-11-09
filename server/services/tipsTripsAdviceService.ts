import pool from '../db/config';
import { v4 as uuidv4 } from 'uuid';
import {
  TipsTripsAdvice,
  TipsTripsAdvicePhoto,
  TipsTripsAdviceComment,
  CreateTipsTripsAdviceRequest,
  UpdateTipsTripsAdviceRequest,
  SearchTipsTripsAdviceRequest,
  PostType,
} from '../types/tipsTripsAdvice';
import {
  AppError,
  ErrorCode,
  NotFoundError,
  ValidationError,
  DatabaseError,
} from '../types/errors';

export class TipsTripsAdviceService {
  // Create a new Tips, Trips, or Advice post
  async createPost(
    postData: CreateTipsTripsAdviceRequest,
    creatorId: string
  ): Promise<string> {
    try {
      // Validate required fields
      if (!postData.title || !postData.description || !postData.post_type) {
        throw new ValidationError(
          'Title, description, and post type are required'
        );
      }

      // Validate post type
      if (!['tip', 'trip', 'advice'].includes(postData.post_type)) {
        throw new ValidationError('Post type must be tip, trip, or advice');
      }

      // Validate title length
      if (postData.title.length > 200) {
        throw new ValidationError('Title must be 200 characters or less');
      }

      // Start transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const postId = uuidv4();

        // Insert the main post
        await client.query(
          `INSERT INTO tips_trips_advice (id, title, description, creator_id, post_type)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            postId,
            postData.title,
            postData.description,
            creatorId,
            postData.post_type,
          ]
        );

        // Insert photos if provided
        if (postData.photos && postData.photos.length > 0) {
          for (let i = 0; i < postData.photos.length; i++) {
            const photo = postData.photos[i];

            // Validate that photo_url is not null or empty
            if (!photo.photo_url) {
              console.error(`Photo ${i + 1} is missing photo_url:`, photo);
              throw new Error(`Photo upload failed: missing image data`);
            }

            await client.query(
              `INSERT INTO tips_trips_advice_photos (post_id, photo_url, photo_public_id, display_order)
               VALUES ($1, $2, $3, $4)`,
              [
                postId,
                photo.photo_url,
                photo.photo_public_id || null, // Allow null for photo_public_id
                photo.display_order || i + 1,
              ]
            );
          }
        }

        await client.query('COMMIT');
        return postId;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating post:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new DatabaseError('Failed to create post', error as Error);
    }
  }

  // Get a single post by ID
  async getPostById(postId: string, userId?: string): Promise<TipsTripsAdvice> {
    try {
      const query = `
        SELECT 
          t.*,
          u.first_name, u.last_name, u.email, u.profile_photo_url,
          COALESCE(like_counts.likes_count, 0) as likes_count,
          COALESCE(comment_counts.comments_count, 0) as comments_count,
          CASE WHEN user_likes.post_id IS NOT NULL THEN true ELSE false END as is_liked
        FROM tips_trips_advice t
        LEFT JOIN users u ON t.creator_id = u.id
        LEFT JOIN (
          SELECT post_id, COUNT(*) as likes_count
          FROM tips_trips_advice_likes
          GROUP BY post_id
        ) like_counts ON t.id = like_counts.post_id
        LEFT JOIN (
          SELECT post_id, COUNT(*) as comments_count
          FROM tips_trips_advice_comments
          WHERE is_active = true
          GROUP BY post_id
        ) comment_counts ON t.id = comment_counts.post_id
        LEFT JOIN (
          SELECT DISTINCT post_id
          FROM tips_trips_advice_likes
          ${userId ? 'WHERE user_id = $2' : 'WHERE 1=0'}
        ) user_likes ON t.id = user_likes.post_id
        WHERE t.id = $1 AND t.is_active = true
      `;

      const params = userId ? [postId, userId] : [postId];
      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        throw new NotFoundError('Post not found');
      }

      const post = result.rows[0];

      // Get photos
      const photosResult = await pool.query(
        'SELECT * FROM tips_trips_advice_photos WHERE post_id = $1 ORDER BY display_order',
        [postId]
      );

      // Get comments with user info
      const commentsResult = await pool.query(
        `SELECT c.*, u.first_name, u.last_name, u.email, u.profile_photo_url
         FROM tips_trips_advice_comments c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.post_id = $1 AND c.is_active = true
         ORDER BY c.created_at ASC`,
        [postId]
      );

      // Get likes with user info
      const likesResult = await pool.query(
        `SELECT l.*, u.first_name, u.last_name, u.email, u.profile_photo_url
         FROM tips_trips_advice_likes l
         LEFT JOIN users u ON l.user_id = u.id
         WHERE l.post_id = $1
         ORDER BY l.created_at ASC`,
        [postId]
      );

      return {
        id: post.id,
        title: post.title,
        description: post.description,
        creator_id: post.creator_id,
        post_type: post.post_type,
        is_active: post.is_active,
        created_at: post.created_at,
        updated_at: post.updated_at,
        creator: {
          id: post.creator_id,
          first_name: post.first_name,
          last_name: post.last_name,
          email: post.email,
          profile_photo_url: post.profile_photo_url,
        },
        photos: photosResult.rows,
        comments: commentsResult.rows.map((comment) => ({
          ...comment,
          user: {
            id: comment.user_id,
            first_name: comment.first_name,
            last_name: comment.last_name,
            email: comment.email,
            profile_photo_url: comment.profile_photo_url,
          },
        })),
        likes: likesResult.rows.map((like) => ({
          ...like,
          user: {
            id: like.user_id,
            first_name: like.first_name,
            last_name: like.last_name,
            email: like.email,
            profile_photo_url: like.profile_photo_url,
          },
        })),
        likes_count: parseInt(post.likes_count) || 0,
        comments_count: parseInt(post.comments_count) || 0,
        is_liked: post.is_liked || false,
      };
    } catch (error) {
      console.error('Error fetching post:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new DatabaseError('Failed to fetch post', error as Error);
    }
  }

  // Search posts with filters
  async searchPosts(
    searchParams: SearchTipsTripsAdviceRequest,
    userId?: string
  ): Promise<TipsTripsAdvice[]> {
    try {
      let query = `
        SELECT 
          t.*,
          u.first_name, u.last_name, u.email, u.profile_photo_url,
          COALESCE(like_counts.likes_count, 0) as likes_count,
          COALESCE(comment_counts.comments_count, 0) as comments_count,
          CASE WHEN user_likes.post_id IS NOT NULL THEN true ELSE false END as is_liked
        FROM tips_trips_advice t
        LEFT JOIN users u ON t.creator_id = u.id
        LEFT JOIN (
          SELECT post_id, COUNT(*) as likes_count
          FROM tips_trips_advice_likes
          GROUP BY post_id
        ) like_counts ON t.id = like_counts.post_id
        LEFT JOIN (
          SELECT post_id, COUNT(*) as comments_count
          FROM tips_trips_advice_comments
          WHERE is_active = true
          GROUP BY post_id
        ) comment_counts ON t.id = comment_counts.post_id
        LEFT JOIN (
          SELECT DISTINCT post_id
          FROM tips_trips_advice_likes
          ${userId ? 'WHERE user_id = $1' : 'WHERE 1=0'}
        ) user_likes ON t.id = user_likes.post_id
        WHERE t.is_active = true
      `;

      const params: any[] = [];
      let paramCount = 0;

      // Add userId parameter if provided
      if (userId) {
        params.push(userId);
        paramCount = 1;
      }

      // Apply filters
      if (searchParams.post_type) {
        paramCount++;
        query += ` AND t.post_type = $${paramCount}`;
        params.push(searchParams.post_type);
      }

      if (searchParams.creator_id) {
        paramCount++;
        query += ` AND t.creator_id = $${paramCount}`;
        params.push(searchParams.creator_id);
      }

      if (searchParams.search) {
        paramCount++;
        query += ` AND (t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`;
        params.push(`%${searchParams.search}%`);
      }

      // Add ordering and pagination
      query += ` ORDER BY t.created_at DESC`;

      if (searchParams.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(searchParams.limit);

        if (searchParams.page) {
          paramCount++;
          query += ` OFFSET $${paramCount}`;
          params.push((searchParams.page - 1) * searchParams.limit);
        }
      }

      const result = await pool.query(query, params);
      const posts = result.rows;

      // Get photos for each post
      for (const post of posts) {
        const photosResult = await pool.query(
          'SELECT * FROM tips_trips_advice_photos WHERE post_id = $1 ORDER BY display_order',
          [post.id]
        );
        post.photos = photosResult.rows;
      }

      return posts.map((post) => ({
        id: post.id,
        title: post.title,
        description: post.description,
        creator_id: post.creator_id,
        post_type: post.post_type,
        is_active: post.is_active,
        created_at: post.created_at,
        updated_at: post.updated_at,
        creator: {
          id: post.creator_id,
          first_name: post.first_name,
          last_name: post.last_name,
          email: post.email,
          profile_photo_url: post.profile_photo_url,
        },
        photos: post.photos || [],
        comments: [],
        likes: [],
        likes_count: parseInt(post.likes_count) || 0,
        comments_count: parseInt(post.comments_count) || 0,
        is_liked: post.is_liked || false,
      }));
    } catch (error) {
      console.error('Error searching posts:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new DatabaseError('Failed to search posts', error as Error);
    }
  }

  // Update a post
  async updatePost(
    postId: string,
    updateData: UpdateTipsTripsAdviceRequest,
    userId: string
  ): Promise<void> {
    try {
      // Check if post exists and user is the creator
      const postResult = await pool.query(
        'SELECT creator_id FROM tips_trips_advice WHERE id = $1 AND is_active = true',
        [postId]
      );

      if (postResult.rows.length === 0) {
        throw new NotFoundError('Post not found');
      }

      if (postResult.rows[0].creator_id !== userId) {
        throw new AppError(
          'You can only update your own posts',
          ErrorCode.INVALID_ACCESS,
          403
        );
      }

      // Validate post type if provided
      if (
        updateData.post_type &&
        !['tip', 'trip', 'advice'].includes(updateData.post_type)
      ) {
        throw new ValidationError('Post type must be tip, trip, or advice');
      }

      // Validate title length if provided
      if (updateData.title && updateData.title.length > 200) {
        throw new ValidationError('Title must be 200 characters or less');
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Update the main post
        const updateFields = [];
        const updateValues = [];
        let paramCount = 0;

        if (updateData.title !== undefined) {
          paramCount++;
          updateFields.push(`title = $${paramCount}`);
          updateValues.push(updateData.title);
        }

        if (updateData.description !== undefined) {
          paramCount++;
          updateFields.push(`description = $${paramCount}`);
          updateValues.push(updateData.description);
        }

        if (updateData.post_type !== undefined) {
          paramCount++;
          updateFields.push(`post_type = $${paramCount}`);
          updateValues.push(updateData.post_type);
        }

        if (updateFields.length > 0) {
          paramCount++;
          updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
          updateValues.push(postId);

          await client.query(
            `UPDATE tips_trips_advice SET ${updateFields.join(
              ', '
            )} WHERE id = $${paramCount}`,
            updateValues
          );
        }

        // Handle photo updates with granular control
        const hasPhotoChanges =
          updateData.photos !== undefined ||
          updateData.photosToKeep !== undefined;

        if (hasPhotoChanges) {
          // If photosToKeep is provided, delete photos not in the list
          if (updateData.photosToKeep !== undefined) {
            if (updateData.photosToKeep.length === 0) {
              // Delete all photos if none are specified to keep
              await client.query(
                'DELETE FROM tips_trips_advice_photos WHERE post_id = $1',
                [postId]
              );
            } else {
              // Delete photos not in the photosToKeep list
              const placeholders = updateData.photosToKeep
                .map((_, index) => `$${index + 2}`)
                .join(',');
              await client.query(
                `DELETE FROM tips_trips_advice_photos WHERE post_id = $1 AND id NOT IN (${placeholders})`,
                [postId, ...updateData.photosToKeep]
              );
            }
          }

          // Add new photos if provided
          if (updateData.photos && updateData.photos.length > 0) {
            // Get current photo count to determine display_order
            const currentPhotoCountResult = await client.query(
              'SELECT COUNT(*) as count FROM tips_trips_advice_photos WHERE post_id = $1',
              [postId]
            );
            const currentPhotoCount = parseInt(
              currentPhotoCountResult.rows[0].count
            );

            for (let i = 0; i < updateData.photos.length; i++) {
              const photo = updateData.photos[i];
              await client.query(
                `INSERT INTO tips_trips_advice_photos (post_id, photo_url, photo_public_id, display_order)
                 VALUES ($1, $2, $3, $4)`,
                [
                  postId,
                  photo.photo_url,
                  photo.photo_public_id,
                  photo.display_order || currentPhotoCount + i + 1,
                ]
              );
            }
          }
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating post:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new DatabaseError('Failed to update post', error as Error);
    }
  }

  // Delete a post
  async deletePost(postId: string, userId: string): Promise<void> {
    try {
      // Check if post exists and user is the creator
      const postResult = await pool.query(
        'SELECT creator_id FROM tips_trips_advice WHERE id = $1 AND is_active = true',
        [postId]
      );

      if (postResult.rows.length === 0) {
        throw new NotFoundError('Post not found');
      }

      if (postResult.rows[0].creator_id !== userId) {
        throw new AppError(
          'You can only delete your own posts',
          ErrorCode.INVALID_ACCESS,
          403
        );
      }

      // Soft delete the post
      await pool.query(
        'UPDATE tips_trips_advice SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [postId]
      );
    } catch (error) {
      console.error('Error deleting post:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new DatabaseError('Failed to delete post', error as Error);
    }
  }

  // Add a comment to a post
  async addComment(
    postId: string,
    comment: string,
    userId: string
  ): Promise<TipsTripsAdviceComment> {
    try {
      if (!comment || comment.trim().length === 0) {
        throw new ValidationError('Comment cannot be empty');
      }

      // Check if post exists
      const postResult = await pool.query(
        'SELECT id FROM tips_trips_advice WHERE id = $1 AND is_active = true',
        [postId]
      );

      if (postResult.rows.length === 0) {
        throw new NotFoundError('Post not found');
      }

      // Insert comment
      const result = await pool.query(
        `INSERT INTO tips_trips_advice_comments (post_id, user_id, comment)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [postId, userId, comment.trim()]
      );

      // Get user info for the comment
      const userResult = await pool.query(
        'SELECT id, first_name, last_name, email, profile_photo_url FROM users WHERE id = $1',
        [userId]
      );

      const user = userResult.rows[0];

      return {
        ...result.rows[0],
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          profile_photo_url: user.profile_photo_url,
        },
      };
    } catch (error) {
      console.error('Error adding comment:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new DatabaseError('Failed to add comment', error as Error);
    }
  }

  // Like/unlike a post
  async toggleLike(
    postId: string,
    userId: string
  ): Promise<{ liked: boolean }> {
    try {
      // Check if post exists
      const postResult = await pool.query(
        'SELECT id FROM tips_trips_advice WHERE id = $1 AND is_active = true',
        [postId]
      );

      if (postResult.rows.length === 0) {
        throw new NotFoundError('Post not found');
      }

      // Check if already liked
      const existingLike = await pool.query(
        'SELECT id FROM tips_trips_advice_likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );

      if (existingLike.rows.length > 0) {
        // Unlike
        await pool.query(
          'DELETE FROM tips_trips_advice_likes WHERE post_id = $1 AND user_id = $2',
          [postId, userId]
        );
        return { liked: false };
      } else {
        // Like
        await pool.query(
          'INSERT INTO tips_trips_advice_likes (post_id, user_id) VALUES ($1, $2)',
          [postId, userId]
        );
        return { liked: true };
      }
    } catch (error) {
      console.error('Error toggling like:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new DatabaseError('Failed to toggle like', error as Error);
    }
  }

  // Get user's posts
  async getUserPosts(
    userId: string,
    postType?: PostType
  ): Promise<TipsTripsAdvice[]> {
    try {
      let query = `
        SELECT 
          t.*,
          u.first_name, u.last_name, u.email, u.profile_photo_url,
          COALESCE(like_counts.likes_count, 0) as likes_count,
          COALESCE(comment_counts.comments_count, 0) as comments_count
        FROM tips_trips_advice t
        LEFT JOIN users u ON t.creator_id = u.id
        LEFT JOIN (
          SELECT post_id, COUNT(*) as likes_count
          FROM tips_trips_advice_likes
          GROUP BY post_id
        ) like_counts ON t.id = like_counts.post_id
        LEFT JOIN (
          SELECT post_id, COUNT(*) as comments_count
          FROM tips_trips_advice_comments
          WHERE is_active = true
          GROUP BY post_id
        ) comment_counts ON t.id = comment_counts.post_id
        WHERE t.creator_id = $1 AND t.is_active = true
      `;

      const params: any[] = [userId];

      if (postType) {
        query += ` AND t.post_type = $2`;
        params.push(postType);
      }

      query += ` ORDER BY t.created_at DESC`;

      const result = await pool.query(query, params);
      const posts = result.rows;

      // Get photos for each post
      for (const post of posts) {
        const photosResult = await pool.query(
          'SELECT * FROM tips_trips_advice_photos WHERE post_id = $1 ORDER BY display_order',
          [post.id]
        );
        post.photos = photosResult.rows;
      }

      return posts.map((post) => ({
        id: post.id,
        title: post.title,
        description: post.description,
        creator_id: post.creator_id,
        post_type: post.post_type,
        is_active: post.is_active,
        created_at: post.created_at,
        updated_at: post.updated_at,
        creator: {
          id: post.creator_id,
          first_name: post.first_name,
          last_name: post.last_name,
          email: post.email,
          profile_photo_url: post.profile_photo_url,
        },
        photos: post.photos || [],
        comments: [],
        likes: [],
        likes_count: parseInt(post.likes_count) || 0,
        comments_count: parseInt(post.comments_count) || 0,
        is_liked: false,
      }));
    } catch (error) {
      console.error('Error fetching user posts:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new DatabaseError('Failed to fetch user posts', error as Error);
    }
  }
}

export const tipsTripsAdviceService = new TipsTripsAdviceService();
