import { useAuthStore } from './authStore';

describe('auth token lifecycle', () => {
  beforeEach(() => useAuthStore.setState({ status: 'idle', accessToken: undefined, expiresAt: undefined, error: undefined }));

  it('returns a live in-memory access token', () => {
    useAuthStore.setState({ status: 'authorized', accessToken: 'test-token', expiresAt: Date.now() + 60_000 });
    expect(useAuthStore.getState().getValidToken()).toBe('test-token');
  });

  it('clears expired access tokens and requires authorization', () => {
    useAuthStore.setState({ status: 'authorized', accessToken: 'expired-token', expiresAt: Date.now() - 1 });
    expect(useAuthStore.getState().getValidToken()).toBeUndefined();
    expect(useAuthStore.getState().status).toBe('reauth-required');
    expect(useAuthStore.getState().accessToken).toBeUndefined();
  });
});
