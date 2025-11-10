export class RefreshTokenError extends Error {
  public readonly code = 'REFRESH_TOKEN_ERROR';

  constructor(message = 'Token refresh failed') {
    super(message);
    this.name = 'RefreshTokenError';
  }
}
