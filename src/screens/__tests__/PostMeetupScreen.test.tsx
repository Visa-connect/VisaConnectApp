import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PostMeetupScreen from '../PostMeetupScreen';
import * as meetupServiceModule from '../../api/meetupService';
import * as firebaseStorageModule from '../../api/firebaseStorage';

// Mock dependencies
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock meetupService module
jest.mock('../../api/meetupService', () => ({
  meetupService: {
    getCategories: jest.fn(),
    createMeetup: jest.fn(),
  },
}));

// Mock firebaseStorage module
jest.mock('../../api/firebaseStorage', () => ({
  uploadMeetupPhoto: jest.fn(),
  deleteMeetupPhoto: jest.fn(),
}));

jest.mock('../../components/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, disabled, variant, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid="button"
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  ),
}));
jest.mock('../../components/LocationInput', () => ({
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

describe('PostMeetupScreen', () => {
  // Get mock functions from mocked modules
  const mockGetCategories = meetupServiceModule.meetupService
    .getCategories as jest.Mock;
  const mockCreateMeetup = meetupServiceModule.meetupService
    .createMeetup as jest.Mock;
  const mockUploadMeetupPhoto =
    firebaseStorageModule.uploadMeetupPhoto as jest.Mock;
  const mockDeleteMeetupPhoto =
    firebaseStorageModule.deleteMeetupPhoto as jest.Mock;

  const mockCategories = [
    { id: 1, name: 'Social Gathering' },
    { id: 2, name: 'Networking' },
    { id: 3, name: 'Workshop' },
  ];

  const mockMeetupId = 'test-meetup-id-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();

    // Default mock return values
    mockGetCategories.mockResolvedValue(mockCategories);
    mockCreateMeetup.mockResolvedValue(mockMeetupId);
    mockUploadMeetupPhoto.mockResolvedValue({
      success: true,
      url: 'https://example.com/photo.jpg',
      fileName: 'meetups/photo-123.jpg',
    });
    mockDeleteMeetupPhoto.mockResolvedValue({ success: true });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  const fillFormFields = async () => {
    // Fill in category
    const categoryButton = screen.getByText('Select a category');
    fireEvent.click(categoryButton);

    await waitFor(() => {
      expect(screen.getByText('Social Gathering')).toBeInTheDocument();
    });

    const socialGatheringOption = screen.getByText('Social Gathering');
    fireEvent.click(socialGatheringOption);

    // Fill in title
    const titleInput = screen.getByPlaceholderText('Enter meetup title');
    fireEvent.change(titleInput, { target: { value: 'Test Meetup' } });

    // Fill in date and time
    const dateTimeInput = screen.getByLabelText('Date and time');
    fireEvent.change(dateTimeInput, {
      target: { value: '2024-12-31T18:00' },
    });

    // Fill in location
    const locationInput = screen.getByTestId('location-input');
    fireEvent.change(locationInput, {
      target: { value: 'San Francisco, CA' },
    });

    // Fill in description
    const descriptionInput = screen.getByPlaceholderText(
      'Enter meetup description'
    );
    fireEvent.change(descriptionInput, {
      target: { value: 'This is a test meetup description' },
    });
  };

  describe('Component Rendering', () => {
    it('should render the form with all fields', async () => {
      renderWithProviders(<PostMeetupScreen />);

      await waitFor(() => {
        expect(screen.getByText('Post a Meetup')).toBeInTheDocument();
      });

      expect(screen.getByText('Choose Category')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Date and time')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(
        screen.getByText('Description (be as detailed as possible)')
      ).toBeInTheDocument();
    });

    it('should load categories on mount', async () => {
      renderWithProviders(<PostMeetupScreen />);

      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalledTimes(1);
      });
    });

    it('should display error when categories fail to load', async () => {
      mockGetCategories.mockRejectedValueOnce(new Error('Failed to load'));

      renderWithProviders(<PostMeetupScreen />);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load categories. Please try again.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit meetup with all required fields successfully', async () => {
      renderWithProviders(<PostMeetupScreen />);

      // Wait for categories to load
      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalled();
      });

      await fillFormFields();

      // Submit form
      const postButton = screen.getByText('Post');
      fireEvent.click(postButton);

      // Wait for submission to complete
      await waitFor(() => {
        expect(mockCreateMeetup).toHaveBeenCalledTimes(1);
      });

      // Verify the data sent to the API
      expect(mockCreateMeetup).toHaveBeenCalledWith({
        category_id: 1,
        title: 'Test Meetup',
        description: 'This is a test meetup description',
        location: 'San Francisco, CA',
        meetup_date: '2024-12-31T18:00',
        max_participants: null,
        photo_url: null,
        photo_public_id: null,
      });

      // Verify navigation after successful submission
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/meetups');
      });
    });

    it('should submit meetup with photo successfully', async () => {
      const { container } = renderWithProviders(<PostMeetupScreen />);

      // Wait for categories to load
      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalled();
      });

      // Upload a photo first
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const fileInput = container.querySelector(
        'input[type="file"][id="image-upload"]'
      ) as HTMLInputElement;

      expect(fileInput).toBeInTheDocument();

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
        configurable: true,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockUploadMeetupPhoto).toHaveBeenCalledWith(file);
      });

      // Wait for photo to be set in state
      await waitFor(() => {
        expect(screen.getByText('Photo selected')).toBeInTheDocument();
      });

      await fillFormFields();

      // Submit form
      const postButton = screen.getByText('Post');
      fireEvent.click(postButton);

      // Wait for submission to complete
      await waitFor(() => {
        expect(mockCreateMeetup).toHaveBeenCalledTimes(1);
      });

      // Verify the data sent to the API includes photo information
      expect(mockCreateMeetup).toHaveBeenCalledWith({
        category_id: 1,
        title: 'Test Meetup',
        description: 'This is a test meetup description',
        location: 'San Francisco, CA',
        meetup_date: '2024-12-31T18:00',
        max_participants: null,
        photo_url: 'https://example.com/photo.jpg',
        photo_public_id: 'meetups/photo-123.jpg',
      });

      // Verify navigation after successful submission
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/meetups');
      });
    });

    it('should show error when required fields are missing', async () => {
      renderWithProviders(<PostMeetupScreen />);

      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalled();
      });

      // Try to submit without filling fields
      const postButton = screen.getByText('Post');
      fireEvent.click(postButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please fill in all required fields')
        ).toBeInTheDocument();
      });

      // Verify API was not called
      expect(mockCreateMeetup).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should handle API error on submission', async () => {
      const errorMessage = 'Failed to create meetup';
      mockCreateMeetup.mockRejectedValueOnce(new Error(errorMessage));

      renderWithProviders(<PostMeetupScreen />);

      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalled();
      });

      await fillFormFields();

      // Submit form
      const postButton = screen.getByText('Post');
      fireEvent.click(postButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(
          screen.getByText('Failed to create meetup. Please try again.')
        ).toBeInTheDocument();
      });

      // Verify navigation did not happen
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should disable submit button while loading', async () => {
      // Make createMeetup take some time
      mockCreateMeetup.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockMeetupId), 100))
      );

      renderWithProviders(<PostMeetupScreen />);

      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalled();
      });

      await fillFormFields();

      // Submit form
      const postButton = screen.getByText('Post');
      fireEvent.click(postButton);

      // Check that button shows loading state
      await waitFor(() => {
        expect(screen.getByText('Posting...')).toBeInTheDocument();
      });

      // Verify button is disabled
      const buttons = screen.getAllByTestId('button');
      const submitButton = buttons.find((btn) =>
        btn.textContent?.includes('Posting')
      );
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Photo Upload', () => {
    it('should upload photo successfully', async () => {
      const { container } = renderWithProviders(<PostMeetupScreen />);

      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalled();
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const fileInput = container.querySelector(
        'input[type="file"][id="image-upload"]'
      ) as HTMLInputElement;

      expect(fileInput).toBeInTheDocument();

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
        configurable: true,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockUploadMeetupPhoto).toHaveBeenCalledWith(file);
      });

      await waitFor(() => {
        expect(screen.getByText('Photo selected')).toBeInTheDocument();
      });
    });

    it('should show error when photo upload fails', async () => {
      mockUploadMeetupPhoto.mockResolvedValueOnce({
        success: false,
        error: 'Upload failed',
      });

      const { container } = renderWithProviders(<PostMeetupScreen />);

      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalled();
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const fileInput = container.querySelector(
        'input[type="file"][id="image-upload"]'
      ) as HTMLInputElement;

      expect(fileInput).toBeInTheDocument();

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
        configurable: true,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });
    });

    it('should validate file size', async () => {
      const { container } = renderWithProviders(<PostMeetupScreen />);

      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalled();
      });

      // Create a file larger than 5MB
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const fileInput = container.querySelector(
        'input[type="file"][id="image-upload"]'
      ) as HTMLInputElement;

      expect(fileInput).toBeInTheDocument();

      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: false,
        configurable: true,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(
          screen.getByText('Image file size must be less than 5MB')
        ).toBeInTheDocument();
      });

      // Verify upload was not called
      expect(mockUploadMeetupPhoto).not.toHaveBeenCalled();
    });

    it('should validate file type', async () => {
      const { container } = renderWithProviders(<PostMeetupScreen />);

      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalled();
      });

      // Create a non-image file
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const fileInput = container.querySelector(
        'input[type="file"][id="image-upload"]'
      ) as HTMLInputElement;

      expect(fileInput).toBeInTheDocument();

      Object.defineProperty(fileInput, 'files', {
        value: [textFile],
        writable: false,
        configurable: true,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(
          screen.getByText('Please select a valid image file')
        ).toBeInTheDocument();
      });

      // Verify upload was not called
      expect(mockUploadMeetupPhoto).not.toHaveBeenCalled();
    });
  });
});
