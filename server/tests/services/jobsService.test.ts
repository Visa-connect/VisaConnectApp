import {
  jobsService,
  JobSubmission,
  Job,
  JobWithBusiness,
} from '../../services/jobsService';
import pool from '../../db/config';

// Mock the database pool
jest.mock('../../db/config', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

const mockPool = pool as jest.Mocked<typeof pool>;

describe('JobsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    const mockJobData: JobSubmission = {
      business_id: 1,
      title: 'Software Engineer',
      description: 'We are looking for a talented software engineer',
      location: 'San Francisco, CA',
      job_type: 'hourly',
      rate_from: 50,
      rate_to: 80,
      business_logo_url: 'https://example.com/logo.png',
    };

    const mockCreatedJob: Job = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      business_id: 1,
      title: 'Software Engineer',
      description: 'We are looking for a talented software engineer',
      location: 'San Francisco, CA',
      job_type: 'hourly',
      rate_from: 50,
      rate_to: 80,
      business_logo_url: 'https://example.com/logo.png',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should create a job successfully', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockCreatedJob],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      const result = await jobsService.createJob(mockJobData);

      expect(result).toEqual(mockCreatedJob);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      const queryCall = (mockPool.query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).toContain('INSERT INTO jobs');
      expect(queryCall[0]).toContain('gen_random_uuid()');
      expect(queryCall[1]).toEqual([
        mockJobData.business_id,
        mockJobData.title,
        mockJobData.description,
        mockJobData.location,
        mockJobData.job_type,
        mockJobData.rate_from,
        mockJobData.rate_to,
        mockJobData.business_logo_url,
      ]);
    });

    it('should handle null business_logo_url', async () => {
      const jobDataWithoutLogo = {
        ...mockJobData,
        business_logo_url: undefined,
      };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...mockCreatedJob, business_logo_url: null }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      const result = await jobsService.createJob(jobDataWithoutLogo);

      expect(result.business_logo_url).toBeNull();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([null])
      );
    });

    it('should handle fixed rate job type', async () => {
      const fixedRateJobData = {
        ...mockJobData,
        job_type: 'fixed' as const,
        rate_from: 1000,
        rate_to: null,
      };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            ...mockCreatedJob,
            job_type: 'fixed',
            rate_from: 1000,
            rate_to: null,
          },
        ],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      const result = await jobsService.createJob(fixedRateJobData);

      expect(result.job_type).toBe('fixed');
      expect(result.rate_to).toBeNull();
    });
  });

  describe('getJobById', () => {
    const mockJobWithBusiness: JobWithBusiness = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      business_id: 1,
      title: 'Software Engineer',
      description: 'We are looking for a talented software engineer',
      location: 'San Francisco, CA',
      job_type: 'hourly',
      rate_from: 50,
      rate_to: 80,
      business_logo_url: 'https://example.com/logo.png',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      business_name: 'Tech Corp',
      business_address: '123 Main St',
      business_website: 'https://techcorp.com',
      business_owner_name: 'John Doe',
      business_user_id: 'user-123',
    } as JobWithBusiness;

    it('should get job by ID successfully', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockJobWithBusiness],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await jobsService.getJobById(jobId);

      expect(result).toEqual(mockJobWithBusiness);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [jobId]
      );
    });

    it('should return null when job not found', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await jobsService.getJobById(jobId);

      expect(result).toBeNull();
    });
  });

  describe('getAllJobs', () => {
    const mockJobs: JobWithBusiness[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        business_id: 1,
        title: 'Software Engineer',
        description: 'We are looking for a talented software engineer',
        location: 'San Francisco, CA',
        job_type: 'hourly',
        rate_from: 50,
        rate_to: 80,
        business_logo_url: null,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
        business_name: 'Tech Corp',
        business_address: '123 Main St',
        business_website: null,
        business_owner_name: 'John Doe',
        business_user_id: 'user-123',
      },
    ];

    it('should get all jobs with default filters', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: mockJobs,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await jobsService.getAllJobs();

      expect(result.jobs).toEqual(mockJobs);
      expect(result.total).toBe(1);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should filter jobs by job_type', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: mockJobs,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await jobsService.getAllJobs({ job_type: 'hourly' });

      expect(result.jobs).toEqual(mockJobs);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('j.job_type = $'),
        expect.arrayContaining(['active', 'hourly'])
      );
    });

    it('should filter jobs by location', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: mockJobs,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await jobsService.getAllJobs({
        location: 'San Francisco',
      });

      expect(result.jobs).toEqual(mockJobs);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(j.location) LIKE LOWER'),
        expect.arrayContaining(['active', '%San Francisco%'])
      );
    });

    it('should filter jobs by business_id', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: mockJobs,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await jobsService.getAllJobs({ business_id: 1 });

      expect(result.jobs).toEqual(mockJobs);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('j.business_id = $'),
        expect.arrayContaining(['active', 1])
      );
    });

    it('should handle pagination', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ total: '10' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: mockJobs,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await jobsService.getAllJobs({ limit: 5, offset: 10 });

      expect(result.total).toBe(10);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([5, 10])
      );
    });

    it('should handle custom order_by and order_direction', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: mockJobs,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await jobsService.getAllJobs({
        order_by: 'title',
        order_direction: 'ASC',
      });

      expect(result.jobs).toEqual(mockJobs);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY j.title ASC'),
        expect.any(Array)
      );
    });

    it('should validate and use default order_by for invalid values', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: mockJobs,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await jobsService.getAllJobs({
        order_by: 'invalid' as any,
        order_direction: 'ASC',
      });

      expect(result.jobs).toEqual(mockJobs);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY j.created_at ASC'),
        expect.any(Array)
      );
    });
  });

  describe('getJobsByBusiness', () => {
    it('should call getAllJobs with business_id filter', async () => {
      const getAllJobsSpy = jest.spyOn(jobsService, 'getAllJobs');
      getAllJobsSpy.mockResolvedValueOnce({
        jobs: [],
        total: 0,
      });

      await jobsService.getJobsByBusiness(1, { status: 'active' });

      expect(getAllJobsSpy).toHaveBeenCalledWith({
        business_id: 1,
        status: 'active',
      });

      getAllJobsSpy.mockRestore();
    });
  });

  describe('updateJobStatus', () => {
    const mockJob: Job = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      business_id: 1,
      title: 'Software Engineer',
      description: 'We are looking for a talented software engineer',
      location: 'San Francisco, CA',
      job_type: 'hourly',
      rate_from: 50,
      rate_to: 80,
      business_logo_url: null,
      status: 'paused',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should update job status successfully', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockJob],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      const result = await jobsService.updateJobStatus(jobId, 'paused');

      expect(result).toEqual(mockJob);
      expect(result?.status).toBe('paused');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE jobs'),
        ['paused', jobId]
      );
    });

    it('should return null when job not found', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      const result = await jobsService.updateJobStatus(jobId, 'closed');

      expect(result).toBeNull();
    });
  });

  describe('updateJob', () => {
    const mockJob: Job = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      business_id: 1,
      title: 'Senior Software Engineer',
      description: 'Updated description',
      location: 'San Francisco, CA',
      job_type: 'hourly',
      rate_from: 60,
      rate_to: 90,
      business_logo_url: null,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should update job successfully', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      const updateData = {
        title: 'Senior Software Engineer',
        description: 'Updated description',
        rate_from: 60,
        rate_to: 90,
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockJob],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      const result = await jobsService.updateJob(jobId, updateData);

      expect(result).toEqual(mockJob);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE jobs'),
        expect.arrayContaining([
          'Senior Software Engineer',
          'Updated description',
          60,
          90,
          jobId,
        ])
      );
    });

    it('should return null when no fields to update', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      const updateData = {};

      const result = await jobsService.updateJob(jobId, updateData);

      expect(result).toBeNull();
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should ignore invalid fields', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      const updateData = {
        title: 'Updated Title',
        invalidField: 'should be ignored',
      } as any;

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...mockJob, title: 'Updated Title' }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      const result = await jobsService.updateJob(jobId, updateData);

      expect(result?.title).toBe('Updated Title');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['Updated Title', jobId])
      );
      // Verify invalidField is not in the query
      const queryCall = (mockPool.query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).not.toContain('invalidField');
    });

    it('should ignore undefined values', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      const updateData = {
        title: 'Updated Title',
        description: undefined,
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...mockJob, title: 'Updated Title' }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      const result = await jobsService.updateJob(jobId, updateData);

      expect(result?.title).toBe('Updated Title');
      // Verify description is not in the query parameters
      const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
      expect(callArgs[1]).not.toContain(undefined);
    });
  });

  describe('deleteJob', () => {
    it('should delete job successfully', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'DELETE',
        oid: 0,
        fields: [],
      } as any);

      const result = await jobsService.deleteJob(jobId);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM jobs WHERE id = $1',
        [jobId]
      );
    });

    it('should return false when job not found', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'DELETE',
        oid: 0,
        fields: [],
      } as any);

      const result = await jobsService.deleteJob(jobId);

      expect(result).toBe(false);
    });
  });

  describe('checkJobOwnership', () => {
    it('should return true when user owns the business', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      const userId = 'user-123';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ '?column?': 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await jobsService.checkJobOwnership(jobId, userId);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT 1'),
        [jobId, userId]
      );
    });

    it('should return false when user does not own the business', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      const userId = 'user-123';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await jobsService.checkJobOwnership(jobId, userId);

      expect(result).toBe(false);
    });
  });

  describe('getJobStats', () => {
    it('should get job stats for all jobs', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            total: '10',
            active: '5',
            paused: '3',
            closed: '2',
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await jobsService.getJobStats();

      expect(result).toEqual({
        total: 10,
        active: 5,
        paused: 3,
        closed: 2,
      });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        []
      );
    });

    it('should get job stats for specific business', async () => {
      const businessId = 1;
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            total: '5',
            active: '3',
            paused: '1',
            closed: '1',
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await jobsService.getJobStats(businessId);

      expect(result).toEqual({
        total: 5,
        active: 3,
        paused: 1,
        closed: 1,
      });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE business_id = $1'),
        [businessId]
      );
    });
  });
});
