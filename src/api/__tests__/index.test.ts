import { apiPost } from '../index';
import { useUserStore } from '../../stores/userStore';

global.fetch = jest.fn();

jest.mock('../../stores/userStore', () => ({
  useUserStore: {
    getState: jest.fn(),
  },
}));

const mockFetch = global.fetch as jest.Mock;

describe('apiPost', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    (useUserStore.getState as jest.Mock).mockReturnValue({
      getToken: () => 'test-token',
      ensureValidToken: jest.fn(),
      clearUser: jest.fn(),
    });
  });

  it('sends authorization header by default', async () => {
    await apiPost('/test', { foo: 'bar' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];
    expect(options?.headers?.Authorization).toBe('Bearer test-token');
    expect(options?.credentials).toBe('include');
  });

  it('omits authorization header when skipAuth is true', async () => {
    await apiPost('/api/auth/refresh-token', {}, { skipAuth: true });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];
    expect(options?.headers?.Authorization).toBeUndefined();
    expect(options?.credentials).toBe('include');
  });
});
