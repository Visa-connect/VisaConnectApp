import { meetupService } from '../../services/meetupService';
import pool from '../../db/config';
import {
  MeetupNotFoundError,
  AlreadyInterestedError,
  NotInterestedError,
} from '../../types/errors';

// Mock the database pool
jest.mock('../../db/config', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

const mockPool = pool as jest.Mocked<typeof pool>;

describe('MeetupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    it('should return all meetup categories', async () => {
      const mockCategories = [
        {
          id: 1,
          name: 'Social Gathering',
          description: 'Social events',
          created_at: new Date('2024-01-01'),
        },
        {
          id: 2,
          name: 'Networking',
          description: 'Professional networking',
          created_at: new Date('2024-01-02'),
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockCategories,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await meetupService.getCategories();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Social Gathering');
      expect(result[1].name).toBe('Networking');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT id, name, description, created_at FROM meetup_categories'
        )
      );
    });

    it('should throw error when database query fails', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(meetupService.getCategories()).rejects.toThrow(
        'Failed to fetch meetup categories'
      );
    });
  });

  describe('createMeetup', () => {
    const mockUserId = 'user-123';
    const mockMeetupData = {
      category_id: 1,
      title: 'Test Meetup',
      description: 'Test description',
      location: 'San Francisco, CA',
      meetup_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      max_participants: 50,
      photo_url: 'https://example.com/photo.jpg',
      photo_public_id: 'meetups/photo-123',
    };

    it('should create a meetup successfully', async () => {
      const mockMeetupId = 'meetup-123';

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: mockMeetupId }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      const result = await meetupService.createMeetup(
        mockUserId,
        mockMeetupData
      );

      expect(result).toBe(mockMeetupId);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO meetups'),
        expect.arrayContaining([
          mockUserId,
          mockMeetupData.category_id,
          mockMeetupData.title,
          mockMeetupData.description,
          mockMeetupData.location,
        ])
      );
    });

    it('should create a meetup without optional fields', async () => {
      const mockMeetupId = 'meetup-123';
      const minimalMeetupData = {
        category_id: 1,
        title: 'Test Meetup',
        description: 'Test description',
        location: 'San Francisco, CA',
        meetup_date: new Date(Date.now() + 86400000).toISOString(),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: mockMeetupId }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      const result = await meetupService.createMeetup(
        mockUserId,
        minimalMeetupData
      );

      expect(result).toBe(mockMeetupId);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO meetups'),
        expect.arrayContaining([null, null]) // photo_url and photo_public_id should be null
      );
    });

    it('should throw error when validation fails (title too long)', async () => {
      const invalidData = {
        ...mockMeetupData,
        title: 'a'.repeat(101), // Too long
      };

      await expect(
        meetupService.createMeetup(mockUserId, invalidData)
      ).rejects.toThrow('Title must be between 1 and 100 characters');
    });

    it('should throw error when validation fails (meetup date in past)', async () => {
      const invalidData = {
        ...mockMeetupData,
        meetup_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      };

      await expect(
        meetupService.createMeetup(mockUserId, invalidData)
      ).rejects.toThrow('Meetup date must be in the future');
    });

    it('should throw error when database query fails', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(
        meetupService.createMeetup(mockUserId, mockMeetupData)
      ).rejects.toThrow('Failed to create meetup');
    });
  });

  describe('getMeetup', () => {
    const mockMeetupId = 'meetup-123';
    const mockUserId = 'user-123';

    it('should return a meetup with all data', async () => {
      const mockMeetupRow = {
        id: mockMeetupId,
        creator_id: 'creator-123',
        category_id: 1,
        title: 'Test Meetup',
        description: 'Test description',
        location: 'San Francisco, CA',
        meetup_date: new Date('2024-12-31'),
        max_participants: 50,
        is_active: true,
        photo_url: 'https://example.com/photo.jpg',
        photo_public_id: 'meetups/photo-123',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02'),
        category_name: 'Social Gathering',
        category_description: 'Social events',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        profile_photo_url: 'https://example.com/profile.jpg',
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [mockMeetupRow],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [{ count: '5' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await meetupService.getMeetup(mockMeetupId, mockUserId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockMeetupId);
      expect(result?.title).toBe('Test Meetup');
      expect(result?.creator?.email).toBe('john@example.com');
      expect(result?.category?.name).toBe('Social Gathering');
      expect(result?.interest_count).toBe(5);
      expect(result?.is_interested).toBe(true);
    });

    it('should return null when meetup not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await meetupService.getMeetup(mockMeetupId);

      expect(result).toBeNull();
    });

    it('should not check user interest when userId not provided', async () => {
      const mockMeetupRow = {
        id: mockMeetupId,
        creator_id: 'creator-123',
        category_id: 1,
        title: 'Test Meetup',
        description: 'Test description',
        location: 'San Francisco, CA',
        meetup_date: new Date('2024-12-31'),
        max_participants: 50,
        is_active: true,
        photo_url: null,
        photo_public_id: null,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02'),
        category_name: 'Social Gathering',
        category_description: 'Social events',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        profile_photo_url: null,
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [mockMeetupRow],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [{ count: '0' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await meetupService.getMeetup(mockMeetupId);

      expect(result).not.toBeNull();
      expect(result?.is_interested).toBeUndefined();
      expect(mockPool.query).toHaveBeenCalledTimes(2); // Should not call user interest query
    });

    it('should throw error when database query fails', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(meetupService.getMeetup(mockMeetupId)).rejects.toThrow(
        'Failed to fetch meetup'
      );
    });
  });

  describe('searchMeetups', () => {
    const mockUserId = 'user-123';

    it('should search meetups with keyword', async () => {
      const mockMeetupRows = [
        {
          id: 'meetup-1',
          creator_id: 'creator-1',
          category_id: 1,
          title: 'Tech Meetup',
          description: 'Technology discussion',
          location: 'San Francisco, CA',
          meetup_date: new Date('2024-12-31'),
          max_participants: 50,
          is_active: true,
          photo_url: null,
          photo_public_id: null,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-02'),
          category_name: 'Networking',
          category_description: 'Professional networking',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          profile_photo_url: null,
          interest_count: 5,
          is_interested: false,
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockMeetupRows,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await meetupService.searchMeetups(
        { keyword: 'tech' },
        mockUserId
      );

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Tech Meetup');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining([mockUserId, expect.stringContaining('%tech%')])
      );
    });

    it('should search meetups with category filter', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await meetupService.searchMeetups({ category_id: 1 }, mockUserId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('category_id'),
        expect.arrayContaining([mockUserId, 1])
      );
    });

    it('should search meetups with date range', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const dateFrom = '2024-12-01';
      const dateTo = '2024-12-31';

      await meetupService.searchMeetups(
        { date_from: dateFrom, date_to: dateTo },
        mockUserId
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('meetup_date'),
        expect.arrayContaining([mockUserId, expect.any(Date), expect.any(Date)])
      );
    });

    it('should search meetups with limit and offset', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await meetupService.searchMeetups({ limit: 10, offset: 20 }, mockUserId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([mockUserId, 10, 20])
      );
    });

    it('should search meetups without userId', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await meetupService.searchMeetups({ keyword: 'tech' });

      // Should not include userId in params
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('1=0'), // Empty user interests subquery
        expect.not.arrayContaining([mockUserId])
      );
    });

    it('should throw error when database query fails', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(
        meetupService.searchMeetups({ keyword: 'tech' })
      ).rejects.toThrow('Failed to search meetups');
    });
  });

  describe('expressInterest', () => {
    const mockMeetupId = 'meetup-123';
    const mockUserId = 'user-123';

    it('should express interest successfully', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: mockMeetupId, creator_id: 'creator-123' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: [],
        } as any);

      await meetupService.expressInterest(mockMeetupId, mockUserId);

      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO meetup_interests'),
        [mockMeetupId, mockUserId]
      );
    });

    it('should throw MeetupNotFoundError when meetup does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        meetupService.expressInterest(mockMeetupId, mockUserId)
      ).rejects.toThrow(MeetupNotFoundError);
    });

    it('should throw AlreadyInterestedError when user already interested', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: mockMeetupId, creator_id: 'creator-123' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      await expect(
        meetupService.expressInterest(mockMeetupId, mockUserId)
      ).rejects.toThrow(AlreadyInterestedError);
    });

    it('should throw DatabaseError when database query fails', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(
        meetupService.expressInterest(mockMeetupId, mockUserId)
      ).rejects.toThrow('Failed to express interest');
    });
  });

  describe('removeInterest', () => {
    const mockMeetupId = 'meetup-123';
    const mockUserId = 'user-123';

    it('should remove interest successfully', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: mockMeetupId }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1,
          command: 'DELETE',
          oid: 0,
          fields: [],
        } as any);

      await meetupService.removeInterest(mockMeetupId, mockUserId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM meetup_interests'),
        [mockMeetupId, mockUserId]
      );
    });

    it('should throw MeetupNotFoundError when meetup does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        meetupService.removeInterest(mockMeetupId, mockUserId)
      ).rejects.toThrow(MeetupNotFoundError);
    });

    it('should throw NotInterestedError when user not interested', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: mockMeetupId }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'DELETE',
          oid: 0,
          fields: [],
        } as any);

      await expect(
        meetupService.removeInterest(mockMeetupId, mockUserId)
      ).rejects.toThrow(NotInterestedError);
    });

    it('should throw DatabaseError when database query fails', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(
        meetupService.removeInterest(mockMeetupId, mockUserId)
      ).rejects.toThrow('Failed to remove interest');
    });
  });

  describe('reportMeetup', () => {
    const mockMeetupId = 'meetup-123';
    const mockReporterId = 'reporter-123';
    const mockReason = 'Inappropriate content';

    it('should report meetup successfully', async () => {
      const mockReportId = 'report-123';

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: mockReportId }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      const result = await meetupService.reportMeetup(
        mockMeetupId,
        mockReporterId,
        mockReason
      );

      expect(result).toBe(mockReportId);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO meetup_reports'),
        [mockMeetupId, mockReporterId, mockReason]
      );
    });

    it('should throw error when database query fails', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(
        meetupService.reportMeetup(mockMeetupId, mockReporterId, mockReason)
      ).rejects.toThrow('Failed to report meetup');
    });
  });

  describe('getUserMeetups', () => {
    const mockUserId = 'user-123';

    it('should return user meetups', async () => {
      const mockMeetupRows = [
        {
          id: 'meetup-1',
          creator_id: mockUserId,
          category_id: 1,
          title: 'My Meetup',
          description: 'My description',
          location: 'San Francisco, CA',
          meetup_date: new Date('2024-12-31'),
          max_participants: 50,
          is_active: true,
          photo_url: null,
          photo_public_id: null,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-02'),
          category_name: 'Social Gathering',
          category_description: 'Social events',
        },
      ];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: mockMeetupRows,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [{ count: '3' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await meetupService.getUserMeetups(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('My Meetup');
      expect(result[0].interest_count).toBe(3);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('creator_id = $1'),
        [mockUserId]
      );
    });

    it('should throw error when database query fails', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(meetupService.getUserMeetups(mockUserId)).rejects.toThrow(
        'Failed to fetch user meetups'
      );
    });
  });

  describe('getUserInterestedMeetups', () => {
    const mockUserId = 'user-123';

    it('should return user interested meetups', async () => {
      const mockMeetupRows = [
        {
          id: 'meetup-1',
          creator_id: 'creator-1',
          category_id: 1,
          title: 'Interesting Meetup',
          description: 'Interesting description',
          location: 'San Francisco, CA',
          meetup_date: new Date('2024-12-31'),
          max_participants: 50,
          is_active: true,
          photo_url: null,
          photo_public_id: null,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-02'),
          category_name: 'Networking',
          category_description: 'Professional networking',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          profile_photo_url: null,
        },
      ];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: mockMeetupRows,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [{ count: '5' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await meetupService.getUserInterestedMeetups(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Interesting Meetup');
      expect(result[0].is_interested).toBe(true);
      expect(result[0].interest_count).toBe(5);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN meetup_interests'),
        [mockUserId]
      );
    });

    it('should throw error when database query fails', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(
        meetupService.getUserInterestedMeetups(mockUserId)
      ).rejects.toThrow('Failed to fetch user interested meetups');
    });
  });

  describe('updateMeetup', () => {
    const mockMeetupId = 'meetup-123';
    const mockUserId = 'creator-123';
    const mockUpdateData = {
      title: 'Updated Meetup Title',
      description: 'Updated description',
    };

    it('should update meetup successfully', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ creator_id: mockUserId }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: 'UPDATE',
          oid: 0,
          fields: [],
        } as any);

      await meetupService.updateMeetup(
        mockMeetupId,
        mockUserId,
        mockUpdateData
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE meetups SET'),
        expect.arrayContaining([
          mockUpdateData.title,
          mockUpdateData.description,
          expect.any(Date),
          mockMeetupId,
        ])
      );
    });

    it('should throw error when meetup not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        meetupService.updateMeetup(mockMeetupId, mockUserId, mockUpdateData)
      ).rejects.toThrow('Meetup not found');
    });

    it('should throw error when user is not creator', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ creator_id: 'different-user' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        meetupService.updateMeetup(mockMeetupId, mockUserId, mockUpdateData)
      ).rejects.toThrow('Only the creator can update this meetup');
    });

    it('should return early when no fields to update', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ creator_id: mockUserId }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await meetupService.updateMeetup(mockMeetupId, mockUserId, {});

      // Should only call SELECT, not UPDATE
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when validation fails', async () => {
      const invalidData = {
        title: 'a'.repeat(101), // Too long
      };

      await expect(
        meetupService.updateMeetup(mockMeetupId, mockUserId, invalidData)
      ).rejects.toThrow('Title must be between 1 and 100 characters');
    });

    it('should throw error when database query fails', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ creator_id: mockUserId }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(
        meetupService.updateMeetup(mockMeetupId, mockUserId, mockUpdateData)
      ).rejects.toThrow('Failed to update meetup');
    });
  });

  describe('deleteMeetup', () => {
    const mockMeetupId = 'meetup-123';
    const mockUserId = 'creator-123';

    it('should delete meetup successfully', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ creator_id: mockUserId }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: 'DELETE',
          oid: 0,
          fields: [],
        } as any);

      await meetupService.deleteMeetup(mockMeetupId, mockUserId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM meetups'),
        [mockMeetupId]
      );
    });

    it('should throw error when meetup not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        meetupService.deleteMeetup(mockMeetupId, mockUserId)
      ).rejects.toThrow('Meetup not found');
    });

    it('should throw error when user is not creator', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ creator_id: 'different-user' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        meetupService.deleteMeetup(mockMeetupId, mockUserId)
      ).rejects.toThrow('Only the creator can delete this meetup');
    });

    it('should throw error when database query fails', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ creator_id: mockUserId }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(
        meetupService.deleteMeetup(mockMeetupId, mockUserId)
      ).rejects.toThrow('Failed to delete meetup');
    });
  });
});
