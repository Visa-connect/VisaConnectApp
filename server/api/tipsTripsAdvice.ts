import { Express, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { tipsTripsAdviceService } from '../services/tipsTripsAdviceService';
import { AppError, ErrorCode } from '../types/errors';
import {
  CreateTipsTripsAdviceRequest,
  UpdateTipsTripsAdviceRequest,
  SearchTipsTripsAdviceRequest,
  AddCommentRequest,
} from '../types/tipsTripsAdvice';

export default function tipsTripsAdviceApi(app: Express) {
  // Create a new Tips, Trips, or Advice post
  app.post(
    '/api/tips-trips-advice',
    authenticateUser,
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

        const postData: CreateTipsTripsAdviceRequest = req.body;

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

        const updateData: UpdateTipsTripsAdviceRequest = req.body;

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
}
