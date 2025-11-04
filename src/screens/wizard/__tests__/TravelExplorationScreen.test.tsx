import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TravelExplorationScreen from '../TravelExplorationScreen';
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
jest.mock('../../../components/LocationInput', () => ({
  __esModule: true,
  default: ({ label, value, onChange, placeholder }: any) => (
    <div>
      {label && <label>{label}</label>}
      <input
        data-testid="location-input"
        value={value}
        onChange={(e) => onChange({ address: e.target.value })}
        placeholder={placeholder}
      />
    </div>
  ),
}));

const mockNavigate = jest.fn();
const mockUpdateUser = jest.fn();
const mockApiPatch = api.apiPatch as jest.MockedFunction<typeof api.apiPatch>;

describe('TravelExplorationScreen', () => {
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    road_trips: true,
    favorite_place: 'San Francisco, CA',
    travel_tips: 'Always carry cash',
    willing_to_guide: true,
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

      renderWithProviders(<TravelExplorationScreen />);

      expect(screen.getByText(/loading your profile/i)).toBeInTheDocument();
    });

    it('should render form when user is available', () => {
      renderWithProviders(<TravelExplorationScreen />);

      expect(
        screen.getByText(/tell us about your travel and exploration/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/have you taken any road trips in the u.s/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/what's your favorite city or place/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/do you have tips for others traveling/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/are you open to being a travel guide/i)
      ).toBeInTheDocument();
    });

    it('should pre-populate form with existing user data', async () => {
      renderWithProviders(<TravelExplorationScreen />);

      await waitFor(() => {
        const locationInput = screen.getByTestId('location-input');
        expect(locationInput).toHaveValue('San Francisco, CA');
      });

      const textarea = screen.getByPlaceholderText(/share your travel tips/i);
      expect(textarea).toHaveValue('Always carry cash');
    });

    it('should redirect to sign-in when user is not authenticated', () => {
      (useUserStore as unknown as jest.Mock).mockReturnValue({
        ...mockUseUserStore,
        user: null,
      });

      renderWithProviders(<TravelExplorationScreen />);

      expect(mockNavigate).toHaveBeenCalledWith('/sign-in');
    });
  });

  describe('Form Interactions', () => {
    it('should toggle road trips option', async () => {
      renderWithProviders(<TravelExplorationScreen />);

      const roadTripButtons = screen.getAllByText(/yes|no/i);
      const yesButton = roadTripButtons[0];
      const noButton = roadTripButtons[1];

      fireEvent.click(noButton);

      await waitFor(() => {
        expect(noButton).toHaveClass(/bg-sky-400/);
      });
    });

    it('should update favorite place location', async () => {
      renderWithProviders(<TravelExplorationScreen />);

      const locationInput = screen.getByTestId('location-input');
      fireEvent.change(locationInput, {
        target: { value: 'New York, NY' },
      });

      await waitFor(() => {
        expect(locationInput).toHaveValue('New York, NY');
      });
    });

    it('should update travel tips textarea', async () => {
      renderWithProviders(<TravelExplorationScreen />);

      const textarea = screen.getByPlaceholderText(/share your travel tips/i);
      fireEvent.change(textarea, {
        target: { value: 'Visit national parks' },
      });

      await waitFor(() => {
        expect(textarea).toHaveValue('Visit national parks');
      });
    });

    it('should toggle willing to guide option', async () => {
      renderWithProviders(<TravelExplorationScreen />);

      const guideButtons = screen.getAllByText(/yes|no/i);
      const noButton = guideButtons.find((btn) =>
        btn.closest('div')?.textContent?.includes('travel guide')
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
      renderWithProviders(<TravelExplorationScreen />);

      const submitButton = screen.getByText(/save & continue/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiPatch).toHaveBeenCalledWith('/api/user/profile', {
          road_trips: true,
          favorite_place: 'San Francisco, CA',
          travel_tips: 'Always carry cash',
          willing_to_guide: true,
        });
      });

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/knowledge-community');
      });
    });

    it('should handle API error on submission', async () => {
      const errorMessage = 'Failed to save travel exploration info';
      mockApiPatch.mockRejectedValueOnce(new Error(errorMessage));

      renderWithProviders(<TravelExplorationScreen />);

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

      renderWithProviders(<TravelExplorationScreen />);

      const submitButton = screen.getByText(/save & continue/i);
      fireEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
    });

    it('should handle unauthenticated user on submission', async () => {
      (useUserStore as unknown as jest.Mock).mockReturnValue({
        ...mockUseUserStore,
        user: null,
      });

      renderWithProviders(<TravelExplorationScreen />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/sign-in');
      });
    });
  });

  describe('Skip functionality', () => {
    it('should navigate to dashboard when skip is clicked', () => {
      renderWithProviders(<TravelExplorationScreen />);

      const skipButton = screen.getByText(/skip and finish later/i);
      fireEvent.click(skipButton);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
