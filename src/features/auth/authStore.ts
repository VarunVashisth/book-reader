import { create } from 'zustand';
import { createTokenClient, revokeToken, type TokenResponse } from './googleIdentity';

type AuthStatus = 'idle' | 'authorizing' | 'authorized' | 'reauth-required' | 'error';
interface AuthState {
  status: AuthStatus;
  accessToken?: string;
  expiresAt?: number;
  error?: string;
  authorize: () => Promise<void>;
  signOut: () => Promise<void>;
  getValidToken: () => string | undefined;
}

let pendingRequest = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'idle',
  authorize: async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      set({ status: 'error', error: 'Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to your environment.' });
      return;
    }
    if (pendingRequest) return;
    pendingRequest = true;
    set({ status: 'authorizing', error: undefined });
    try {
      const client = await createTokenClient(clientId, (response: TokenResponse) => {
        pendingRequest = false;
        if (response.error || !response.access_token) {
          set({ status: 'error', accessToken: undefined, expiresAt: undefined, error: response.error_description ?? response.error ?? 'Authorization was not completed.' });
          return;
        }
        set({ status: 'authorized', accessToken: response.access_token, expiresAt: Date.now() + Math.max(0, (response.expires_in ?? 3600) - 60) * 1000 });
      });
      client.requestAccessToken({ prompt: 'consent' });
    } catch (error) {
      pendingRequest = false;
      set({ status: 'error', error: error instanceof Error ? error.message : 'Authorization failed.' });
    }
  },
  signOut: async () => {
    const token = get().accessToken;
    set({ status: 'idle', accessToken: undefined, expiresAt: undefined, error: undefined });
    if (token) await revokeToken(token);
  },
  getValidToken: () => {
    const { accessToken, expiresAt } = get();
    if (!accessToken || !expiresAt || expiresAt <= Date.now()) {
      if (accessToken) set({ status: 'reauth-required', accessToken: undefined, expiresAt: undefined });
      return undefined;
    }
    return accessToken;
  }
}));
