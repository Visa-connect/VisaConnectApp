/**
 * Determines if an error message represents an authentication error.
 * Authentication errors are typically user-facing (invalid credentials) and
 * should not be sent to Sentry to avoid noise.
 *
 * @param errorMessage - The error message to check
 * @returns true if the error is an authentication error, false otherwise
 */
export function isAuthenticationError(errorMessage: string): boolean {
  if (!errorMessage) {
    return false;
  }

  const authErrorMessages = [
    'Invalid email or password',
    'Authentication failed',
    'Authentication expired',
    'Token refresh failed',
    'Unauthorized',
    'Invalid credentials',
  ];

  return authErrorMessages.some((msg) =>
    errorMessage.toLowerCase().includes(msg.toLowerCase())
  );
}

