import { Express, Request, Response } from 'express';
import multer from 'multer';
import { authenticateUser } from '../middleware/auth';
import { authenticateAdmin } from '../middleware/adminAuth';
import { tipsTripsAdviceService } from '../services/tipsTripsAdviceService';
import { AppError, ErrorCode } from '../types/errors';
import {
  CreateTipsTripsAdviceRequest,
  UpdateTipsTripsAdviceRequest,
  SearchTipsTripsAdviceRequest,
  AddCommentRequest,
} from '../types/tipsTripsAdvice';
import { uploadTipsPhoto } from '../services/firebaseStorageService';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept image files only
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: images (JPG, PNG, WebP)'));
    }
  },
});

export default function tipsTripsAdviceApi(app: Express) {
  // Create a new Tips, Trips, or Advice post
  app.post(
    '/api/tips-trips-advice',
    authenticateUser,
    upload.array('photos', 10), // Allow up to 10 photos
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
            code: ErrorCode.UNAUTHORIZED,
          });
        }

        const { title, description, post_type } = req.body;
        const files = req.files as Express.Multer.File[];

        // Validate required fields
        if (!title || !description || !post_type) {
          return res.status(400).json({
            success: false,
            message: 'Title, description, and post type are required',
          });
        }

        // Upload photos to Firebase Storage first
        const uploadedPhotos = [];
        if (files && files.length > 0) {
          console.log(`Uploading ${files.length} photos for post creation`);

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const uploadResult = await uploadTipsPhoto(
              file.buffer,
              file.originalname,
              file.mimetype,
              userId
            );

            if (
              uploadResult.success &&
              uploadResult.url &&
              uploadResult.fileName
            ) {
              uploadedPhotos.push({
                photo_url: uploadResult.url,
                photo_public_id: uploadResult.fileName,
                display_order: i + 1,
              });
              console.log(
                `✅ Photo ${i + 1} uploaded successfully: ${uploadResult.url}`
              );
            } else {
              console.error(
                `❌ Failed to upload photo ${i + 1}:`,
                uploadResult.error
              );
              return res.status(500).json({
                success: false,
                message: `Failed to upload photo ${i + 1}: ${
                  uploadResult.error
                }`,
              });
            }
          }
        }

        // Create the post data object
        const postData: CreateTipsTripsAdviceRequest = {
          title,
          description,
          post_type,
          photos: uploadedPhotos,
        };

        const postId = await tipsTripsAdviceService.createPost(
          postData,
          userId
        );

        res.status(201).json({
          success: true,
          data: { postId },
          message: 'Post created successfully',
        });
      } catch (error) {
        console.error('Error creating post:', error);

        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to create post',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  // Get a single post by ID
  app.get(
    '/api/tips-trips-advice/:postId',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const postId = parseInt(req.params.postId);
        const userId = req.user?.uid;

        if (isNaN(postId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid post ID',
            code: ErrorCode.BAD_REQUEST,
          });
        }

        const post = await tipsTripsAdviceService.getPostById(postId, userId);

        res.json({
          success: true,
          data: post,
        });
      } catch (error) {
        console.error('Error fetching post:', error);

        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to fetch post',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  // Search posts with filters
  app.get(
    '/api/tips-trips-advice',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        const searchParams: SearchTipsTripsAdviceRequest = {
          post_type: req.query.post_type as any,
          search: req.query.search as string,
          creator_id: req.query.creator_id as string,
          page: req.query.page ? parseInt(req.query.page as string) : undefined,
          limit: req.query.limit
            ? parseInt(req.query.limit as string)
            : undefined,
        };

        const posts = await tipsTripsAdviceService.searchPosts(
          searchParams,
          userId
        );

        res.json({
          success: true,
          data: posts,
        });
      } catch (error) {
        console.error('Error searching posts:', error);

        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to search posts',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  // Update a post
  app.put(
    '/api/tips-trips-advice/:postId',
    authenticateUser,
    upload.array('photos', 10), // Allow up to 10 photos
    async (req: Request, res: Response) => {
      try {
        const postId = parseInt(req.params.postId);
        const userId = req.user?.uid;

        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
            code: ErrorCode.UNAUTHORIZED,
          });
        }

        if (isNaN(postId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid post ID',
            code: ErrorCode.BAD_REQUEST,
          });
        }

        const { title, description, post_type, is_active, existingPhotoIds } =
          req.body;
        const files = req.files as Express.Multer.File[];

        let photosToKeep: number[] = [];
        if (existingPhotoIds) {
          // API contract: existingPhotoIds must be an array of photo IDs
          if (!Array.isArray(existingPhotoIds)) {
            return res.status(400).json({
              success: false,
              message: 'existingPhotoIds must be an array of photo IDs',
            });
          }
          photosToKeep = existingPhotoIds.map((id: string) =>
            parseInt(id.trim())
          );
        }

        console.log('Parsed photosToKeep:', photosToKeep);

        // Upload new photos if provided
        const uploadedPhotos = [];
        if (files && files.length > 0) {
          console.log(`Uploading ${files.length} new photos for post update`);

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log(
              `Uploading photo ${i + 1}/${files.length}: ${file.originalname}`
            );

            const uploadResult = await uploadTipsPhoto(
              file.buffer,
              file.originalname,
              file.mimetype,
              userId
            );

            if (
              uploadResult.success &&
              uploadResult.url &&
              uploadResult.fileName
            ) {
              uploadedPhotos.push({
                photo_url: uploadResult.url,
                photo_public_id: uploadResult.fileName,
                display_order: i + 1,
              });
              console.log(
                `✅ Photo ${i + 1} uploaded successfully: ${uploadResult.url}`
              );
            } else {
              console.error(
                `❌ Failed to upload photo ${i + 1}:`,
                uploadResult.error
              );
              return res.status(500).json({
                success: false,
                message: `Failed to upload photo ${i + 1}: ${
                  uploadResult.error
                }`,
              });
            }
          }
        }

        // Create the update data object
        const updateData: UpdateTipsTripsAdviceRequest = {
          ...(title && { title }),
          ...(description && { description }),
          ...(post_type && { post_type }),
          ...(is_active !== undefined && { is_active: is_active === 'true' }),
          ...(uploadedPhotos.length > 0 && { photos: uploadedPhotos }),
          ...(photosToKeep.length > 0 && { photosToKeep }),
        };

        await tipsTripsAdviceService.updatePost(postId, updateData, userId);

        res.json({
          success: true,
          message: 'Post updated successfully',
        });
      } catch (error) {
        console.error('Error updating post:', error);

        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to update post',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  // Delete a post
  app.delete(
    '/api/tips-trips-advice/:postId',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const postId = parseInt(req.params.postId);
        const userId = req.user?.uid;

        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
            code: ErrorCode.UNAUTHORIZED,
          });
        }

        if (isNaN(postId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid post ID',
            code: ErrorCode.BAD_REQUEST,
          });
        }

        await tipsTripsAdviceService.deletePost(postId, userId);

        res.json({
          success: true,
          message: 'Post deleted successfully',
        });
      } catch (error) {
        console.error('Error deleting post:', error);

        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to delete post',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  // Add a comment to a post
  app.post(
    '/api/tips-trips-advice/:postId/comments',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const postId = parseInt(req.params.postId);
        const userId = req.user?.uid;

        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
            code: ErrorCode.UNAUTHORIZED,
          });
        }

        if (isNaN(postId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid post ID',
            code: ErrorCode.BAD_REQUEST,
          });
        }

        const { comment }: AddCommentRequest = req.body;

        if (!comment || comment.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Comment is required',
            code: ErrorCode.VALIDATION_ERROR,
          });
        }

        const newComment = await tipsTripsAdviceService.addComment(
          postId,
          comment,
          userId
        );

        res.status(201).json({
          success: true,
          data: newComment,
          message: 'Comment added successfully',
        });
      } catch (error) {
        console.error('Error adding comment:', error);

        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to add comment',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  // Like/unlike a post
  app.post(
    '/api/tips-trips-advice/:postId/like',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const postId = parseInt(req.params.postId);
        const userId = req.user?.uid;

        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
            code: ErrorCode.UNAUTHORIZED,
          });
        }

        if (isNaN(postId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid post ID',
            code: ErrorCode.BAD_REQUEST,
          });
        }

        const result = await tipsTripsAdviceService.toggleLike(postId, userId);

        res.json({
          success: true,
          data: result,
          message: result.liked ? 'Post liked' : 'Post unliked',
        });
      } catch (error) {
        console.error('Error toggling like:', error);

        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to toggle like',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  // Get user's posts
  app.get(
    '/api/tips-trips-advice/user/posts',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        const postType = req.query.post_type as any;

        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated',
            code: ErrorCode.UNAUTHORIZED,
          });
        }

        const posts = await tipsTripsAdviceService.getUserPosts(
          userId,
          postType
        );

        res.json({
          success: true,
          data: posts,
        });
      } catch (error) {
        console.error('Error fetching user posts:', error);

        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to fetch user posts',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  // Admin endpoints for tips/trips/advice posts
  // Create a new Tips, Trips, or Advice post (Admin)
  app.post(
    '/api/admin/tips-trips-advice',
    authenticateAdmin,
    upload.array('photos', 10), // Allow up to 10 photos
    async (req: Request, res: Response) => {
      try {
        const userId = req.adminUser?.uid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'Admin not authenticated',
            code: ErrorCode.UNAUTHORIZED,
          });
        }

        const { title, description, post_type } = req.body;
        const files = req.files as Express.Multer.File[];

        // Validate required fields
        if (!title || !description || !post_type) {
          return res.status(400).json({
            success: false,
            message: 'Title, description, and post type are required',
          });
        }

        // Upload photos to Firebase Storage first
        const uploadedPhotos = [];
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log(
              `Uploading photo ${i + 1}/${files.length}:`,
              file.originalname
            );

            const uploadResult = await uploadTipsPhoto(
              file.buffer,
              file.originalname,
              file.mimetype,
              userId
            );

            if (!uploadResult.success) {
              console.error(
                `Failed to upload photo ${i + 1}:`,
                uploadResult.error
              );
              return res.status(400).json({
                success: false,
                message: `Failed to upload photo: ${uploadResult.error}`,
              });
            }

            uploadedPhotos.push({
              photo_url: uploadResult.url!,
              photo_public_id: uploadResult.fileName!,
              display_order: i + 1,
            });
          }
        }

        // Create the post
        const postData: CreateTipsTripsAdviceRequest = {
          title,
          description,
          post_type,
          photos: uploadedPhotos,
        };

        const postId = await tipsTripsAdviceService.createPost(
          postData,
          userId
        );

        res.status(201).json({
          success: true,
          message: 'Post created successfully',
          data: { postId },
        });
      } catch (error) {
        console.error('Error creating admin post:', error);

        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to create post',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  // Update a post (Admin)
  app.put(
    '/api/admin/tips-trips-advice/:postId',
    authenticateAdmin,
    upload.array('photos', 10), // Allow up to 10 photos
    async (req: Request, res: Response) => {
      try {
        const userId = req.adminUser?.uid;
        const postId = parseInt(req.params.postId);

        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'Admin not authenticated',
            code: ErrorCode.UNAUTHORIZED,
          });
        }

        if (isNaN(postId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid post ID',
          });
        }

        const { title, description, post_type, existingPhotoIds } = req.body;
        const files = req.files as Express.Multer.File[];

        // Parse existingPhotoIds
        let photosToKeep: number[] = [];
        if (existingPhotoIds) {
          // API contract: existingPhotoIds must be an array of photo IDs
          if (!Array.isArray(existingPhotoIds)) {
            return res.status(400).json({
              success: false,
              message: 'existingPhotoIds must be an array of photo IDs',
            });
          }
          photosToKeep = existingPhotoIds.map((id: string) =>
            parseInt(id.trim())
          );
        }

        // Validate required fields
        if (!title || !description || !post_type) {
          return res.status(400).json({
            success: false,
            message: 'Title, description, and post type are required',
          });
        }

        // Upload new photos to Firebase Storage
        const uploadedPhotos = [];
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log(
              `Uploading new photo ${i + 1}/${files.length}:`,
              file.originalname
            );

            const uploadResult = await uploadTipsPhoto(
              file.buffer,
              file.originalname,
              file.mimetype,
              userId
            );

            if (!uploadResult.success) {
              console.error(
                `Failed to upload photo ${i + 1}:`,
                uploadResult.error
              );
              return res.status(400).json({
                success: false,
                message: `Failed to upload photo: ${uploadResult.error}`,
              });
            }

            uploadedPhotos.push({
              photo_url: uploadResult.url!,
              photo_public_id: uploadResult.fileName!,
              display_order: i + 1,
            });
          }
        }

        // Update the post
        const updateData: UpdateTipsTripsAdviceRequest = {
          title,
          description,
          post_type,
          photos: uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
          photosToKeep: photosToKeep.length > 0 ? photosToKeep : undefined,
        };

        await tipsTripsAdviceService.updatePost(postId, updateData, userId);

        res.json({
          success: true,
          message: 'Post updated successfully',
        });
      } catch (error) {
        console.error('Error updating admin post:', error);

        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to update post',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  // Get a single post by ID (Admin)
  app.get(
    '/api/admin/tips-trips-advice/:postId',
    authenticateAdmin,
    async (req: Request, res: Response) => {
      try {
        const postId = parseInt(req.params.postId);

        if (isNaN(postId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid post ID',
          });
        }

        const post = await tipsTripsAdviceService.getPostById(postId);

        res.json({
          success: true,
          data: post,
        });
      } catch (error) {
        console.error('Error fetching admin post:', error);

        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to fetch post',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  // Get all posts (Admin)
  app.get(
    '/api/admin/tips-trips-advice',
    authenticateAdmin,
    async (req: Request, res: Response) => {
      try {
        const searchParams = {
          post_type: req.query.post_type as any,
          search: req.query.search as string,
          page: req.query.page ? parseInt(req.query.page as string) : undefined,
          limit: req.query.limit
            ? parseInt(req.query.limit as string)
            : undefined,
        };

        const posts = await tipsTripsAdviceService.searchPosts(searchParams);

        res.json({
          success: true,
          data: posts,
        });
      } catch (error) {
        console.error('Error fetching admin posts:', error);

        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to fetch posts',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  // Delete a post (Admin)
  app.delete(
    '/api/admin/tips-trips-advice/:postId',
    authenticateAdmin,
    async (req: Request, res: Response) => {
      try {
        const userId = req.adminUser?.uid;
        const postId = parseInt(req.params.postId);

        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'Admin not authenticated',
            code: ErrorCode.UNAUTHORIZED,
          });
        }

        if (isNaN(postId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid post ID',
          });
        }

        await tipsTripsAdviceService.deletePost(postId, userId);

        res.json({
          success: true,
          message: 'Post deleted successfully',
        });
      } catch (error) {
        console.error('Error deleting admin post:', error);

        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to delete post',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  // Multer error handling middleware - must be at the end
  app.use((error: any, req: Request, res: Response, next: any) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum file size is 10MB.',
        });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Unexpected file. Please check your file type.',
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${error.message}`,
      });
    }
    next(error);
  });
}
