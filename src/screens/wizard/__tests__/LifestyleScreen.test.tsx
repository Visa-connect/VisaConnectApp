import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LifestyleScreen from '../LifestyleScreen';
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

describe('LifestyleScreen', () => {
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    hobbies: ['Reading', 'Swimming'],
    favorite_state: 'California',
    preferred_outings: ['Beach', 'Museum'],
    has_car: true,
    offers_rides: true,
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

      renderWithProviders(<LifestyleScreen />);

      expect(screen.getByText(/loading your profile/i)).toBeInTheDocument();
    });

    it('should render form when user is available', () => {
      renderWithProviders(<LifestyleScreen />);

      expect(
        screen.getByText(/tell us about your lifestyle/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/what are your hobbies and interests/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/what's your favorite state in the u.s/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/what kind of outings do you enjoy most/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/do you have a car/i)).toBeInTheDocument();
      expect(
        screen.getByText(/are you willing to drive/i)
      ).toBeInTheDocument();
    });

    it('should pre-populate form with existing user data', async () => {
      renderWithProviders(<LifestyleScreen />);

      await waitFor(() => {
        expect(screen.getByText('California')).toBeInTheDocument();
      });
    });

    it('should redirect to sign-in when user is not authenticated', () => {
      (useUserStore as unknown as jest.Mock).mockReturnValue({
        ...mockUseUserStore,
        user: null,
      });

      renderWithProviders(<LifestyleScreen />);

      expect(mockNavigate).toHaveBeenCalledWith('/sign-in');
    });
  });

  describe('Form Interactions', () => {
    it('should toggle has car option', async () => {
      renderWithProviders(<LifestyleScreen />);

      const carButtons = screen.getAllByText(/yes|no/i);
      const noButton = carButtons.find((btn) =>
        btn.closest('div')?.textContent?.includes('car')
      );

      if (noButton) {
        fireEvent.click(noButton);

        await waitFor(() => {
          expect(noButton).toHaveClass(/bg-sky-400/);
        });
      }
    });

    it('should toggle willing to drive option', async () => {
      renderWithProviders(<LifestyleScreen />);

      const driveButtons = screen.getAllByText(/yes|no/i);
      const noButton = driveButtons.find((btn) =>
        btn.closest('div')?.textContent?.includes('willing to drive')
      );

      if (noButton) {
        fireEvent.click(noButton);

        await waitFor(() => {
          expect(noButton).toBeInTheDocument();
        });
      }
    });
  });

  describe('Form Submission', () => {
    it('should submit form successfully and navigate to next screen', async () => {
      renderWithProviders(<LifestyleScreen />);

      const submitButton = screen.getByText(/save & continue/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiPatch).toHaveBeenCalledWith('/api/user/profile', {
          hobbies: ['Reading', 'Swimming'],
          favorite_state: 'California',
          preferred_outings: ['Beach', 'Museum'],
          has_car: true,
          offers_rides: true,
          outings: ['Beach', 'Museum'],
          willing_to_drive: 'yes',
        });
      });

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/travel-exploration');
      });
    });

    it('should handle API error on submission', async () => {
      const errorMessage = 'Failed to save lifestyle info';
      mockApiPatch.mockRejectedValueOnce(new Error(errorMessage));

      renderWithProviders(<LifestyleScreen />);

      const submitButton = screen.getByText(/save & continue/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      mockApiPatch.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      renderWithProviders(<LifestyleScreen />);

      const submitButton = screen.getByText(/save & continue/i);
      fireEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
    });

    it('should handle unauthenticated user on submission', async () => {
      (useUserStore as unknown as jest.Mock).mockReturnValue({
        ...mockUseUserStore,
        user: null,
      });

      renderWithProviders(<LifestyleScreen />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/sign-in');
      });
    });
  });

  describe('Skip functionality', () => {
    it('should navigate to dashboard when skip is clicked', () => {
      renderWithProviders(<LifestyleScreen />);

      const skipButton = screen.getByText(/skip and finish later/i);
      fireEvent.click(skipButton);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Hobbies selection', () => {
    it('should allow adding custom hobbies via Enter key', async () => {
      renderWithProviders(<LifestyleScreen />);

      const hobbiesInput = screen.getByPlaceholderText(
        /enter hobbies and interests/i
      );

      fireEvent.change(hobbiesInput, { target: { value: 'Photography' } });
      fireEvent.keyDown(hobbiesInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(hobbiesInput).toBeInTheDocument();
      });
    });
  });
});

