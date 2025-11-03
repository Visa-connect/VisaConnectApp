import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Test utility to wrap components with necessary providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

test('renders app without crashing', () => {
  renderWithProviders(<App />);

  // Check if the app renders without crashing
  // Since this is a router-based app, we'll check for the WelcomeScreen content
  // which should always be visible on the root route
  const getStartedButton = screen.getByText(/get started/i);
  expect(getStartedButton).toBeInTheDocument();

  const signInButton = screen.getByText(/sign in/i);
  expect(signInButton).toBeInTheDocument();
});
