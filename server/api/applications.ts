import { Express, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import applicationsService, {
  ApplicationSubmission,
  ApplicationFilters,
} from '../services/applicationsService';
import { AppError, ErrorCode } from '../types/errors';

export default function applicationsApi(app: Express) {
  // Submit a new job application
  app.post(
    '/api/applications',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const {
          job_id,
          qualifications,
          location,
          visa_type,
          start_date,
          resume_url,
          resume_filename,
        } = req.body;

        // Validate required fields
        if (!job_id || !qualifications || !location || !start_date) {
          throw new AppError(
            'Missing required fields: job_id, qualifications, location, start_date',
            ErrorCode.VALIDATION_ERROR
          );
        }

        // Check if user has already applied to this job
        const hasApplied = await applicationsService.hasUserAppliedToJob(
          job_id,
          userId
        );
        if (hasApplied) {
          throw new AppError(
            'You have already applied to this job',
            ErrorCode.CONFLICT
          );
        }

        const applicationData: ApplicationSubmission = {
          job_id: parseInt(job_id),
          user_id: userId,
          qualifications,
          location,
          visa_type,
          start_date,
          resume_url,
          resume_filename,
        };

        const application = await applicationsService.createApplication(
          applicationData
        );

        res.status(201).json({
          success: true,
          message: 'Application submitted successfully',
          data: application,
        });
      } catch (error) {
        console.error('Error creating application:', error);

        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errorCode: error.code,
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to submit application',
            errorCode: ErrorCode.INTERNAL_ERROR,
          });
        }
      }
    }
  );

  // Get applications for a specific job (business owners only)
  app.get(
    '/api/applications/job/:jobId',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const jobId = parseInt(req.params.jobId);
        if (isNaN(jobId)) {
          throw new AppError('Invalid job ID', ErrorCode.VALIDATION_ERROR);
        }

        const {
          status,
          limit = 20,
          offset = 0,
          order_by = 'created_at',
          order_direction = 'DESC',
        } = req.query;

        const filters: ApplicationFilters = {
          job_id: jobId,
          status: status as any,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          order_by: order_by as any,
          order_direction: order_direction as any,
        };

        const result = await applicationsService.getApplicationsByJob(
          jobId,
          filters
        );

        res.json({
          success: true,
          data: result.applications,
          pagination: {
            total: result.total,
            limit: filters.limit || 20,
            offset: filters.offset || 0,
            hasMore:
              (filters.offset || 0) + (filters.limit || 20) < result.total,
          },
        });
      } catch (error) {
        console.error('Error fetching job applications:', error);

        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errorCode: error.code,
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to fetch applications',
            errorCode: ErrorCode.INTERNAL_ERROR,
          });
        }
      }
    }
  );

  // Get user's applications
  app.get(
    '/api/applications/my-applications',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const {
          status,
          limit = 20,
          offset = 0,
          order_by = 'created_at',
          order_direction = 'DESC',
        } = req.query;

        const filters: ApplicationFilters = {
          user_id: userId,
          status: status as any,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          order_by: order_by as any,
          order_direction: order_direction as any,
        };

        const result = await applicationsService.getApplicationsByUser(
          userId,
          filters
        );

        res.json({
          success: true,
          data: result.applications,
          pagination: {
            total: result.total,
            limit: filters.limit || 20,
            offset: filters.offset || 0,
            hasMore:
              (filters.offset || 0) + (filters.limit || 20) < result.total,
          },
        });
      } catch (error) {
        console.error('Error fetching user applications:', error);

        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errorCode: error.code,
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to fetch applications',
            errorCode: ErrorCode.INTERNAL_ERROR,
          });
        }
      }
    }
  );

  // Get application by ID
  app.get(
    '/api/applications/:applicationId',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const applicationId = parseInt(req.params.applicationId);
        if (isNaN(applicationId)) {
          throw new AppError(
            'Invalid application ID',
            ErrorCode.VALIDATION_ERROR
          );
        }

        const application = await applicationsService.getApplicationById(
          applicationId
        );
        if (!application) {
          throw new AppError('Application not found', ErrorCode.NOT_FOUND);
        }

        // Check if user has permission to view this application
        if (application.user_id !== userId) {
          // TODO: Add business owner check here
          throw new AppError('Access denied', ErrorCode.FORBIDDEN);
        }

        res.json({
          success: true,
          data: application,
        });
      } catch (error) {
        console.error('Error fetching application:', error);

        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errorCode: error.code,
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to fetch application',
            errorCode: ErrorCode.INTERNAL_ERROR,
          });
        }
      }
    }
  );

  // Update application status (business owners only)
  app.put(
    '/api/applications/:applicationId/status',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const applicationId = parseInt(req.params.applicationId);
        if (isNaN(applicationId)) {
          throw new AppError(
            'Invalid application ID',
            ErrorCode.VALIDATION_ERROR
          );
        }

        const { status } = req.body;
        if (
          !status ||
          !['pending', 'reviewed', 'accepted', 'rejected'].includes(status)
        ) {
          throw new AppError('Invalid status', ErrorCode.VALIDATION_ERROR);
        }

        // TODO: Add business owner authorization check here
        const application = await applicationsService.updateApplicationStatus(
          applicationId,
          status
        );
        if (!application) {
          throw new AppError('Application not found', ErrorCode.NOT_FOUND);
        }

        res.json({
          success: true,
          message: 'Application status updated successfully',
          data: application,
        });
      } catch (error) {
        console.error('Error updating application status:', error);

        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errorCode: error.code,
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to update application status',
            errorCode: ErrorCode.INTERNAL_ERROR,
          });
        }
      }
    }
  );

  // Delete application (user can delete their own application)
  app.delete(
    '/api/applications/:applicationId',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const applicationId = parseInt(req.params.applicationId);
        if (isNaN(applicationId)) {
          throw new AppError(
            'Invalid application ID',
            ErrorCode.VALIDATION_ERROR
          );
        }

        // Check if application exists and belongs to user
        const application = await applicationsService.getApplicationById(
          applicationId
        );
        if (!application) {
          throw new AppError('Application not found', ErrorCode.NOT_FOUND);
        }

        if (application.user_id !== userId) {
          throw new AppError('Access denied', ErrorCode.FORBIDDEN);
        }

        const deleted = await applicationsService.deleteApplication(
          applicationId
        );
        if (!deleted) {
          throw new AppError(
            'Failed to delete application',
            ErrorCode.INTERNAL_ERROR
          );
        }

        res.json({
          success: true,
          message: 'Application deleted successfully',
        });
      } catch (error) {
        console.error('Error deleting application:', error);

        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errorCode: error.code,
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to delete application',
            errorCode: ErrorCode.INTERNAL_ERROR,
          });
        }
      }
    }
  );

  // Get application statistics (business owners only)
  app.get(
    '/api/applications/stats',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const { business_id } = req.query;
        const businessId = business_id
          ? parseInt(business_id as string)
          : undefined;

        // TODO: Add business owner authorization check here
        const stats = await applicationsService.getApplicationStats(businessId);

        res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        console.error('Error fetching application stats:', error);

        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errorCode: error.code,
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to fetch application statistics',
            errorCode: ErrorCode.INTERNAL_ERROR,
          });
        }
      }
    }
  );
}
