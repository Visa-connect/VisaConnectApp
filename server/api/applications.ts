import { Express, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import applicationsService, {
  ApplicationSubmission,
  ApplicationFilters,
} from '../services/applicationsService';
import { jobsService } from '../services/jobsService';
import { chatService } from '../services/chatService';
import { AppError, ErrorCode } from '../types/errors';
import pool from '../db/config';

// Validate if URL is from trusted Firebase Storage domain
const isValidResumeUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);

    // Only allow HTTPS URLs
    if (urlObj.protocol !== 'https:') {
      return false;
    }

    // Allow Firebase Storage domains
    const trustedDomains = [
      'storage.googleapis.com',
      'firebasestorage.googleapis.com',
      'visaconnectus-stage.firebasestorage.app', // Your staging bucket
      'visaconnectus.firebasestorage.app', // Your production bucket
    ];

    return trustedDomains.some((domain) => urlObj.hostname === domain);
  } catch (error) {
    // Invalid URL format
    return false;
  }
};

// Helper function to create initial application message
async function createApplicationMessage(
  application: any,
  job: any
): Promise<string> {
  const userQuery = `
    SELECT first_name, last_name, email, occupation, visa_type
    FROM users
    WHERE id = $1
  `;

  const userResult = await pool.query(userQuery, [application.user_id]);
  const user = userResult.rows[0] || {};

  const applicantName =
    `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User';

  let message = `🎯 New Job Application for "${job.title}"\n\n`;
  message += `Applicant: ${applicantName}\n`;
  message += `Email: ${user.email || 'Not provided'}\n`;
  message += `Occupation: ${user.occupation || 'Not specified'}\n`;
  message += `Visa Type: ${user.visa_type || 'Not specified'}\n\n`;

  message += `Application Details:\n`;
  message += `• Location: ${application.location}\n`;
  message += `• Start Date: ${application.start_date}\n`;
  message += `• Qualifications: ${application.qualifications}\n\n`;

  if (application.resume_url) {
    message += `📄 Resume: [View Resume](${application.resume_url})`;
  }

  return message;
}

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

        // Validate resume URL if provided
        if (resume_url && !isValidResumeUrl(resume_url)) {
          throw new AppError(
            'Invalid resume URL: Must be from trusted Firebase Storage domain',
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

        // Create chat between applicant and employer
        try {
          // Get job details to find the employer
          const job = await jobsService.getJobById(job_id);
          if (job && job.business_user_id) {
            // Create conversation between applicant and employer
            const conversationId = await chatService.createConversation(
              userId,
              job.business_user_id
            );

            // Create initial message with application details
            const initialMessage = await createApplicationMessage(
              application,
              job
            );

            // Send the initial message
            await chatService.sendMessage(conversationId, {
              senderId: userId,
              receiverId: job.business_user_id,
              content: initialMessage,
              read: false,
            });

            console.log(
              `Chat created for application ${application.id} between ${userId} and ${job.business_user_id}`
            );
          }
        } catch (chatError) {
          console.error('Error creating chat for application:', chatError);
          // Don't fail the application if chat creation fails
        }

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

  // Check if user has applied to specific jobs (bulk check)
  app.post(
    '/api/applications/check-applications',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const { jobIds } = req.body;

        if (!Array.isArray(jobIds)) {
          throw new AppError(
            'jobIds must be an array',
            ErrorCode.VALIDATION_ERROR
          );
        }

        if (jobIds.length === 0) {
          return res.json({
            success: true,
            data: {},
          });
        }

        // Validate job IDs
        const validJobIds = jobIds.filter(
          (id) => typeof id === 'number' && id > 0
        );
        if (validJobIds.length !== jobIds.length) {
          throw new AppError(
            'Invalid job IDs provided',
            ErrorCode.VALIDATION_ERROR
          );
        }

        const appliedJobs = await applicationsService.getAppliedJobIds(
          userId,
          validJobIds
        );

        res.json({
          success: true,
          data: Array.from(appliedJobs),
        });
      } catch (error) {
        console.error('Error checking applications:', error);

        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errorCode: error.code,
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to check applications',
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
          // Check if user is the business owner of the job
          const job = await jobsService.getJobById(application.job_id);
          if (!job || job.business_user_id !== userId) {
            throw new AppError('Access denied', ErrorCode.FORBIDDEN);
          }
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

        // Get the application to check job ownership
        const application = await applicationsService.getApplicationById(
          applicationId
        );
        if (!application) {
          throw new AppError('Application not found', ErrorCode.NOT_FOUND);
        }

        // Get the job to check if user owns the business
        const job = await jobsService.getJobById(application.job_id);
        if (!job) {
          throw new AppError('Job not found', ErrorCode.NOT_FOUND);
        }

        // Check if the user owns the business that posted this job
        if (job.business_user_id !== userId) {
          throw new AppError(
            'Access denied. Only business owners can update application status',
            ErrorCode.FORBIDDEN
          );
        }

        // Update the application status
        const updatedApplication =
          await applicationsService.updateApplicationStatus(
            applicationId,
            status
          );
        if (!updatedApplication) {
          throw new AppError(
            'Failed to update application status',
            ErrorCode.INTERNAL_ERROR
          );
        }

        res.json({
          success: true,
          message: 'Application status updated successfully',
          data: updatedApplication,
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
