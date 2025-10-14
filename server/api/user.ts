import { Express, Request, Response } from 'express';
import { userService } from '../services/userService';
import { authenticateUser } from '../middleware/auth';
import { authenticateAdmin } from '../middleware/adminAuth';
import admin from 'firebase-admin';

export default function userApi(app: Express) {
  // Get current user profile (requires authentication)
  app.get(
    '/api/user/profile',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const user = await userService.getUserById(req.user!.uid);

        if (!user) {
          return res.status(404).json({
            error: 'User not found',
            message: 'User profile not found in database',
          });
        }

        res.json({
          success: true,
          data: user,
        });
      } catch (error: any) {
        console.error('Get profile error:', error);
        res.status(500).json({
          error: 'Failed to get profile',
          message: error.message || 'Failed to retrieve user profile',
        });
      }
    }
  );

  // Get user by Firebase UID (requires authentication)
  app.get(
    '/api/user/:uid',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const { uid } = req.params;
        const user = await userService.getUserById(uid);

        if (!user) {
          return res.status(404).json({
            error: 'User not found',
            message: 'User profile not found in database',
          });
        }

        res.json({
          success: true,
          data: user,
        });
      } catch (error: any) {
        console.error('Get user by UID error:', error);
        res.status(500).json({
          error: 'Failed to get user',
          message: error.message || 'Failed to retrieve user profile',
        });
      }
    }
  );

  // Update basic user profile (requires authentication)
  app.put(
    '/api/user/profile',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const updates = req.body;
        const user = await userService.updateUser(req.user!.uid, updates);

        if (!user) {
          return res.status(404).json({
            error: 'User not found',
            message: 'User profile not found in database',
          });
        }

        res.json({
          success: true,
          message: 'Profile updated successfully',
          data: user,
        });
      } catch (error: any) {
        console.error('Update profile error:', error);
        res.status(500).json({
          error: 'Failed to update profile',
          message: error.message || 'Failed to update user profile',
        });
      }
    }
  );

  // PATCH endpoint for partial profile updates (requires authentication)
  app.patch(
    '/api/user/profile',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const updates = req.body;
        const user = await userService.updateUser(req.user!.uid, updates);

        if (!user) {
          return res.status(404).json({
            error: 'User not found',
            message: 'User profile not found in database',
          });
        }

        res.json({
          success: true,
          message: 'Profile updated successfully',
          data: user,
        });
      } catch (error: any) {
        console.error('Update profile error:', error);
        res.status(500).json({
          error: 'Failed to update profile',
          message: error.message || 'Failed to update user profile',
        });
      }
    }
  );

  // Update detailed profile information (requires authentication)
  app.put(
    '/api/user/profile/details',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const profileData = req.body;
        const user = await userService.updateProfileDetails(
          req.user!.uid,
          profileData
        );

        if (!user) {
          return res.status(404).json({
            error: 'User not found',
            message: 'User profile not found in database',
          });
        }

        res.json({
          success: true,
          message: 'Detailed profile updated successfully',
          data: user,
        });
      } catch (error: any) {
        console.error('Update detailed profile error:', error);
        res.status(500).json({
          error: 'Failed to update detailed profile',
          message: error.message || 'Failed to update detailed profile',
        });
      }
    }
  );

  // PATCH endpoint for detailed profile updates (requires authentication)
  app.patch(
    '/api/user/profile/details',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const profileData = req.body;
        const user = await userService.updateProfileDetails(
          req.user!.uid,
          profileData
        );

        if (!user) {
          return res.status(404).json({
            error: 'User not found',
            message: 'User profile not found in database',
          });
        }

        res.json({
          success: true,
          message: 'Detailed profile updated successfully',
          data: user,
        });
      } catch (error: any) {
        console.error('Update detailed profile error:', error);
        res.status(500).json({
          error: 'Failed to update detailed profile',
          message: error.message || 'Failed to update detailed profile',
        });
      }
    }
  );

  // Update specific profile section (requires authentication)
  app.put(
    '/api/user/profile/section/:section',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const { section } = req.params;
        const sectionData = req.body;

        const user = await userService.updateUser(req.user!.uid, sectionData);

        if (!user) {
          return res.status(404).json({
            error: 'User not found',
            message: 'User profile not found in database',
          });
        }

        res.json({
          success: true,
          message: `${section} profile section updated successfully`,
          data: user,
        });
      } catch (error: any) {
        console.error('Update profile section error:', error);
        res.status(500).json({
          error: 'Failed to update profile section',
          message: error.message || 'Failed to update profile section',
        });
      }
    }
  );

  // PATCH endpoint for specific profile section updates (requires authentication)
  app.patch(
    '/api/user/profile/section/:section',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const { section } = req.params;
        const sectionData = req.body;

        const user = await userService.updateUser(req.user!.uid, sectionData);

        if (!user) {
          return res.status(404).json({
            error: 'User not found',
            message: 'User profile not found in database',
          });
        }

        res.json({
          success: true,
          message: `${section} profile section updated successfully`,
          data: user,
        });
      } catch (error: any) {
        console.error('Update profile section error:', error);
        res.status(500).json({
          error: 'Failed to update profile section',
          message: error.message || 'Failed to update profile section',
        });
      }
    }
  );

  // Search users by criteria (requires authentication)
  app.get(
    '/api/user/search',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const { visa_type, location, interests } = req.query;

        const criteria: any = {};
        if (visa_type) criteria.visa_type = visa_type as string;
        if (location) criteria.location = JSON.parse(location as string);
        if (interests)
          criteria.interests = Array.isArray(interests)
            ? interests
            : [interests];

        const users = await userService.searchUsers(criteria);

        res.json({
          success: true,
          data: users,
          count: users.length,
        });
      } catch (error: any) {
        console.error('Search users error:', error);
        res.status(500).json({
          error: 'Failed to search users',
          message: error.message || 'Failed to search users',
        });
      }
    }
  );

  // Admin: Get all users with pagination (admin only)
  app.get(
    '/api/admin/users',
    authenticateAdmin,
    async (req: Request, res: Response) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const users = await userService.getAllUsers(limit, offset);

        res.json({
          success: true,
          data: users,
          count: users.length,
          pagination: {
            limit,
            offset,
            hasMore: users.length === limit,
          },
        });
      } catch (error: any) {
        console.error('Get all users error:', error);
        res.status(500).json({
          error: 'Failed to get users',
          message: error.message || 'Failed to retrieve users',
        });
      }
    }
  );

  // Legacy endpoint - redirects to admin endpoint
  app.get(
    '/api/user/all',
    authenticateAdmin,
    async (req: Request, res: Response) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const users = await userService.getAllUsers(limit, offset);

        res.json({
          success: true,
          data: users,
          count: users.length,
          pagination: {
            limit,
            offset,
            hasMore: users.length === limit,
          },
        });
      } catch (error: any) {
        console.error('Get all users error:', error);
        res.status(500).json({
          error: 'Failed to get users',
          message: error.message || 'Failed to retrieve users',
        });
      }
    }
  );

  // Delete user account (requires authentication)
  app.delete(
    '/api/user/:userId',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;

        // 1. Delete from PostgreSQL first
        const deleted = await userService.deleteUser(userId);

        if (!deleted) {
          return res.status(404).json({
            error: 'User not found',
            message: 'User account not found in database',
          });
        }

        // 2. Delete from Firebase
        await admin.auth().deleteUser(userId);

        res.json({
          success: true,
          message: 'Account deleted successfully',
        });
      } catch (error: any) {
        console.error('Delete account error:', error);
        res.status(500).json({
          error: 'Failed to delete account',
          message: error.message || 'Failed to delete user account',
        });
      }
    }
  );

  // Search users by text query (for Connect screen)
  app.get(
    '/api/users/search',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const { q: searchQuery } = req.query;
        const currentUserId = req.user!.uid;

        if (!searchQuery || typeof searchQuery !== 'string') {
          return res.status(400).json({
            error: 'Invalid search query',
            message: 'Search query is required',
          });
        }

        if (searchQuery.trim().length < 2) {
          return res.status(400).json({
            error: 'Search query too short',
            message: 'Search query must be at least 2 characters',
          });
        }

        const users = await userService.searchUsersByText(
          searchQuery.trim(),
          currentUserId
        );

        res.json({
          success: true,
          data: users,
          count: users.length,
        });
      } catch (error: any) {
        console.error('User search error:', error);
        res.status(500).json({
          error: 'Search failed',
          message: error.message || 'Failed to search users',
        });
      }
    }
  );
}
