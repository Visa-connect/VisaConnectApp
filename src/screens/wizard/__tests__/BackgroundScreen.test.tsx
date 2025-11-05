import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BackgroundScreen from '../BackgroundScreen';
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
jest.mock('../../../components/AutoComplete', () => ({
  __esModule: true,
  default: ({ label, value, onChange, placeholder }: any) => (
    <div>
      {label && <label>{label}</label>}
      <input
        data-testid="autocomplete-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  ),
}));

const mockNavigate = jest.fn();
const mockUpdateUser = jest.fn();
const mockApiPatch = api.apiPatch as jest.MockedFunction<typeof api.apiPatch>;

describe('BackgroundScreen', () => {
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    nationality: 'American',
    languages: ['English', 'Spanish'],
    other_us_jobs: ['New York, NY'],
    relationship_status: 'single',
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

      renderWithProviders(<BackgroundScreen />);

      expect(screen.getByText(/loading your profile/i)).toBeInTheDocument();
    });

    it('should render form when user is available', () => {
      renderWithProviders(<BackgroundScreen />);

      expect(screen.getByText(/let's learn about you/i)).toBeInTheDocument();
      expect(screen.getByText(/what is your nationality/i)).toBeInTheDocument();
      expect(
        screen.getByText(/what languages do you speak/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/where else have you worked in the usa/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/what is your relationship status/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/do you plan to stay in the u.s/i)
      ).toBeInTheDocument();
    });

    it('should pre-populate form with existing user data', async () => {
      renderWithProviders(<BackgroundScreen />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('American')).toBeInTheDocument();
      });
    });

    it('should redirect to sign-in when user is not authenticated', () => {
      (useUserStore as unknown as jest.Mock).mockReturnValue({
        ...mockUseUserStore,
        user: null,
      });

      renderWithProviders(<BackgroundScreen />);

      expect(mockNavigate).toHaveBeenCalledWith('/sign-in');
    });
  });

  // TODO: Fix HeadlessUI Combobox and Listbox interactions
  // TODO: Properly mock HeadlessUI components for testing
  describe.skip('Form Interactions', () => {
    it('should update nationality field', async () => {
      renderWithProviders(<BackgroundScreen />);

      const nationalityInput = screen.getByPlaceholderText(
        /enter your nationality/i
      );
      fireEvent.change(nationalityInput, { target: { value: 'Italian' } });

      await waitFor(() => {
        expect(nationalityInput).toHaveValue('Italian');
      });
    });

    it('should update relationship status', async () => {
      renderWithProviders(<BackgroundScreen />);

      const relationshipButton = screen.getByText('Single');
      fireEvent.click(relationshipButton);

      await waitFor(() => {
        expect(relationshipButton).toBeInTheDocument();
      });
    });

    it('should toggle stay in US option', async () => {
      renderWithProviders(<BackgroundScreen />);

      const noButton = screen.getAllByText('No')[0];

      fireEvent.click(noButton);

      await waitFor(() => {
        expect(noButton).toHaveClass(/bg-sky-400/);
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form successfully and navigate to next screen', async () => {
      renderWithProviders(<BackgroundScreen />);

      const submitButton = screen.getByText(/save & continue/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiPatch).toHaveBeenCalledWith('/api/user/profile', {
          languages: ['English', 'Spanish'],
          other_us_jobs: ['New York, NY'],
          relationship_status: 'single',
          nationality: 'American',
          stay_in_us: true,
        });
      });

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/lifestyle');
      });
    });

    it('should handle API error on submission', async () => {
      const errorMessage = 'Failed to save background info';
      mockApiPatch.mockRejectedValueOnce(new Error(errorMessage));

      renderWithProviders(<BackgroundScreen />);

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

      renderWithProviders(<BackgroundScreen />);

      const submitButton = screen.getByText(/save & continue/i);
      fireEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
    });

    it('should handle unauthenticated user on submission', async () => {
      (useUserStore as unknown as jest.Mock).mockReturnValue({
        ...mockUseUserStore,
        user: null,
      });

      renderWithProviders(<BackgroundScreen />);

      // Wait for redirect
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/sign-in');
      });
    });
  });

  describe('Skip functionality', () => {
    it('should navigate to dashboard when skip is clicked', () => {
      renderWithProviders(<BackgroundScreen />);

      const skipButton = screen.getByText(/skip and finish later/i);
      fireEvent.click(skipButton);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  // TODO: Fix HeadlessUI Combobox interaction for language selection
  // TODO: Properly mock HeadlessUI Combobox for testing multi-select functionality
  describe.skip('Language selection', () => {
    it('should allow adding languages', async () => {
      renderWithProviders(<BackgroundScreen />);

      const languageInput = screen.getByPlaceholderText(
        /enter languages you speak/i
      );
      fireEvent.change(languageInput, { target: { value: 'French' } });

      // The language selection is complex with HeadlessUI Combobox
      // In a real test, you'd need to interact with the dropdown options
      await waitFor(() => {
        expect(languageInput).toBeInTheDocument();
      });
    });
  });
});
