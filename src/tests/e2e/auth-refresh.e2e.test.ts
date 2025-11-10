import { apiPost } from '../../api';
import { useUserStore, UserData } from '../../stores/userStore';
import { tokenRefreshService } from '../../utils/tokenRefresh';

type HeadersInitType = HeadersInit | undefined;

const getAuthorizationHeader = (
  headers: HeadersInitType
): string | undefined => {
  if (!headers) {
    return undefined;
  }

  if (headers instanceof Headers) {
    return (
      headers.get('Authorization') ?? headers.get('authorization') ?? undefined
    );
  }

  if (Array.isArray(headers)) {
    const match = headers.find(
      ([key]) => key.toLowerCase() === 'authorization'
    );
    return match?.[1];
  }

  const record = headers as Record<string, string> | undefined;
  return record?.Authorization ?? record?.authorization;
};

describe('Auth Refresh E2E', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();

    // Seed store with expired token and authenticated user
    const seedUser: UserData = {
      uid: 'user-123',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
    };

    localStorage.setItem('userToken', 'expired-token');
    localStorage.setItem('userData', JSON.stringify(seedUser));

    useUserStore.setState((state) => ({
      ...state,
      user: seedUser,
      isAuthenticated: true,
      hasToken: true,
    }));

    jest.spyOn(tokenRefreshService, 'isTokenValid').mockReturnValue(false);
    jest
      .spyOn(tokenRefreshService, 'manualRefresh')
      .mockResolvedValue('new-token');
    jest
      .spyOn(tokenRefreshService, 'startTokenMonitoring')
      .mockImplementation(() => undefined);
    jest
      .spyOn(tokenRefreshService, 'stopTokenMonitoring')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    }
    useUserStore.getState().clearUser();
    jest.resetAllMocks();
    localStorage.clear();
  });

  it('retries API call after refreshing token via cookie flow', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementationOnce(async () =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        } as Response)
      )
      .mockImplementationOnce(async () =>
        Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: 'secure' }),
        } as Response)
      );

    const result = await apiPost<{ success: boolean; data: string }>(
      '/secure-endpoint',
      { foo: 'bar' }
    );

    expect(result).toEqual({ success: true, data: 'secure' });
    expect(tokenRefreshService.manualRefresh).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('userToken')).toBe('new-token');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const secondCall = fetchMock.mock.calls[1];
    const requestInit = secondCall?.[1] as RequestInit | undefined;
    const authorizationHeader = getAuthorizationHeader(requestInit?.headers);

    expect(authorizationHeader).toBe('Bearer new-token');
    expect(requestInit?.credentials).toBe('include');
  });

  it('clears user state when refresh fails during retry', async () => {
    jest
      .spyOn(tokenRefreshService, 'manualRefresh')
      .mockRejectedValue(new Error('refresh failed'));

    jest.spyOn(global, 'fetch').mockImplementationOnce(async () =>
      Promise.resolve({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response)
    );

    await expect(
      apiPost<{ success: boolean }>('/secure-endpoint', { foo: 'bar' })
    ).rejects.toThrow('Authentication expired');

    expect(useUserStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('userToken')).toBeNull();
  });
});
