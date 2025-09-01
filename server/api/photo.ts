import { Express, Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authenticateUser } from '../middleware/auth';
import userService from '../services/userService';
import { config } from '../config/env';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export default function photoApi(app: Express) {
  // Upload profile photo with Cloudinary
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

        // Convert buffer to base64 for Cloudinary
        const fileBuffer = req.file.buffer;
        const base64File = `data:${
          req.file.mimetype
        };base64,${fileBuffer.toString('base64')}`;

        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(base64File, {
          folder: 'visaconnect/profile-photos',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
          public_id: `profile_${userId}_${Date.now()}`,
        });

        // Update user profile in database
        await userService.updateUser(userId, {
          profile_photo_url: uploadResult.secure_url,
          profile_photo_public_id: uploadResult.public_id,
        });

        res.json({
          success: true,
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        });
      } catch (error) {
        console.error('Error in photo upload endpoint:', error);
        res.status(500).json({
          error: 'Failed to upload photo',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Upload meetup photo with Cloudinary
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

        // Convert buffer to base64 for Cloudinary
        const fileBuffer = req.file.buffer;
        const base64File = `data:${
          req.file.mimetype
        };base64,${fileBuffer.toString('base64')}`;

        // Upload to Cloudinary with meetup-specific settings
        const uploadResult = await cloudinary.uploader.upload(base64File, {
          folder: 'visaconnect/meetup-photos',
          transformation: [
            { width: 800, height: 600, crop: 'fill' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
          public_id: `meetup_${userId}_${Date.now()}`,
        });

        res.json({
          success: true,
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
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

        // Get current user to find the public ID
        const user = await userService.getUserById(userId);
        const publicId = user?.profile_photo_public_id;

        // Delete from Cloudinary if public ID exists
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch (cloudinaryError) {
            console.warn('Failed to delete from Cloudinary:', cloudinaryError);
            // Continue with database update even if Cloudinary deletion fails
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
        const { publicId } = req.body;
        if (!publicId) {
          return res.status(400).json({ error: 'Public ID is required' });
        }

        // Delete from Cloudinary
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (cloudinaryError) {
          console.warn('Failed to delete from Cloudinary:', cloudinaryError);
          // Continue even if Cloudinary deletion fails
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
}
