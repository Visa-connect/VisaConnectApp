import { Express, Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authenticateUser } from '../middleware/auth';
import { userService } from '../services/userService';
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

// Helper functions for photo operations
async function uploadPhotoToCloudinary(
  buffer: Buffer,
  folder: string,
  publicIdPrefix?: string
): Promise<{ secure_url: string; public_id: string }> {
  const base64File = `data:image/jpeg;base64,${buffer.toString('base64')}`;

  const uploadResult = await cloudinary.uploader.upload(base64File, {
    folder,
    transformation: [
      { width: 1200, height: 800, crop: 'limit', quality: 'auto' },
      { fetch_format: 'auto' },
    ],
    public_id: publicIdPrefix ? `${publicIdPrefix}_${Date.now()}` : undefined,
  });

  return {
    secure_url: uploadResult.secure_url,
    public_id: uploadResult.public_id,
  };
}

async function deletePhotoFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

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

  // Helper function to delete photo from Cloudinary with error handling
  const deletePhotoFromCloudinary = async (publicId: string): Promise<void> => {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (cloudinaryError) {
      console.warn('Failed to delete from Cloudinary:', cloudinaryError);
      // Continue even if Cloudinary deletion fails
    }
  };

  // Helper function to validate and extract public ID from request body
  const validatePublicIdFromBody = (
    req: Request,
    res: Response
  ): string | null => {
    const { publicId } = req.body;
    if (!publicId) {
      res.status(400).json({ error: 'Public ID is required' });
      return null;
    }
    return publicId;
  };

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
          await deletePhotoFromCloudinary(publicId);
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
        const publicId = validatePublicIdFromBody(req, res);
        if (!publicId) return;

        // Delete from Cloudinary
        await deletePhotoFromCloudinary(publicId);

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

        // Upload to Cloudinary
        const result = await uploadPhotoToCloudinary(
          req.file.buffer,
          'tips-trips-advice'
        );

        res.json({
          success: true,
          url: result.secure_url,
          publicId: result.public_id,
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
        const { publicId } = req.body;

        if (!publicId) {
          return res.status(400).json({
            error: 'Missing publicId',
            details: 'Photo public ID is required',
          });
        }

        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            error: 'Unauthorized',
            details: 'User not authenticated',
          });
        }

        // Delete from Cloudinary
        await deletePhotoFromCloudinary(publicId);

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

        // Upload to Cloudinary
        const result = await uploadPhotoToCloudinary(
          req.file.buffer,
          'business-logos',
          `business_logo_${userId}`
        );

        res.json({
          success: true,
          url: result.secure_url,
          publicId: result.public_id,
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
        const { publicId } = req.body;

        if (!publicId) {
          return res.status(400).json({
            error: 'Missing publicId',
            details: 'Logo public ID is required',
          });
        }

        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            error: 'Unauthorized',
            details: 'User not authenticated',
          });
        }

        // Delete from Cloudinary
        await cloudinary.uploader.destroy(publicId);

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
