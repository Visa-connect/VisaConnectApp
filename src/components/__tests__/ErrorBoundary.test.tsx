import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import ErrorBoundary from '../ErrorBoundary';

// Mock Sentry
jest.mock('@sentry/react', () => ({
  captureException: jest.fn(),
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Suppress console.error for error boundary tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Normal rendering (no error)', () => {
    it('renders children when there is no error', () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <div>Test content</div>
          </ErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
      expect(
        screen.queryByText('Something went wrong')
      ).not.toBeInTheDocument();
    });

    it('renders multiple children when there is no error', () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <div>Child 1</div>
            <div>Child 2</div>
          </ErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('renders default fallback UI when an error occurs', () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(
        screen.getByText(
          /We're sorry, but something unexpected happened. Our team has been notified and is working on a fix./
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Return to Home')).toBeInTheDocument();
    });

    it('renders custom fallback UI when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <BrowserRouter>
          <ErrorBoundary fallback={customFallback}>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(
        screen.queryByText('Something went wrong')
      ).not.toBeInTheDocument();
    });

    it('does not render children when an error occurs', () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
            <div>This should not render</div>
          </ErrorBoundary>
        </BrowserRouter>
      );

      expect(
        screen.queryByText('This should not render')
      ).not.toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Sentry integration', () => {
    it('captures error in Sentry when REACT_APP_SENTRY_DSN is set', () => {
      const originalEnv = process.env.REACT_APP_SENTRY_DSN;
      process.env.REACT_APP_SENTRY_DSN = 'test-dsn';

      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>
      );

      // ErrorBoundary should capture the error
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          contexts: expect.objectContaining({
            react: expect.objectContaining({
              componentStack: expect.any(String),
            }),
          }),
          tags: {
            errorBoundary: true,
          },
        })
      );

      process.env.REACT_APP_SENTRY_DSN = originalEnv;
    });

    it('does not capture error in Sentry when REACT_APP_SENTRY_DSN is not set', () => {
      const originalEnv = process.env.REACT_APP_SENTRY_DSN;
      delete process.env.REACT_APP_SENTRY_DSN;

      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>
      );

      // Sentry should not be called when DSN is not set
      expect(Sentry.captureException).not.toHaveBeenCalled();

      process.env.REACT_APP_SENTRY_DSN = originalEnv;
    });
  });

  describe('Navigation', () => {
    it('navigates to home when "Return to Home" button is clicked', () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>
      );

      const returnHomeButton = screen.getByText('Return to Home');
      fireEvent.click(returnHomeButton);

      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  describe('onReset callback', () => {
    it('calls onReset callback when provided and error is reset', () => {
      const onResetMock = jest.fn();

      render(
        <BrowserRouter>
          <ErrorBoundary onReset={onResetMock}>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>
      );

      const returnHomeButton = screen.getByText('Return to Home');
      fireEvent.click(returnHomeButton);

      expect(onResetMock).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('does not call onReset when not provided', () => {
      const onResetMock = jest.fn();

      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>
      );

      const returnHomeButton = screen.getByText('Return to Home');
      fireEvent.click(returnHomeButton);

      // onResetMock should not be called since it wasn't provided
      expect(onResetMock).not.toHaveBeenCalled();
    });
  });

  describe('Error logging', () => {
    it('logs error to console when an error occurs', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Multiple errors', () => {
    it('handles multiple errors correctly', () => {
      // First error
      const { unmount } = render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      unmount();

      // Second error with new instance
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});
