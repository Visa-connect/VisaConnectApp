import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { authenticateAdmin } from '../middleware/adminAuth';
import {
  jobsService,
  JobSubmission,
  JobFilters,
} from '../services/jobsService';
import { businessService } from '../services/businessService';

const router = Router();

/**
 * POST /api/jobs - Create a new job posting
 */
router.post('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: 'User not authenticated' });
    }

    const {
      business_id,
      title,
      description,
      location,
      job_type,
      rate_from,
      rate_to,
      business_logo_url,
    } = req.body;

    // Validate required fields
    if (!business_id || !title || !description || !location || !job_type) {
      return res.status(400).json({
        success: false,
        error:
          'Missing required fields: business_id, title, description, location, job_type',
      });
    }

    // Validate job_type
    if (!['hourly', 'fixed'].includes(job_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid job_type. Must be "hourly" or "fixed"',
      });
    }

    // Check if user owns the business
    const business = await businessService.getBusinessById(business_id);
    if (!business || business.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only post jobs for your own businesses',
      });
    }

    // Check if business is verified
    if (!business.verified) {
      return res.status(403).json({
        success: false,
        error: 'Only verified businesses can post jobs',
      });
    }

    // Validate rate fields based on job type
    if (job_type === 'hourly') {
      if (rate_from && (isNaN(rate_from) || rate_from < 0)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid rate_from for hourly job',
        });
      }
      if (rate_to && (isNaN(rate_to) || rate_to < 0)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid rate_to for hourly job',
        });
      }
      if (rate_from && rate_to && rate_from > rate_to) {
        return res.status(400).json({
          success: false,
          error: 'rate_from cannot be greater than rate_to',
        });
      }
    } else if (job_type === 'fixed') {
      if (rate_from && (isNaN(rate_from) || rate_from < 0)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid rate_from for fixed price job',
        });
      }
    }

    const jobData: JobSubmission = {
      business_id,
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      job_type,
      rate_from: rate_from ? parseFloat(rate_from) : null,
      rate_to: rate_to ? parseFloat(rate_to) : null,
      business_logo_url,
    };

    const job = await jobsService.createJob(jobData);

    res.status(201).json({
      success: true,
      data: job,
      message: 'Job posted successfully',
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create job',
    });
  }
});

/**
 * GET /api/jobs - Get all jobs with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status = 'active',
      job_type,
      location,
      business_id,
      limit = '20',
      offset = '0',
      order_by = 'created_at',
      order_direction = 'DESC',
    } = req.query;

    const filters: JobFilters = {
      status: status as 'active' | 'paused' | 'closed',
      job_type: job_type as 'hourly' | 'fixed',
      location: location as string,
      business_id: business_id ? parseInt(business_id as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      order_by: order_by as 'created_at' | 'title' | 'rate_from',
      order_direction: order_direction as 'ASC' | 'DESC',
    };

    const result = await jobsService.getAllJobs(filters);

    res.json({
      success: true,
      data: result.jobs,
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: result.total > (filters.offset || 0) + (filters.limit || 20),
      },
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
    });
  }
});

/**
 * GET /api/jobs/:id - Get job by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid job ID',
      });
    }

    const job = await jobsService.getJobById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job',
    });
  }
});

/**
 * GET /api/jobs/business/:businessId - Get jobs by business
 */
router.get('/business/:businessId', async (req: Request, res: Response) => {
  try {
    const businessId = parseInt(req.params.businessId);
    if (isNaN(businessId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid business ID',
      });
    }

    const {
      status = 'active',
      job_type,
      location,
      limit = '20',
      offset = '0',
      order_by = 'created_at',
      order_direction = 'DESC',
    } = req.query;

    const filters: Omit<JobFilters, 'business_id'> = {
      status: status as 'active' | 'paused' | 'closed',
      job_type: job_type as 'hourly' | 'fixed',
      location: location as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      order_by: order_by as 'created_at' | 'title' | 'rate_from',
      order_direction: order_direction as 'ASC' | 'DESC',
    };

    const result = await jobsService.getJobsByBusiness(businessId, filters);

    res.json({
      success: true,
      data: result.jobs,
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: result.total > (filters.offset || 0) + (filters.limit || 20),
      },
    });
  } catch (error) {
    console.error('Error fetching business jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business jobs',
    });
  }
});

/**
 * PUT /api/jobs/:id - Update job (owner only)
 */
router.put('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid job ID',
      });
    }

    const userId = req.user?.uid;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: 'User not authenticated' });
    }

    // Check ownership
    const isOwner = await jobsService.checkJobOwnership(
      jobId,
      parseInt(userId)
    );
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own jobs',
      });
    }

    const updateData = req.body;
    const job = await jobsService.updateJob(jobId, updateData);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      data: job,
      message: 'Job updated successfully',
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job',
    });
  }
});

/**
 * PUT /api/jobs/:id/status - Update job status (owner only)
 */
router.put(
  '/:id/status',
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid job ID',
        });
      }

      const userId = req.user?.uid;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, error: 'User not authenticated' });
      }

      const { status } = req.body;
      if (!['active', 'paused', 'closed'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Must be "active", "paused", or "closed"',
        });
      }

      // Check ownership
      const isOwner = await jobsService.checkJobOwnership(
        jobId,
        parseInt(userId)
      );
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'You can only update your own jobs',
        });
      }

      const job = await jobsService.updateJobStatus(jobId, status);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      res.json({
        success: true,
        data: job,
        message: `Job ${status} successfully`,
      });
    } catch (error) {
      console.error('Error updating job status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update job status',
      });
    }
  }
);

/**
 * DELETE /api/jobs/:id - Delete job (owner only)
 */
router.delete('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid job ID',
      });
    }

    const userId = req.user?.uid;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: 'User not authenticated' });
    }

    // Check ownership
    const isOwner = await jobsService.checkJobOwnership(
      jobId,
      parseInt(userId)
    );
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own jobs',
      });
    }

    const deleted = await jobsService.deleteJob(jobId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete job',
    });
  }
});

/**
 * GET /api/jobs/stats - Get job statistics (admin only)
 */
router.get(
  '/admin/stats',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      const { business_id } = req.query;
      const businessId = business_id
        ? parseInt(business_id as string)
        : undefined;

      const stats = await jobsService.getJobStats(businessId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching job stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch job statistics',
      });
    }
  }
);

export default router;
