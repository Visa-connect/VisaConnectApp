import { Express, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { meetupService } from '../services/meetupService';
import { notificationService } from '../services/notificationService';
import { AppError, ErrorCode } from '../types/errors';
import pool from '../db/config';

export default function meetupApi(app: Express) {
  // Get all meetup categories
  app.get('/api/meetups/categories', async (req: Request, res: Response) => {
    try {
      const categories = await meetupService.getCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      console.error('Error fetching meetup categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch meetup categories',
      });
    }
  });

  // Create a new meetup
  app.post(
    '/api/meetups',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
          });
        }

        const {
          category_id,
          title,
          description,
          location,
          meetup_date,
          max_participants,
          photo_url,
          photo_public_id,
        } = req.body;

        // Validate required fields
        if (
          !category_id ||
          !title ||
          !description ||
          !location ||
          !meetup_date
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Missing required fields: category_id, title, description, location, meetup_date',
          });
        }

        // Validate description length (e.g., max 1000 characters)
        if (description.length > 1000) {
          return res.status(400).json({
            success: false,
            message: 'Description must be 1000 characters or less',
          });
        }

        // Validate meetup date is in the future
        const meetupDate = new Date(meetup_date);
        if (meetupDate <= new Date()) {
          return res.status(400).json({
            success: false,
            message: 'Meetup date must be in the future',
          });
        }

        const meetupId = await meetupService.createMeetup(userId, {
          category_id,
          title,
          description,
          location,
          meetup_date,
          max_participants,
          photo_url,
          photo_public_id,
        });

        res.status(201).json({
          success: true,
          data: { meetupId },
          message: 'Meetup created successfully',
        });
      } catch (error) {
        console.error('Error creating meetup:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to create meetup',
        });
      }
    }
  );

  // Get all meetups with search and filters
  app.get('/api/meetups', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.uid; // Optional authentication
      const {
        keyword,
        category_id,
        location,
        date_from,
        date_to,
        limit = 20,
        offset = 0,
      } = req.query;

      const searchParams = {
        keyword: keyword as string,
        category_id: category_id ? parseInt(category_id as string) : undefined,
        location: location as string,
        date_from: date_from as string,
        date_to: date_to as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };

      const meetups = await meetupService.searchMeetups(searchParams, userId);

      res.json({
        success: true,
        data: meetups,
      });
    } catch (error) {
      console.error('Error fetching meetups:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch meetups',
      });
    }
  });

  // Get a specific meetup by ID
  app.get('/api/meetups/:meetupId', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.uid; // Optional authentication
      const meetupId = req.params.meetupId;

      const meetup = await meetupService.getMeetup(meetupId, userId);

      if (!meetup) {
        return res.status(404).json({
          success: false,
          message: 'Meetup not found',
        });
      }

      res.json({
        success: true,
        data: meetup,
      });
    } catch (error) {
      console.error('Error fetching meetup:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch meetup',
      });
    }
  });

  // Express interest in a meetup
  app.post(
    '/api/meetups/:meetupId/interest',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
          });
        }

        const meetupId = req.params.meetupId;

        await meetupService.expressInterest(meetupId, userId);

        // Get the meetup details to send notification
        const meetup = await meetupService.getMeetup(meetupId);
        if (meetup && meetup.creator) {
          // Create notification for the meetup creator
          try {
            const userResult = await pool.query(
              'SELECT first_name, last_name FROM users WHERE id = $1',
              [userId]
            );
            const user = userResult.rows[0] || {};
            const interestedUserName =
              `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
              'Unknown User';

            await notificationService.createMeetupInterestNotification(
              meetup.creator.id,
              interestedUserName,
              meetup.title,
              meetupId
            );
          } catch (notificationError) {
            console.error(
              'Error creating meetup interest notification:',
              notificationError
            );
            // Don't fail the interest expression if notification creation fails
          }
        }

        res.json({
          success: true,
          message: 'Interest expressed successfully',
        });
      } catch (error) {
        console.error('Error expressing interest:', error);

        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to express interest',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  // Remove interest in a meetup
  app.delete(
    '/api/meetups/:meetupId/interest',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
          });
        }

        const meetupId = req.params.meetupId;

        await meetupService.removeInterest(meetupId, userId);

        res.json({
          success: true,
          message: 'Interest removed successfully',
        });
      } catch (error) {
        console.error('Error removing interest:', error);

        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to remove interest',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  // Report a meetup
  app.post(
    '/api/meetups/:meetupId/report',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
          });
        }

        const meetupId = req.params.meetupId;

        const { reason } = req.body;
        if (!reason || reason.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Report reason is required',
          });
        }

        const reportId = await meetupService.reportMeetup(
          meetupId,
          userId,
          reason
        );

        res.status(201).json({
          success: true,
          data: { reportId },
          message: 'Meetup reported successfully',
        });
      } catch (error) {
        console.error('Error reporting meetup:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to report meetup',
        });
      }
    }
  );

  // Get user's created meetups
  app.get(
    '/api/meetups/user/created',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
          });
        }

        const meetups = await meetupService.getUserMeetups(userId);

        res.json({
          success: true,
          data: meetups,
        });
      } catch (error) {
        console.error('Error fetching user meetups:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch user meetups',
        });
      }
    }
  );

  // Get user's interested meetups
  app.get(
    '/api/meetups/user/interested',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
          });
        }

        const meetups = await meetupService.getUserInterestedMeetups(userId);

        res.json({
          success: true,
          data: meetups,
        });
      } catch (error) {
        console.error('Error fetching user interested meetups:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch user interested meetups',
        });
      }
    }
  );

  // Update a meetup (only by creator)
  app.put(
    '/api/meetups/:meetupId',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
          });
        }

        const meetupId = req.params.meetupId;

        const updateData = req.body;

        // Validate description length if provided
        if (updateData.description && updateData.description.length > 1000) {
          return res.status(400).json({
            success: false,
            message: 'Description must be 1000 characters or less',
          });
        }

        // Validate meetup date is in the future if provided
        if (updateData.meetup_date) {
          const meetupDate = new Date(updateData.meetup_date);
          if (meetupDate <= new Date()) {
            return res.status(400).json({
              success: false,
              message: 'Meetup date must be in the future',
            });
          }
        }

        await meetupService.updateMeetup(meetupId, userId, updateData);

        // Notify interested users about the meetup update
        try {
          const meetup = await meetupService.getMeetup(meetupId);
          if (meetup) {
            // Get all users interested in this meetup
            const interestedUsersResult = await pool.query(
              'SELECT user_id FROM meetup_interests WHERE meetup_id = $1',
              [meetupId]
            );

            // Determine what was updated
            const updateTypes: string[] = [];
            if (updateData.title) updateTypes.push('title');
            if (updateData.description) updateTypes.push('description');
            if (updateData.location) updateTypes.push('location');
            if (updateData.meetup_date) updateTypes.push('date/time');
            if (updateData.max_participants !== undefined)
              updateTypes.push('participant limit');
            if (updateData.is_active !== undefined) updateTypes.push('status');

            const updateType =
              updateTypes.length > 0 ? updateTypes.join(', ') : 'details';

            // Create notifications for all interested users
            for (const row of interestedUsersResult.rows) {
              try {
                await notificationService.createMeetupUpdateNotification(
                  row.user_id,
                  meetup.title,
                  meetupId,
                  updateType
                );
              } catch (notificationError) {
                console.error(
                  `Error creating meetup update notification for user ${row.user_id}:`,
                  notificationError
                );
                // Continue with other users even if one fails
              }
            }
          }
        } catch (notificationError) {
          console.error(
            'Error creating meetup update notifications:',
            notificationError
          );
          // Don't fail the meetup update if notification creation fails
        }

        res.json({
          success: true,
          message: 'Meetup updated successfully',
        });
      } catch (error) {
        console.error('Error updating meetup:', error);
        if (
          error instanceof Error &&
          error.message.includes('Only the creator can update')
        ) {
          return res.status(403).json({
            success: false,
            message: error.message,
          });
        }
        res.status(500).json({
          success: false,
          message: 'Failed to update meetup',
        });
      }
    }
  );

  // Delete a meetup (only by creator)
  app.delete(
    '/api/meetups/:meetupId',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
          });
        }

        const meetupId = req.params.meetupId;

        await meetupService.deleteMeetup(meetupId, userId);

        res.json({
          success: true,
          message: 'Meetup deleted successfully',
        });
      } catch (error) {
        console.error('Error deleting meetup:', error);
        if (
          error instanceof Error &&
          error.message.includes('Only the creator can delete')
        ) {
          return res.status(403).json({
            success: false,
            message: error.message,
          });
        }
        res.status(500).json({
          success: false,
          message: 'Failed to delete meetup',
        });
      }
    }
  );
}
