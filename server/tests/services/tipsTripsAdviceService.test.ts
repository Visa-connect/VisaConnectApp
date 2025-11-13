import { TipsTripsAdviceService } from '../../services/tipsTripsAdviceService';
import pool from '../../db/config';
import { v4 as uuidv4 } from 'uuid';
import {
  ValidationError,
  NotFoundError,
  DatabaseError,
  AppError,
} from '../../types/errors';

// Mock dependencies
jest.mock('../../db/config');
jest.mock('uuid');

describe('TipsTripsAdviceService', () => {
  let service: TipsTripsAdviceService;
  let mockClient: any;

  beforeEach(() => {
    service = new TipsTripsAdviceService();

    // Setup mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    const validPostData = {
      title: 'Test Post',
      description: 'Test Description',
      post_type: 'tip' as const,
      photos: [],
    };
    const creatorId = 'user-123';
    const postId = 'post-123';

    beforeEach(() => {
      (uuidv4 as jest.Mock).mockReturnValue(postId);
      (pool.connect as jest.Mock).mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValue({ rows: [] });
    });

    it('should create a post successfully without photos', async () => {
      const result = await service.createPost(validPostData, creatorId);

      expect(result).toBe(postId);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tips_trips_advice'),
        [
          postId,
          validPostData.title,
          validPostData.description,
          creatorId,
          validPostData.post_type,
        ]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create a post successfully with photos', async () => {
      const postDataWithPhotos = {
        ...validPostData,
        photos: [
          {
            photo_url: 'https://example.com/photo1.jpg',
            photo_public_id: 'public-1',
            display_order: 1,
          },
          {
            photo_url: 'https://example.com/photo2.jpg',
            photo_public_id: 'public-2',
            display_order: 2,
          },
        ],
      };

      const result = await service.createPost(postDataWithPhotos, creatorId);

      expect(result).toBe(postId);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tips_trips_advice_photos'),
        [postId, 'https://example.com/photo1.jpg', 'public-1', 1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tips_trips_advice_photos'),
        [postId, 'https://example.com/photo2.jpg', 'public-2', 2]
      );
    });

    it('should throw ValidationError when title is missing', async () => {
      const invalidData = { ...validPostData, title: '' };

      await expect(service.createPost(invalidData, creatorId)).rejects.toThrow(
        ValidationError
      );
      await expect(service.createPost(invalidData, creatorId)).rejects.toThrow(
        'Title, description, and post type are required'
      );
    });

    it('should throw ValidationError when description is missing', async () => {
      const invalidData = { ...validPostData, description: '' };

      await expect(service.createPost(invalidData, creatorId)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError when post_type is invalid', async () => {
      const invalidData = { ...validPostData, post_type: 'invalid' as any };

      await expect(service.createPost(invalidData, creatorId)).rejects.toThrow(
        ValidationError
      );
      await expect(service.createPost(invalidData, creatorId)).rejects.toThrow(
        'Post type must be tip, trip, or advice'
      );
    });

    it('should throw ValidationError when title exceeds 200 characters', async () => {
      const invalidData = { ...validPostData, title: 'a'.repeat(201) };

      await expect(service.createPost(invalidData, creatorId)).rejects.toThrow(
        ValidationError
      );
      await expect(service.createPost(invalidData, creatorId)).rejects.toThrow(
        'Title must be 200 characters or less'
      );
    });

    it('should throw ValidationError when photo_url is missing', async () => {
      const invalidData = {
        ...validPostData,
        photos: [{ photo_url: '', photo_public_id: 'public-1' }],
      };

      await expect(service.createPost(invalidData, creatorId)).rejects.toThrow(
        ValidationError
      );
      await expect(service.createPost(invalidData, creatorId)).rejects.toThrow(
        'Photo upload failed: missing image data'
      );
    });

    it('should rollback transaction on error', async () => {
      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('INSERT INTO tips_trips_advice')) {
          throw new Error('Database error');
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        service.createPost(validPostData, creatorId)
      ).rejects.toThrow(DatabaseError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle photos without photo_public_id', async () => {
      const postDataWithPhotos = {
        ...validPostData,
        photos: [{ photo_url: 'https://example.com/photo1.jpg' }] as any,
      };

      await service.createPost(postDataWithPhotos, creatorId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tips_trips_advice_photos'),
        [postId, 'https://example.com/photo1.jpg', null, 1]
      );
    });
  });

  describe('getPostById', () => {
    const postId = 'post-123';
    const userId = 'user-123';

    const mockPostRow = {
      id: postId,
      title: 'Test Post',
      description: 'Test Description',
      creator_id: userId,
      post_type: 'tip',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      profile_photo_url: 'https://example.com/photo.jpg',
      likes_count: '5',
      comments_count: '3',
      is_liked: true,
    };

    beforeEach(() => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockPostRow] });
    });

    it('should fetch a post successfully with all related data', async () => {
      const mockPhotos = [
        { id: 'photo-1', post_id: postId, photo_url: 'url1', display_order: 1 },
      ];
      const mockComments = [
        {
          id: 'comment-1',
          post_id: postId,
          user_id: userId,
          comment: 'Great post!',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          profile_photo_url: 'url',
        },
      ];
      const mockLikes = [
        {
          id: 'like-1',
          post_id: postId,
          user_id: userId,
          first_name: 'Bob',
          last_name: 'Jones',
          email: 'bob@example.com',
          profile_photo_url: 'url',
        },
      ];

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockPostRow] }) // Main query
        .mockResolvedValueOnce({ rows: mockPhotos }) // Photos
        .mockResolvedValueOnce({ rows: mockComments }) // Comments
        .mockResolvedValueOnce({ rows: mockLikes }); // Likes

      const result = await service.getPostById(postId, userId);

      expect(result.id).toBe(postId);
      expect(result.title).toBe('Test Post');
      expect(result.photos).toHaveLength(1);
      expect(result.comments).toHaveLength(1);
      expect(result.likes).toHaveLength(1);
      expect(result.likes_count).toBe(5);
      expect(result.comments_count).toBe(3);
      expect(result.is_liked).toBe(true);
    });

    it('should fetch a post without userId', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockPostRow] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getPostById(postId);

      expect(result.id).toBe(postId);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.id = $1'),
        [postId]
      );
    });

    it('should throw NotFoundError when post does not exist', async () => {
      jest.clearAllMocks();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(service.getPostById(postId, userId)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.getPostById(postId, userId)).rejects.toThrow(
        DatabaseError
      );
    });

    it('should properly map comment user data', async () => {
      const mockComment = {
        id: 'comment-1',
        post_id: postId,
        user_id: 'user-456',
        comment: 'Nice!',
        first_name: 'Alice',
        last_name: 'Wonder',
        email: 'alice@example.com',
        profile_photo_url: 'photo-url',
      };

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockPostRow] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockComment] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getPostById(postId);

      expect(result.comments[0].user).toEqual({
        id: 'user-456',
        first_name: 'Alice',
        last_name: 'Wonder',
        email: 'alice@example.com',
        profile_photo_url: 'photo-url',
      });
    });
  });

  describe('searchPosts', () => {
    const userId = 'user-123';
    const mockPosts = [
      {
        id: 'post-1',
        title: 'Post 1',
        description: 'Description 1',
        creator_id: userId,
        post_type: 'tip',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        profile_photo_url: 'url',
        likes_count: '2',
        comments_count: '1',
        is_liked: false,
      },
    ];

    beforeEach(() => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockPosts });
    });

    it('should search posts with no filters', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockPosts })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.searchPosts({}, userId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('post-1');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.is_active = true'),
        [userId]
      );
    });

    it('should filter by post_type', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockPosts })
        .mockResolvedValueOnce({ rows: [] });

      await service.searchPosts({ post_type: 'tip' }, userId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND t.post_type = $2'),
        [userId, 'tip']
      );
    });

    it('should filter by creator_id', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockPosts })
        .mockResolvedValueOnce({ rows: [] });

      await service.searchPosts({ creator_id: userId }, userId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND t.creator_id = $2'),
        [userId, userId]
      );
    });

    it('should filter by search term', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockPosts })
        .mockResolvedValueOnce({ rows: [] });

      await service.searchPosts({ search: 'test' }, userId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        [userId, '%test%']
      );
    });

    it('should apply pagination with limit and page', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockPosts })
        .mockResolvedValueOnce({ rows: [] });

      await service.searchPosts({ limit: 10, page: 2 }, userId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        [userId, 10, 10]
      );
    });

    it('should search without userId', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockPosts })
        .mockResolvedValueOnce({ rows: [] });

      await service.searchPosts({});

      expect(pool.query).toHaveBeenCalledWith(expect.any(String), []);
    });

    it('should handle multiple filters simultaneously', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockPosts })
        .mockResolvedValueOnce({ rows: [] });

      await service.searchPosts(
        {
          post_type: 'tip',
          creator_id: userId,
          search: 'test',
          limit: 5,
          page: 1,
        },
        userId
      );

      const callArgs = (pool.query as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('AND t.post_type = $2');
      expect(callArgs[0]).toContain('AND t.creator_id = $3');
      expect(callArgs[0]).toContain('ILIKE');
      expect(callArgs[1]).toEqual([userId, 'tip', userId, '%test%', 5, 0]);
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.searchPosts({}, userId)).rejects.toThrow(
        DatabaseError
      );
    });
  });

  describe('updatePost', () => {
    const postId = 'post-123';
    const userId = 'user-123';
    const updateData = {
      title: 'Updated Title',
      description: 'Updated Description',
    };

    beforeEach(() => {
      (pool.connect as jest.Mock).mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValue({ rows: [{ creator_id: userId }] });
    });

    it('should update post successfully', async () => {
      await service.updatePost(postId, updateData, userId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT creator_id FROM tips_trips_advice'),
        [postId]
      );
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tips_trips_advice SET'),
        expect.arrayContaining(['Updated Title', 'Updated Description', postId])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw NotFoundError when post does not exist', async () => {
      jest.clearAllMocks();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        service.updatePost(postId, updateData, userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw AppError when user is not the creator', async () => {
      jest.clearAllMocks();
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{ creator_id: 'other-user' }],
      });

      await expect(
        service.updatePost(postId, updateData, userId)
      ).rejects.toThrow(AppError);
      await expect(
        service.updatePost(postId, updateData, userId)
      ).rejects.toThrow('You can only update your own posts');
    });

    it('should validate post_type', async () => {
      jest.clearAllMocks();
      const invalidUpdate = { post_type: 'invalid' as any };
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ creator_id: userId }],
      });

      await expect(
        service.updatePost(postId, invalidUpdate, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate title length', async () => {
      jest.clearAllMocks();
      const invalidUpdate = { title: 'a'.repeat(201) };
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ creator_id: userId }],
      });

      await expect(
        service.updatePost(postId, invalidUpdate, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle photo deletions with photosToKeep', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ creator_id: userId }],
      });
      const updateWithPhotos = {
        photosToKeep: [1, 2],
      };

      await service.updatePost(postId, updateWithPhotos, userId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM tips_trips_advice_photos'),
        expect.arrayContaining([postId, 1, 2])
      );
    });

    it('should delete all photos when photosToKeep is empty array', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ creator_id: userId }],
      });
      const updateWithPhotos = {
        photosToKeep: [],
      };

      await service.updatePost(postId, updateWithPhotos, userId);

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM tips_trips_advice_photos WHERE post_id = $1',
        [postId]
      );
    });

    it('should add new photos', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ creator_id: userId }],
      });
      mockClient.query.mockImplementation((query: string, _params: any[]) => {
        if (query.includes('SELECT COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '2' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const updateWithPhotos = {
        photos: [
          {
            photo_url: 'https://example.com/new.jpg',
            photo_public_id: 'new-1',
          },
        ],
      };

      await service.updatePost(postId, updateWithPhotos, userId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tips_trips_advice_photos'),
        expect.arrayContaining([postId, 'https://example.com/new.jpg', 'new-1'])
      );
    });

    it('should rollback on error', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ creator_id: userId }],
      });
      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('UPDATE tips_trips_advice')) {
          throw new Error('Update failed');
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        service.updatePost(postId, updateData, userId)
      ).rejects.toThrow();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('deletePost', () => {
    const postId = 'post-123';
    const userId = 'user-123';

    it('should soft delete post successfully', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ creator_id: userId }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.deletePost(postId, userId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'UPDATE tips_trips_advice SET is_active = false'
        ),
        [postId]
      );
    });

    it('should throw NotFoundError when post does not exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(service.deletePost(postId, userId)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw AppError when user is not the creator', async () => {
      jest.clearAllMocks();
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{ creator_id: 'other-user' }],
      });

      await expect(service.deletePost(postId, userId)).rejects.toThrow(
        AppError
      );
      await expect(service.deletePost(postId, userId)).rejects.toThrow(
        'You can only delete your own posts'
      );
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.deletePost(postId, userId)).rejects.toThrow(
        DatabaseError
      );
    });
  });

  describe('addComment', () => {
    const postId = 'post-123';
    const userId = 'user-123';
    const comment = 'This is a test comment';

    const mockUser = {
      id: userId,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      profile_photo_url: 'url',
    };

    it('should add comment successfully', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: postId }] })
        .mockResolvedValueOnce({
          rows: [
            { id: 'comment-1', post_id: postId, user_id: userId, comment },
          ],
        })
        .mockResolvedValueOnce({ rows: [mockUser] });

      const result = await service.addComment(postId, comment, userId);

      expect(result.comment).toBe(comment);
      expect(result.user.first_name).toBe('John');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tips_trips_advice_comments'),
        [postId, userId, comment]
      );
    });

    it('should throw ValidationError when comment is empty', async () => {
      await expect(service.addComment(postId, '', userId)).rejects.toThrow(
        ValidationError
      );
      await expect(service.addComment(postId, '   ', userId)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw NotFoundError when post does not exist', async () => {
      jest.clearAllMocks();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(service.addComment(postId, comment, userId)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should trim comment whitespace', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: postId }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'comment-1',
              post_id: postId,
              user_id: userId,
              comment: comment.trim(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [mockUser] });

      await service.addComment(postId, '  ' + comment + '  ', userId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tips_trips_advice_comments'),
        [postId, userId, comment]
      );
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.addComment(postId, comment, userId)).rejects.toThrow(
        DatabaseError
      );
    });
  });

  describe('toggleLike', () => {
    const postId = 'post-123';
    const userId = 'user-123';

    it('should add like when not already liked', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: postId }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.toggleLike(postId, userId);

      expect(result.liked).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        'INSERT INTO tips_trips_advice_likes (post_id, user_id) VALUES ($1, $2)',
        [postId, userId]
      );
    });

    it('should remove like when already liked', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: postId }] })
        .mockResolvedValueOnce({ rows: [{ id: 'like-1' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.toggleLike(postId, userId);

      expect(result.liked).toBe(false);
      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM tips_trips_advice_likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );
    });

    it('should throw NotFoundError when post does not exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(service.toggleLike(postId, userId)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.toggleLike(postId, userId)).rejects.toThrow(
        DatabaseError
      );
    });
  });

  describe('getUserPosts', () => {
    const userId = 'user-123';
    const mockPosts = [
      {
        id: 'post-1',
        title: 'User Post',
        description: 'Description',
        creator_id: userId,
        post_type: 'tip',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        profile_photo_url: 'url',
        likes_count: '3',
        comments_count: '2',
      },
    ];

    it('should fetch user posts successfully', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockPosts })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getUserPosts(userId);

      expect(result).toHaveLength(1);
      expect(result[0].creator_id).toBe(userId);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.creator_id = $1'),
        [userId]
      );
    });

    it('should filter by post_type when provided', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockPosts })
        .mockResolvedValueOnce({ rows: [] });

      await service.getUserPosts(userId, 'tip');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND t.post_type = $2'),
        [userId, 'tip']
      );
    });

    it('should return posts with photos', async () => {
      const mockPhotos = [
        { id: 'photo-1', post_id: 'post-1', photo_url: 'url' },
      ];
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockPosts })
        .mockResolvedValueOnce({ rows: mockPhotos });

      const result = await service.getUserPosts(userId);

      expect(result[0].photos).toHaveLength(1);
      expect(result[0].photos[0].photo_url).toBe('url');
    });

    it('should return empty array when user has no posts', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await service.getUserPosts(userId);

      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.getUserPosts(userId)).rejects.toThrow(DatabaseError);
    });

    it('should order posts by created_at DESC', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockPosts })
        .mockResolvedValueOnce({ rows: [] });

      await service.getUserPosts(userId);

      const callArgs = (pool.query as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('ORDER BY t.created_at DESC');
    });
  });
});
