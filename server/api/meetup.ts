import { Express, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { meetupService } from '../services/meetupService';

export default function meetupApi(app: Express) {
  // Get all meetup categories
  app.get('/api/meetups/categories', async (req: Request, res: Response) => {
    try {
      const categories = await meetupService().getCategories();
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

        const meetupId = await meetupService().createMeetup(userId, {
          category_id,
          title,
          description,
          location,
          meetup_date,
          max_participants,
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

      const meetups = await meetupService().searchMeetups(searchParams, userId);

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
      const meetupId = parseInt(req.params.meetupId);

      if (isNaN(meetupId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid meetup ID',
        });
      }

      const meetup = await meetupService().getMeetup(meetupId, userId);

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

        const meetupId = parseInt(req.params.meetupId);
        if (isNaN(meetupId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid meetup ID',
          });
        }

        await meetupService().expressInterest(meetupId, userId);

        // Get the meetup details to send notification
        const meetup = await meetupService().getMeetup(meetupId);
        if (meetup && meetup.creator) {
          // TODO: Send email and chat message to meetup creator
          // This will be implemented in the notification service
          console.log(
            `User ${userId} expressed interest in meetup ${meetupId} by ${meetup.creator.email}`
          );
        }

        res.json({
          success: true,
          message: 'Interest expressed successfully',
        });
      } catch (error) {
        console.error('Error expressing interest:', error);
        if (
          error instanceof Error &&
          error.message.includes('Already expressed interest')
        ) {
          return res.status(400).json({
            success: false,
            message: error.message,
          });
        }
        res.status(500).json({
          success: false,
          message: 'Failed to express interest',
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

        const meetupId = parseInt(req.params.meetupId);
        if (isNaN(meetupId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid meetup ID',
          });
        }

        await meetupService().removeInterest(meetupId, userId);

        res.json({
          success: true,
          message: 'Interest removed successfully',
        });
      } catch (error) {
        console.error('Error removing interest:', error);
        if (
          error instanceof Error &&
          error.message.includes('No interest found')
        ) {
          return res.status(400).json({
            success: false,
            message: error.message,
          });
        }
        res.status(500).json({
          success: false,
          message: 'Failed to remove interest',
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

        const meetupId = parseInt(req.params.meetupId);
        if (isNaN(meetupId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid meetup ID',
          });
        }

        const { reason } = req.body;
        if (!reason || reason.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Report reason is required',
          });
        }

        const reportId = await meetupService().reportMeetup(
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

        const meetups = await meetupService().getUserMeetups(userId);

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

        const meetups = await meetupService().getUserInterestedMeetups(userId);

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

        const meetupId = parseInt(req.params.meetupId);
        if (isNaN(meetupId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid meetup ID',
          });
        }

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

        await meetupService().updateMeetup(meetupId, userId, updateData);

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

        const meetupId = parseInt(req.params.meetupId);
        if (isNaN(meetupId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid meetup ID',
          });
        }

        await meetupService().deleteMeetup(meetupId, userId);

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
