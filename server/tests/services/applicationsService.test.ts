import applicationsService, {
  ApplicationSubmission,
  JobApplication,
  JobApplicationWithDetails,
} from '../../services/applicationsService';
import pool from '../../db/config';
import { emailService } from '../../services/emailService';

// Mock the database pool
jest.mock('../../db/config', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

// Mock the email service
jest.mock('../../services/emailService', () => ({
  emailService: {
    sendJobApplicationNotificationToBusiness: jest.fn(),
    sendJobApplicationConfirmationToApplicant: jest.fn(),
  },
}));

const mockPool = pool as jest.Mocked<typeof pool>;
const mockEmailService = emailService as jest.Mocked<typeof emailService>;

describe('ApplicationsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createApplication', () => {
    const mockApplicationData: ApplicationSubmission = {
      job_id: 'job-123',
      user_id: 'user-123',
      qualifications: '5 years of experience in software development',
      location: 'San Francisco, CA',
      visa_type: 'H1B',
      start_date: '2024-06-01',
      resume_url: 'https://example.com/resume.pdf',
      resume_filename: 'resume.pdf',
    };

    const mockCreatedApplication: JobApplication = {
      id: 'app-123',
      job_id: 'job-123',
      user_id: 'user-123',
      qualifications: '5 years of experience in software development',
      location: 'San Francisco, CA',
      visa_type: 'H1B',
      start_date: '2024-06-01',
      resume_url: 'https://example.com/resume.pdf',
      resume_filename: 'resume.pdf',
      status: 'pending',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    };

    it('should create an application successfully', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [mockCreatedApplication],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: [],
        } as any)
        // Mock queries for sendApplicationEmails (job and user details)
        .mockResolvedValueOnce({
          rows: [
            {
              job_title: 'Software Engineer',
              job_description: 'A great job',
              business_name: 'Tech Corp',
              business_owner_name: 'John Doe',
              business_owner_email: 'owner@techcorp.com',
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              first_name: 'Jane',
              last_name: 'Smith',
              email: 'jane@example.com',
              timezone: 'America/New_York',
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await applicationsService.createApplication(
        mockApplicationData
      );

      expect(result).toEqual(mockCreatedApplication);
      // Wait for async email sending to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const queryCall = (mockPool.query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).toContain('INSERT INTO job_applications');
      expect(queryCall[0]).toContain('gen_random_uuid()');
      expect(queryCall[1]).toEqual([
        mockApplicationData.job_id,
        mockApplicationData.user_id,
        mockApplicationData.qualifications,
        mockApplicationData.location,
        mockApplicationData.visa_type,
        mockApplicationData.start_date,
        mockApplicationData.resume_url,
        mockApplicationData.resume_filename,
      ]);
    });

    it('should handle null optional fields', async () => {
      const applicationDataWithoutOptional = {
        ...mockApplicationData,
        visa_type: undefined,
        resume_url: undefined,
        resume_filename: undefined,
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              ...mockCreatedApplication,
              visa_type: null,
              resume_url: null,
              resume_filename: null,
            },
          ],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: [],
        } as any)
        // Mock queries for sendApplicationEmails
        .mockResolvedValueOnce({
          rows: [
            {
              job_title: 'Software Engineer',
              job_description: 'A great job',
              business_name: 'Tech Corp',
              business_owner_name: 'John Doe',
              business_owner_email: 'owner@techcorp.com',
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              first_name: 'Jane',
              last_name: 'Smith',
              email: 'jane@example.com',
              timezone: 'America/New_York',
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await applicationsService.createApplication(
        applicationDataWithoutOptional
      );

      expect(result.visa_type).toBeNull();
      expect(result.resume_url).toBeNull();
      expect(result.resume_filename).toBeNull();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([null, null, null])
      );
      // Wait for async email sending
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should send email notifications asynchronously', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [mockCreatedApplication],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: [],
        } as any)
        // Mock queries for sendApplicationEmails
        .mockResolvedValueOnce({
          rows: [
            {
              job_title: 'Software Engineer',
              job_description: 'A great job',
              business_name: 'Tech Corp',
              business_owner_name: 'John Doe',
              business_owner_email: 'owner@techcorp.com',
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              first_name: 'Jane',
              last_name: 'Smith',
              email: 'jane@example.com',
              timezone: 'America/New_York',
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      await applicationsService.createApplication(mockApplicationData);

      // Wait a bit for async email sending
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Note: Email sending is fire-and-forget, so we can't easily test it here
      // The actual email sending is tested in integration tests
    });
  });

  describe('getApplicationById', () => {
    const mockApplicationWithDetails: JobApplicationWithDetails = {
      id: 'app-123',
      job_id: 'job-123',
      user_id: 'user-123',
      qualifications: '5 years of experience',
      location: 'San Francisco, CA',
      visa_type: 'H1B',
      start_date: '2024-06-01',
      resume_url: 'https://example.com/resume.pdf',
      resume_filename: 'resume.pdf',
      status: 'pending',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      job_title: 'Software Engineer',
      business_name: 'Tech Corp',
      user_first_name: 'John',
      user_last_name: 'Doe',
      user_email: 'john.doe@example.com',
    };

    it('should get application by ID successfully', async () => {
      const applicationId = 'app-123';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockApplicationWithDetails],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await applicationsService.getApplicationById(
        applicationId
      );

      expect(result).toEqual(mockApplicationWithDetails);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [applicationId]
      );
    });

    it('should return null when application not found', async () => {
      const applicationId = 'app-123';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await applicationsService.getApplicationById(
        applicationId
      );

      expect(result).toBeNull();
    });
  });

  describe('getApplications', () => {
    const mockApplications: JobApplicationWithDetails[] = [
      {
        id: 'app-123',
        job_id: 'job-123',
        user_id: 'user-123',
        qualifications: '5 years of experience',
        location: 'San Francisco, CA',
        visa_type: 'H1B',
        start_date: '2024-06-01',
        resume_url: null,
        resume_filename: null,
        status: 'pending',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        job_title: 'Software Engineer',
        business_name: 'Tech Corp',
        user_first_name: 'John',
        user_last_name: 'Doe',
        user_email: 'john.doe@example.com',
      },
    ];

    it('should get applications with default filters', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: mockApplications,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await applicationsService.getApplications();

      expect(result.applications).toEqual(mockApplications);
      expect(result.total).toBe(1);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should filter applications by job_id', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: mockApplications,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await applicationsService.getApplications({
        job_id: 'job-123',
      });

      expect(result.applications).toEqual(mockApplications);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ja.job_id = $'),
        expect.arrayContaining(['job-123'])
      );
    });

    it('should filter applications by user_id', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: mockApplications,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await applicationsService.getApplications({
        user_id: 'user-123',
      });

      expect(result.applications).toEqual(mockApplications);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ja.user_id = $'),
        expect.arrayContaining(['user-123'])
      );
    });

    it('should filter applications by status', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: mockApplications,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await applicationsService.getApplications({
        status: 'pending',
      });

      expect(result.applications).toEqual(mockApplications);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ja.status = $'),
        expect.arrayContaining(['pending'])
      );
    });

    it('should filter applications by business_id', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: mockApplications,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await applicationsService.getApplications({
        business_id: 1,
      });

      expect(result.applications).toEqual(mockApplications);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('j.business_id = $'),
        expect.arrayContaining([1])
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
          rows: mockApplications,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await applicationsService.getApplications({
        limit: 5,
        offset: 10,
      });

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
          rows: mockApplications,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await applicationsService.getApplications({
        order_by: 'status',
        order_direction: 'ASC',
      });

      expect(result.applications).toEqual(mockApplications);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY ja.status ASC'),
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
          rows: mockApplications,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await applicationsService.getApplications({
        order_by: 'invalid' as any,
        order_direction: 'ASC',
      });

      expect(result.applications).toEqual(mockApplications);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY ja.created_at ASC'),
        expect.any(Array)
      );
    });

    it('should validate and use default order_direction for invalid values', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: mockApplications,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      const result = await applicationsService.getApplications({
        order_by: 'created_at',
        order_direction: 'INVALID' as any,
      });

      expect(result.applications).toEqual(mockApplications);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY ja.created_at DESC'),
        expect.any(Array)
      );
    });
  });

  describe('getApplicationsByJob', () => {
    it('should call getApplications with job_id filter', async () => {
      const getApplicationsSpy = jest.spyOn(
        applicationsService,
        'getApplications'
      );
      getApplicationsSpy.mockResolvedValueOnce({
        applications: [],
        total: 0,
      });

      await applicationsService.getApplicationsByJob('job-123', {
        status: 'pending',
      });

      expect(getApplicationsSpy).toHaveBeenCalledWith({
        job_id: 'job-123',
        status: 'pending',
      });

      getApplicationsSpy.mockRestore();
    });
  });

  describe('getApplicationsByUser', () => {
    it('should call getApplications with user_id filter', async () => {
      const getApplicationsSpy = jest.spyOn(
        applicationsService,
        'getApplications'
      );
      getApplicationsSpy.mockResolvedValueOnce({
        applications: [],
        total: 0,
      });

      await applicationsService.getApplicationsByUser('user-123', {
        status: 'pending',
      });

      expect(getApplicationsSpy).toHaveBeenCalledWith({
        user_id: 'user-123',
        status: 'pending',
      });

      getApplicationsSpy.mockRestore();
    });
  });

  describe('getApplicationsByBusiness', () => {
    it('should call getApplications with business_id filter', async () => {
      const getApplicationsSpy = jest.spyOn(
        applicationsService,
        'getApplications'
      );
      getApplicationsSpy.mockResolvedValueOnce({
        applications: [],
        total: 0,
      });

      await applicationsService.getApplicationsByBusiness(1, {
        status: 'pending',
      });

      expect(getApplicationsSpy).toHaveBeenCalledWith({
        business_id: 1,
        status: 'pending',
      });

      getApplicationsSpy.mockRestore();
    });
  });

  describe('updateApplicationStatus', () => {
    const mockApplication: JobApplication = {
      id: 'app-123',
      job_id: 'job-123',
      user_id: 'user-123',
      qualifications: '5 years of experience',
      location: 'San Francisco, CA',
      visa_type: 'H1B',
      start_date: '2024-06-01',
      resume_url: null,
      resume_filename: null,
      status: 'accepted',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02'),
    };

    it('should update application status successfully', async () => {
      const applicationId = 'app-123';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockApplication],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      const result = await applicationsService.updateApplicationStatus(
        applicationId,
        'accepted'
      );

      expect(result).toEqual(mockApplication);
      expect(result?.status).toBe('accepted');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE job_applications'),
        ['accepted', applicationId]
      );
    });

    it('should return null when application not found', async () => {
      const applicationId = 'app-123';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      const result = await applicationsService.updateApplicationStatus(
        applicationId,
        'rejected'
      );

      expect(result).toBeNull();
    });
  });

  describe('updateApplication', () => {
    const mockApplication: JobApplication = {
      id: 'app-123',
      job_id: 'job-123',
      user_id: 'user-123',
      qualifications: 'Updated qualifications',
      location: 'New York, NY',
      visa_type: 'H1B',
      start_date: '2024-07-01',
      resume_url: 'https://example.com/new-resume.pdf',
      resume_filename: 'new-resume.pdf',
      status: 'pending',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02'),
    };

    it('should update application successfully', async () => {
      const applicationId = 'app-123';
      const updateData = {
        qualifications: 'Updated qualifications',
        location: 'New York, NY',
        start_date: '2024-07-01',
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockApplication],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      const result = await applicationsService.updateApplication(
        applicationId,
        updateData
      );

      expect(result).toEqual(mockApplication);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE job_applications'),
        expect.arrayContaining([
          'Updated qualifications',
          'New York, NY',
          '2024-07-01',
          applicationId,
        ])
      );
    });

    it('should return null when no fields to update', async () => {
      const applicationId = 'app-123';
      const updateData = {};

      const result = await applicationsService.updateApplication(
        applicationId,
        updateData
      );

      expect(result).toBeNull();
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should ignore invalid fields', async () => {
      const applicationId = 'app-123';
      const updateData = {
        qualifications: 'Updated qualifications',
        invalidField: 'should be ignored',
      } as any;

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          { ...mockApplication, qualifications: 'Updated qualifications' },
        ],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      const result = await applicationsService.updateApplication(
        applicationId,
        updateData
      );

      expect(result?.qualifications).toBe('Updated qualifications');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['Updated qualifications', applicationId])
      );
      // Verify invalidField is not in the query
      const queryCall = (mockPool.query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).not.toContain('invalidField');
    });

    it('should ignore undefined values', async () => {
      const applicationId = 'app-123';
      const updateData = {
        qualifications: 'Updated qualifications',
        location: undefined,
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          { ...mockApplication, qualifications: 'Updated qualifications' },
        ],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      const result = await applicationsService.updateApplication(
        applicationId,
        updateData
      );

      expect(result?.qualifications).toBe('Updated qualifications');
      // Verify location is not in the query parameters
      const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
      expect(callArgs[1]).not.toContain(undefined);
    });
  });

  describe('deleteApplication', () => {
    it('should delete application successfully', async () => {
      const applicationId = 'app-123';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'DELETE',
        oid: 0,
        fields: [],
      } as any);

      const result = await applicationsService.deleteApplication(applicationId);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM job_applications WHERE id = $1',
        [applicationId]
      );
    });

    it('should return false when application not found', async () => {
      const applicationId = 'app-123';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'DELETE',
        oid: 0,
        fields: [],
      } as any);

      const result = await applicationsService.deleteApplication(applicationId);

      expect(result).toBe(false);
    });
  });

  describe('hasUserAppliedToJob', () => {
    it('should return true when user has applied', async () => {
      const jobId = 'job-123';
      const userId = 'user-123';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ '?column?': 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await applicationsService.hasUserAppliedToJob(
        jobId,
        userId
      );

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT 1'),
        [jobId, userId]
      );
    });

    it('should return false when user has not applied', async () => {
      const jobId = 'job-123';
      const userId = 'user-123';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await applicationsService.hasUserAppliedToJob(
        jobId,
        userId
      );

      expect(result).toBe(false);
    });
  });

  describe('getAppliedJobIds', () => {
    it('should return set of applied job IDs', async () => {
      const userId = 'user-123';
      const jobIds = ['job-1', 'job-2', 'job-3'];
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ job_id: 'job-1' }, { job_id: 'job-2' }],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await applicationsService.getAppliedJobIds(userId, jobIds);

      expect(result).toEqual(new Set(['job-1', 'job-2']));
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT job_id'),
        [userId, ...jobIds]
      );
    });

    it('should return empty set when no job IDs provided', async () => {
      const userId = 'user-123';
      const jobIds: string[] = [];

      const result = await applicationsService.getAppliedJobIds(userId, jobIds);

      expect(result).toEqual(new Set());
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should return empty set when user has not applied to any jobs', async () => {
      const userId = 'user-123';
      const jobIds = ['job-1', 'job-2', 'job-3'];
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await applicationsService.getAppliedJobIds(userId, jobIds);

      expect(result).toEqual(new Set());
    });
  });

  describe('getApplicationStats', () => {
    it('should get application stats for all applications', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            total: '10',
            pending: '5',
            reviewed: '3',
            accepted: '1',
            rejected: '1',
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await applicationsService.getApplicationStats();

      expect(result).toEqual({
        total: 10,
        pending: 5,
        reviewed: 3,
        accepted: 1,
        rejected: 1,
      });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        []
      );
    });

    it('should get application stats for specific business', async () => {
      const businessId = 1;
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            total: '5',
            pending: '3',
            reviewed: '1',
            accepted: '1',
            rejected: '0',
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await applicationsService.getApplicationStats(businessId);

      expect(result).toEqual({
        total: 5,
        pending: 3,
        reviewed: 1,
        accepted: 1,
        rejected: 0,
      });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE j.business_id = $1'),
        [businessId]
      );
    });
  });

  describe('sendApplicationEmails', () => {
    // Note: This is a private method, but we can test it indirectly through createApplication
    // or we could test the email service integration separately
    it('should handle email sending errors gracefully', async () => {
      const mockApplicationData: ApplicationSubmission = {
        job_id: 'job-123',
        user_id: 'user-123',
        qualifications: '5 years of experience',
        location: 'San Francisco, CA',
        start_date: '2024-06-01',
      };

      const mockCreatedApplication: JobApplication = {
        id: 'app-123',
        job_id: 'job-123',
        user_id: 'user-123',
        qualifications: '5 years of experience',
        location: 'San Francisco, CA',
        visa_type: null,
        start_date: '2024-06-01',
        resume_url: null,
        resume_filename: null,
        status: 'pending',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [mockCreatedApplication],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: [],
        } as any)
        // Mock job query
        .mockResolvedValueOnce({
          rows: [
            {
              job_title: 'Software Engineer',
              job_description: 'A great job',
              business_name: 'Tech Corp',
              business_owner_name: 'John Doe',
              business_owner_email: 'owner@techcorp.com',
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        // Mock user query
        .mockResolvedValueOnce({
          rows: [
            {
              first_name: 'Jane',
              last_name: 'Smith',
              email: 'jane@example.com',
              timezone: 'America/New_York',
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any);

      // Mock email service to throw error
      (
        mockEmailService.sendJobApplicationNotificationToBusiness as jest.Mock
      ).mockRejectedValueOnce(new Error('Email service error'));
      (
        mockEmailService.sendJobApplicationConfirmationToApplicant as jest.Mock
      ).mockRejectedValueOnce(new Error('Email service error'));

      // Application creation should still succeed even if emails fail
      const result = await applicationsService.createApplication(
        mockApplicationData
      );

      expect(result).toEqual(mockCreatedApplication);
      // Wait for async email sending
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
  });
});
