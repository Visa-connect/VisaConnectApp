import express from 'express';
import request from 'supertest';
import authRouter from '../../api/auth';
import { authService } from '../../services/authService';

jest.mock('../../services/authService');

describe('POST /api/auth/refresh-token', () => {
  const setupApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    return app;
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 401 when refresh token cookie is missing', async () => {
    const app = setupApp();

    const response = await request(app)
      .post('/api/auth/refresh-token')
      .set('Authorization', 'Bearer expired.token.value');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/refresh token cookie/i);
    expect(authService.refreshToken).not.toHaveBeenCalled();
  });

  it('refreshes token when cookie is present and sets new cookie', async () => {
    const app = setupApp();

    (authService.refreshToken as jest.Mock).mockResolvedValue({
      success: true,
      token: 'new-id-token',
      refreshToken: 'new-refresh-token',
      message: 'Token refreshed',
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    });

    const response = await request(app)
      .post('/api/auth/refresh-token')
      .set('Authorization', 'Bearer expired.token.value')
      .set('Cookie', ['vc_refresh_token=old-refresh-token']);

    expect(authService.refreshToken).toHaveBeenCalledWith('old-refresh-token');
    expect(response.status).toBe(200);
    expect(response.body.token).toBe('new-id-token');
    expect(response.body.success).toBe(true);
    expect(response.get('Set-Cookie')?.[0]).toContain(
      'vc_refresh_token=new-refresh-token'
    );
    expect(response.get('Set-Cookie')?.[0]).toMatch(/HttpOnly/i);
  });
});
