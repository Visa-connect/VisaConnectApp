import { Request, Response } from 'express';
import {
  businessService,
  BusinessSubmission,
} from '../services/businessService';
import { emailService } from '../services/emailService';
import { authenticateUser } from '../middleware/auth';
import { authenticateAdmin } from '../middleware/adminAuth';
import admin from 'firebase-admin';

// Helper function to check if user is admin using Firebase claims
const checkAdminStatus = async (userId: string): Promise<boolean> => {
  try {
    const userRecord = await admin.auth().getUser(userId);
    const customClaims = userRecord.customClaims;
    return !!(customClaims?.admin && customClaims?.role === 'admin');
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

export const businessApi = (app: any) => {
  /**
   * Submit a new business for verification
   * POST /api/business/submit
   */
  app.post(
    '/api/business/submit',
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

        const businessData: BusinessSubmission = {
          businessName: req.body.businessName,
          yearFormed: parseInt(req.body.yearFormed),
          ownerName: req.body.ownerName,
          businessAddress: req.body.businessAddress,
          missionStatement: req.body.missionStatement,
          logoUrl: req.body.logoUrl,
          logoPublicId: req.body.logoPublicId,
        };

        // Validate required fields
        if (
          !businessData.businessName ||
          !businessData.yearFormed ||
          !businessData.ownerName ||
          !businessData.missionStatement
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Missing required fields: businessName, yearFormed, ownerName, missionStatement',
          });
        }

        // Validate year format
        if (
          isNaN(businessData.yearFormed) ||
          businessData.yearFormed < 1900 ||
          businessData.yearFormed > new Date().getFullYear()
        ) {
          return res.status(400).json({
            success: false,
            message: 'Invalid year format',
          });
        }

        const business = await businessService.submitBusiness(
          userId,
          businessData
        );

        // Send email notification to admin
        try {
          await emailService.sendBusinessSubmissionNotification({
            businessName: businessData.businessName,
            ownerName: businessData.ownerName,
            yearFormed: businessData.yearFormed,
            businessAddress: businessData.businessAddress,
            missionStatement: businessData.missionStatement,
            submittedAt: business.submitted_at,
            userEmail: req.user?.email || '',
            userName: `${req.user?.first_name || ''} ${
              req.user?.last_name || ''
            }`.trim(),
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          // Don't fail the request if email fails
        }

        res.status(201).json({
          success: true,
          message: 'Business submitted successfully for verification',
          data: business,
        });
      } catch (error) {
        console.error('Error submitting business:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to submit business',
        });
      }
    }
  );

  /**
   * Get user's businesses
   * GET /api/business/user
   */
  app.get(
    '/api/business/user',
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

        const businesses = await businessService.getBusinessesByUserId(userId);

        res.json({
          success: true,
          data: businesses,
        });
      } catch (error) {
        console.error('Error fetching user businesses:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch businesses',
        });
      }
    }
  );

  /**
   * Get business by ID
   * GET /api/business/:id
   */
  app.get(
    '/api/business/:id',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.id);
        if (isNaN(businessId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid business ID',
          });
        }

        const business = await businessService.getBusinessById(businessId);
        if (!business) {
          return res.status(404).json({
            success: false,
            message: 'Business not found',
          });
        }

        // Check if user owns the business or is admin
        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
          });
        }

        const isAdmin = await checkAdminStatus(userId);
        if (business.user_id !== userId && !isAdmin) {
          return res.status(403).json({
            success: false,
            message: 'Access denied',
          });
        }

        res.json({
          success: true,
          data: business,
        });
      } catch (error) {
        console.error('Error fetching business:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch business',
        });
      }
    }
  );

  /**
   * Update business
   * PUT /api/business/:id
   */
  app.put(
    '/api/business/:id',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.id);
        if (isNaN(businessId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid business ID',
          });
        }

        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
          });
        }

        const updateData: Partial<BusinessSubmission> = {
          businessName: req.body.businessName,
          yearFormed: req.body.yearFormed
            ? parseInt(req.body.yearFormed)
            : undefined,
          ownerName: req.body.ownerName,
          businessAddress: req.body.businessAddress,
          missionStatement: req.body.missionStatement,
          logoUrl: req.body.logoUrl,
          logoPublicId: req.body.logoPublicId,
        };

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
          if (updateData[key as keyof BusinessSubmission] === undefined) {
            delete updateData[key as keyof BusinessSubmission];
          }
        });

        const business = await businessService.updateBusiness(
          businessId,
          userId,
          updateData
        );

        res.json({
          success: true,
          message: 'Business updated successfully',
          data: business,
        });
      } catch (error) {
        console.error('Error updating business:', error);
        if (
          error instanceof Error &&
          error.message === 'Business not found or access denied'
        ) {
          return res.status(404).json({
            success: false,
            message: 'Business not found or access denied',
          });
        }
        res.status(500).json({
          success: false,
          message: 'Failed to update business',
        });
      }
    }
  );

  /**
   * Delete business
   * DELETE /api/business/:id
   */
  app.delete(
    '/api/business/:id',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.id);
        if (isNaN(businessId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid business ID',
          });
        }

        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
          });
        }

        const deleted = await businessService.deleteBusiness(
          businessId,
          userId
        );
        if (!deleted) {
          return res.status(404).json({
            success: false,
            message: 'Business not found or access denied',
          });
        }

        res.json({
          success: true,
          message: 'Business deleted successfully',
        });
      } catch (error) {
        console.error('Error deleting business:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to delete business',
        });
      }
    }
  );

  /**
   * Get business categories
   * GET /api/business/categories
   */
  app.get('/api/business/categories', async (req: Request, res: Response) => {
    try {
      const categories = await businessService.getBusinessCategories();

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error('Error fetching business categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch business categories',
      });
    }
  });

  /**
   * Admin: Get pending businesses
   * GET /api/business/admin/pending
   */
  app.get(
    '/api/business/admin/pending',
    authenticateAdmin,
    async (req: Request, res: Response) => {
      try {
        const businesses = await businessService.getPendingBusinesses();

        res.json({
          success: true,
          data: businesses,
        });
      } catch (error) {
        console.error('Error fetching pending businesses:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch pending businesses',
        });
      }
    }
  );

  /**
   * Admin: Update business status
   * PUT /api/business/admin/:id/status
   */
  app.put(
    '/api/business/admin/:id/status',
    authenticateAdmin,
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.id);
        if (isNaN(businessId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid business ID',
          });
        }

        const { status, adminNotes } = req.body;
        if (!status || !['approved', 'rejected'].includes(status)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid status. Must be "approved" or "rejected"',
          });
        }

        const business = await businessService.updateBusinessStatus(
          businessId,
          status,
          adminNotes
        );

        // Send email notification to user
        try {
          // Get user email from the business data (includes user info from join)
          const userEmail = (business as any).email;
          if (userEmail) {
            await emailService.sendBusinessStatusUpdate(
              userEmail,
              business.name,
              status,
              adminNotes
            );
          }
        } catch (emailError) {
          console.error('Failed to send status update email:', emailError);
          // Don't fail the request if email fails
        }

        res.json({
          success: true,
          message: `Business ${status} successfully`,
          data: business,
        });
      } catch (error) {
        console.error('Error updating business status:', error);
        if (error instanceof Error && error.message === 'Business not found') {
          return res.status(404).json({
            success: false,
            message: 'Business not found',
          });
        }
        res.status(500).json({
          success: false,
          message: 'Failed to update business status',
        });
      }
    }
  );
};
