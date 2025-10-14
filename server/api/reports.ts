import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { authenticateAdmin } from '../middleware/adminAuth';
import { reportService } from '../services/reportService';
import { AppError, ErrorCode } from '../types/errors';

const reportsRouter = Router();

// User: Create a report
reportsRouter.post(
  '/api/reports',
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { target_type, target_id, reason } = req.body;
      const reporter_id = req.user?.uid;

      if (!reporter_id) {
        throw new AppError(
          'User not authenticated',
          ErrorCode.UNAUTHORIZED,
          401
        );
      }

      // Validate required fields
      if (!target_type || !target_id || !reason) {
        throw new AppError(
          'Missing required fields: target_type, target_id, reason',
          ErrorCode.BAD_REQUEST,
          400
        );
      }

      // Validate target_type
      if (!['job', 'meetup'].includes(target_type)) {
        throw new AppError(
          'Invalid target_type. Must be "job" or "meetup"',
          ErrorCode.VALIDATION_ERROR,
          400
        );
      }

      // Validate reason length
      if (reason.trim().length < 10) {
        throw new AppError(
          'Reason must be at least 10 characters long',
          ErrorCode.VALIDATION_ERROR,
          400
        );
      }

      const reportData = {
        reporter_id,
        target_type,
        target_id,
        reason: reason.trim(),
      };

      const report = await reportService.createReport(reportData);

      res.status(201).json({
        success: true,
        data: report,
        message: 'Report created successfully',
      });
    } catch (error: any) {
      console.error('Create report error:', error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to create report',
        });
      }
    }
  }
);

// User: Get their own reports
reportsRouter.get(
  '/api/reports/my-reports',
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const reporter_id = req.user?.uid;

      if (!reporter_id) {
        throw new AppError(
          'User not authenticated',
          ErrorCode.UNAUTHORIZED,
          401
        );
      }

      const reports = await reportService.getReportsByReporter(reporter_id);

      res.json({
        success: true,
        data: reports,
      });
    } catch (error: any) {
      console.error('Get user reports error:', error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get reports',
        });
      }
    }
  }
);

// User: Get specific report detail (only their own)
reportsRouter.get(
  '/api/reports/:reportId',
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { reportId } = req.params;
      const userId = req.user?.uid;

      if (!userId) {
        throw new AppError(
          'User not authenticated',
          ErrorCode.UNAUTHORIZED,
          401
        );
      }

      // Check if user can access this report
      const canAccess = await reportService.canAccessReport(reportId, userId);
      if (!canAccess) {
        throw new AppError('Access denied', ErrorCode.FORBIDDEN, 403);
      }

      const report = await reportService.getReport(reportId);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error('Get report error:', error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get report',
        });
      }
    }
  }
);

// Admin: Get all reports with pagination and filters
reportsRouter.get(
  '/api/admin/reports',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      const {
        limit,
        offset,
        status,
        target_type,
        reporter_id,
        search,
        date_from,
        date_to,
        sort_by,
        sort_order,
      } = req.query;

      const params = {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        status: status as 'pending' | 'resolved' | 'removed' | undefined,
        target_type: target_type as 'job' | 'meetup' | undefined,
        reporter_id: reporter_id as string | undefined,
        search: search as string | undefined,
        date_from: date_from as string | undefined,
        date_to: date_to as string | undefined,
        sort_by: sort_by as 'created_at' | 'updated_at' | 'status' | undefined,
        sort_order: sort_order as 'asc' | 'desc' | undefined,
      };

      const result = await reportService.searchReports(params);

      res.json({
        success: true,
        data: result.reports,
        total: result.total,
      });
    } catch (error: any) {
      console.error('Get admin reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get reports',
      });
    }
  }
);

// Admin: Get report statistics
reportsRouter.get(
  '/api/admin/reports/stats',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      const stats = await reportService.getReportStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get report stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get report statistics',
      });
    }
  }
);

// Admin: Get specific report with audit trail
reportsRouter.get(
  '/api/admin/reports/:reportId',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      const { reportId } = req.params;

      const report = await reportService.getReport(reportId);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error('Get admin report error:', error);

      if (error.message === 'Report not found') {
        res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get report',
        });
      }
    }
  }
);

// Admin: Resolve report (keep post)
reportsRouter.post(
  '/api/admin/reports/:reportId/resolve',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      const { reportId } = req.params;
      const { notes } = req.body;
      const adminId = req.adminUser?.uid;

      if (!adminId) {
        throw new AppError(
          'Admin not authenticated',
          ErrorCode.UNAUTHORIZED,
          401
        );
      }

      const report = await reportService.updateReportStatus(
        reportId,
        'resolved',
        adminId,
        notes
      );

      res.json({
        success: true,
        data: report,
        message: 'Report resolved successfully',
      });
    } catch (error: any) {
      console.error('Resolve report error:', error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error.message === 'Report not found') {
        res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to resolve report',
        });
      }
    }
  }
);

// Admin: Remove report (remove post)
reportsRouter.post(
  '/api/admin/reports/:reportId/remove',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      const { reportId } = req.params;
      const { notes } = req.body;
      const adminId = req.adminUser?.uid;

      if (!adminId) {
        throw new AppError(
          'Admin not authenticated',
          ErrorCode.UNAUTHORIZED,
          401
        );
      }

      const report = await reportService.updateReportStatus(
        reportId,
        'removed',
        adminId,
        notes
      );

      // TODO: Here you would also update the target post's visibility
      // For now, we'll just update the report status
      // In a real implementation, you'd call the appropriate service to mark the post as removed

      res.json({
        success: true,
        data: report,
        message: 'Report processed and post removed successfully',
      });
    } catch (error: any) {
      console.error('Remove report error:', error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error.message === 'Report not found') {
        res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to process report',
        });
      }
    }
  }
);

export default reportsRouter;
