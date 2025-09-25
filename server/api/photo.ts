import { Express, Request, Response } from 'express';
import multer from 'multer';
import { authenticateUser } from '../middleware/auth';
import { userService } from '../services/userService';
import {
  uploadProfilePhoto,
  uploadMeetupPhoto,
  uploadBusinessLogo,
  uploadResume,
  uploadTipsPhoto,
  deleteFile,
  extractFileNameFromUrl,
} from '../services/firebaseStorageService';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (increased for documents)
  },
  fileFilter: (req, file, cb) => {
    // Accept image files and document files
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Allowed: images (JPG, PNG, WebP) and documents (PDF, DOC, DOCX)'
        )
      );
    }
  },
});

// Helper function to validate and extract file name from request body
const validateFileNameFromBody = (
  req: Request,
  res: Response
): string | null => {
  const { fileName } = req.body;
  if (!fileName) {
    res.status(400).json({ error: 'File name is required' });
    return null;
  }
  return fileName;
};

export default function photoApi(app: Express) {
  // Upload profile photo with Firebase Storage
  app.post(
    '/api/photo/upload-profile-photo',
    authenticateUser,
    upload.single('photo'),
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        // Upload to Firebase Storage
        const uploadResult = await uploadProfilePhoto(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          userId
        );

        if (!uploadResult.success) {
          return res.status(400).json({
            error: 'Upload failed',
            details: uploadResult.error,
          });
        }

        // Update user profile in database
        await userService.updateUser(userId, {
          profile_photo_url: uploadResult.url,
          profile_photo_public_id: uploadResult.fileName, // Store Firebase file name
        });

        res.json({
          success: true,
          url: uploadResult.url,
          fileName: uploadResult.fileName,
        });
      } catch (error) {
        console.error('Error in profile photo upload endpoint:', error);
        res.status(500).json({
          error: 'Failed to upload photo',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Upload meetup photo with Firebase Storage
  app.post(
    '/api/photo/upload-meetup-photo',
    authenticateUser,
    upload.single('photo'),
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        // Upload to Firebase Storage
        const uploadResult = await uploadMeetupPhoto(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          userId
        );

        if (!uploadResult.success) {
          return res.status(400).json({
            error: 'Upload failed',
            details: uploadResult.error,
          });
        }

        res.json({
          success: true,
          url: uploadResult.url,
          fileName: uploadResult.fileName,
        });
      } catch (error) {
        console.error('Error in meetup photo upload endpoint:', error);
        res.status(500).json({
          error: 'Failed to upload meetup photo',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Delete profile photo
  app.delete(
    '/api/photo/delete-profile-photo',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        // Get current user to find the file name
        const user = await userService.getUserById(userId);
        const fileName = user?.profile_photo_public_id; // Now stores Firebase file name

        // Delete from Firebase Storage if file name exists
        if (fileName) {
          const deleteResult = await deleteFile(fileName);
          if (!deleteResult.success) {
            console.warn(
              'Failed to delete file from Firebase Storage:',
              deleteResult.error
            );
            // Continue even if Firebase deletion fails
          }
        }

        // Update user profile in database to remove photo
        await userService.updateUser(userId, {
          profile_photo_url: null,
          profile_photo_public_id: null,
        });

        res.json({ success: true, message: 'Profile photo removed' });
      } catch (error) {
        console.error('Error deleting profile photo:', error);
        res.status(500).json({
          error: 'Failed to delete photo',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Delete meetup photo
  app.delete(
    '/api/photo/delete-meetup-photo',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const fileName = validateFileNameFromBody(req, res);
        if (!fileName) return;

        // Delete from Firebase Storage
        const deleteResult = await deleteFile(fileName);
        if (!deleteResult.success) {
          return res.status(400).json({
            error: 'Failed to delete file',
            details: deleteResult.error,
          });
        }

        res.json({ success: true, message: 'Meetup photo deleted' });
      } catch (error) {
        console.error('Error deleting meetup photo:', error);
        res.status(500).json({
          error: 'Failed to delete meetup photo',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Upload resume/document
  app.post(
    '/api/photo/upload-resume',
    authenticateUser,
    upload.single('resume'),
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        // Upload to Firebase Storage
        const uploadResult = await uploadResume(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          userId
        );

        if (!uploadResult.success) {
          return res.status(400).json({
            error: 'Upload failed',
            details: uploadResult.error,
          });
        }

        res.json({
          success: true,
          url: uploadResult.url,
          fileName: uploadResult.fileName,
        });
      } catch (error) {
        console.error('Error in resume upload endpoint:', error);
        res.status(500).json({
          error: 'Failed to upload resume',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Upload Tips, Trips, Advice photo
  app.post(
    '/api/photo/upload-tips-photo',
    authenticateUser,
    upload.single('photo'),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            error: 'No photo provided',
            details: 'Please select a photo to upload',
          });
        }

        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            error: 'Unauthorized',
            details: 'User not authenticated',
          });
        }

        // Upload to Firebase Storage
        const uploadResult = await uploadTipsPhoto(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          userId
        );

        if (!uploadResult.success) {
          return res.status(400).json({
            error: 'Upload failed',
            details: uploadResult.error,
          });
        }

        res.json({
          success: true,
          url: uploadResult.url,
          fileName: uploadResult.fileName,
          message: 'Tips photo uploaded successfully',
        });
      } catch (error) {
        console.error('Error uploading tips photo:', error);
        res.status(500).json({
          error: 'Failed to upload tips photo',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Delete Tips, Trips, Advice photo
  app.delete(
    '/api/photo/delete-tips-photo',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const fileName = validateFileNameFromBody(req, res);
        if (!fileName) return;

        // Delete from Firebase Storage
        const deleteResult = await deleteFile(fileName);
        if (!deleteResult.success) {
          return res.status(400).json({
            error: 'Failed to delete file',
            details: deleteResult.error,
          });
        }

        res.json({ success: true, message: 'Tips photo deleted' });
      } catch (error) {
        console.error('Error deleting tips photo:', error);
        res.status(500).json({
          error: 'Failed to delete tips photo',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Upload Business Logo
  app.post(
    '/api/photo/upload-business-logo',
    authenticateUser,
    upload.single('photo'),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            error: 'No photo provided',
            details: 'Please select a logo to upload',
          });
        }

        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            error: 'Unauthorized',
            details: 'User not authenticated',
          });
        }

        // Upload to Firebase Storage
        const uploadResult = await uploadBusinessLogo(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          userId
        );

        if (!uploadResult.success) {
          return res.status(400).json({
            error: 'Upload failed',
            details: uploadResult.error,
          });
        }

        res.json({
          success: true,
          url: uploadResult.url,
          fileName: uploadResult.fileName,
          message: 'Business logo uploaded successfully',
        });
      } catch (error) {
        console.error('Error uploading business logo:', error);
        res.status(500).json({
          error: 'Failed to upload business logo',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Delete Business Logo
  app.delete(
    '/api/photo/delete-business-logo',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const fileName = validateFileNameFromBody(req, res);
        if (!fileName) return;

        // Delete from Firebase Storage
        const deleteResult = await deleteFile(fileName);
        if (!deleteResult.success) {
          return res.status(400).json({
            error: 'Failed to delete file',
            details: deleteResult.error,
          });
        }

        res.json({
          success: true,
          message: 'Business logo deleted successfully',
        });
      } catch (error) {
        console.error('Error deleting business logo:', error);
        res.status(500).json({
          error: 'Failed to delete business logo',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}
