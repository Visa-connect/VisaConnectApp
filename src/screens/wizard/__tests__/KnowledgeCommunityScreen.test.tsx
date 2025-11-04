// TODO: Achieve 100% test coverage for wizard screens
// - Fix HeadlessUI Combobox interactions (job boards)
// - Add tests for all form interactions and edge cases
// - Ensure all user flows are covered

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import KnowledgeCommunityScreen from '../KnowledgeCommunityScreen';
import { useUserStore } from '../../../stores/userStore';
import * as api from '../../../api';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

jest.mock('../../../stores/userStore');
jest.mock('../../../api');
jest.mock('../../../components/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

const mockNavigate = jest.fn();
const mockUpdateUser = jest.fn();
const mockApiPatch = api.apiPatch as jest.MockedFunction<typeof api.apiPatch>;

describe('KnowledgeCommunityScreen', () => {
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    mentorship_interest: true,
    job_boards: ['LinkedIn', 'Indeed'],
    visa_advice: 'Start early with documentation',
  };

  const mockUseUserStore = {
    user: mockUser,
    updateUser: mockUpdateUser,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (require('react-router-dom').useNavigate as jest.Mock).mockReturnValue(
      mockNavigate
    );
    (useUserStore as unknown as jest.Mock).mockReturnValue(mockUseUserStore);
    mockApiPatch.mockResolvedValue({ success: true } as any);
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  describe('Rendering', () => {
    it('should render loading state when user is not available', () => {
      (useUserStore as unknown as jest.Mock).mockReturnValue({
        ...mockUseUserStore,
        user: null,
      });

      renderWithProviders(<KnowledgeCommunityScreen />);

      expect(screen.getByText(/loading your profile/i)).toBeInTheDocument();
    });

    it('should render form when user is available', () => {
      renderWithProviders(<KnowledgeCommunityScreen />);

      expect(screen.getByText(/knowledge & community/i)).toBeInTheDocument();
      expect(
        screen.getByText(/would you be open to mentoring someone/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/do you know any good online job boards/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/what advice would you give someone/i)
      ).toBeInTheDocument();
    });

    it('should pre-populate form with existing user data', async () => {
      renderWithProviders(<KnowledgeCommunityScreen />);

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/share your advice/i);
        expect(textarea).toHaveValue('Start early with documentation');
      });
    });

    it('should redirect to sign-in when user is not authenticated', () => {
      (useUserStore as unknown as jest.Mock).mockReturnValue({
        ...mockUseUserStore,
        user: null,
      });

      renderWithProviders(<KnowledgeCommunityScreen />);

      expect(mockNavigate).toHaveBeenCalledWith('/sign-in');
    });
  });

  describe('Form Interactions', () => {
    it('should toggle mentorship interest option', async () => {
      renderWithProviders(<KnowledgeCommunityScreen />);

      // Find all "No" buttons - the first one should be for mentorship
      const noButtons = screen.getAllByRole('button', { name: /^no$/i });
      const mentorshipNoButton = noButtons[0]; // First "No" button is for mentorship

      expect(mentorshipNoButton).toBeInTheDocument();
      fireEvent.click(mentorshipNoButton);

      await waitFor(() => {
        expect(mentorshipNoButton).toHaveClass(/bg-sky-400/);
      });
    });

    it('should update visa advice textarea', async () => {
      renderWithProviders(<KnowledgeCommunityScreen />);

      const textarea = screen.getByPlaceholderText(/share your advice/i);
      fireEvent.change(textarea, {
        target: { value: 'Network with others' },
      });

      await waitFor(() => {
        expect(textarea).toHaveValue('Network with others');
      });
    });

    // TODO: Fix HeadlessUI Combobox interaction for job boards
    // TODO: Properly mock HeadlessUI Combobox for testing multi-select functionality
    it.skip('should allow adding custom job boards via Enter key', async () => {
      renderWithProviders(<KnowledgeCommunityScreen />);

      const jobBoardsInput = screen.getByPlaceholderText(
        /enter job boards or agencies/i
      );

      fireEvent.change(jobBoardsInput, { target: { value: 'Glassdoor' } });
      fireEvent.keyDown(jobBoardsInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(jobBoardsInput).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form successfully and navigate to dashboard', async () => {
      renderWithProviders(<KnowledgeCommunityScreen />);

      const submitButton = screen.getByText(/save & continue/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiPatch).toHaveBeenCalledWith('/api/user/profile', {
          mentorship_interest: true,
          job_boards: ['LinkedIn', 'Indeed'],
          visa_advice: 'Start early with documentation',
        });
      });

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle API error on submission', async () => {
      const errorMessage = 'Failed to save knowledge & community info';
      mockApiPatch.mockRejectedValueOnce(new Error(errorMessage));

      renderWithProviders(<KnowledgeCommunityScreen />);

      const submitButton = screen.getByText(/save & continue/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      mockApiPatch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true }), 100)
          )
      );

      renderWithProviders(<KnowledgeCommunityScreen />);

      const submitButton = screen.getByText(/save & continue/i);
      fireEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
    });

    it('should handle unauthenticated user on submission', async () => {
      (useUserStore as unknown as jest.Mock).mockReturnValue({
        ...mockUseUserStore,
        user: null,
      });

      renderWithProviders(<KnowledgeCommunityScreen />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/sign-in');
      });
    });
  });

  describe('Skip functionality', () => {
    it('should navigate to dashboard when skip is clicked', () => {
      renderWithProviders(<KnowledgeCommunityScreen />);

      const skipButton = screen.getByText(/skip and finish later/i);
      fireEvent.click(skipButton);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Job boards selection', () => {
    it('should display selected job boards', () => {
      renderWithProviders(<KnowledgeCommunityScreen />);

      // The job boards should be displayed as tags/chips
      expect(screen.getByText('LinkedIn')).toBeInTheDocument();
      expect(screen.getByText('Indeed')).toBeInTheDocument();
    });
  });
});
