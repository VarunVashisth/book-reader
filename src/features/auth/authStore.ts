import { create } from 'zustand';
import { createTokenClient, revokeToken, type TokenResponse } from './googleIdentity';
import { createLocalAccount, verifyLocalAccount } from './localAccount';

type AuthStatus = 'idle' | 'authorizing' | 'authorized' | 'reauth-required' | 'error';
type AuthMethod = 'google' | 'local';
interface AuthState {
  status: AuthStatus;
  authMethod?: AuthMethod;
  accountEmail?: string;
  accessToken?: string;
  expiresAt?: number;
  error?: string;
  authorize: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  registerWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getValidToken: () => string | undefined;
}

let pendingRequest = false;
const LOCAL_SESSION_KEY = 'leaf.local-session.v1';
const restoredLocalEmail = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(LOCAL_SESSION_KEY);

export const useAuthStore = create<AuthState>((set, get) => ({
  status: restoredLocalEmail ? 'authorized' : 'idle',
  authMethod: restoredLocalEmail ? 'local' : undefined,
  accountEmail: restoredLocalEmail ?? undefined,
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
        set({ status: 'authorized', authMethod: 'google', accessToken: response.access_token, expiresAt: Date.now() + Math.max(0, (response.expires_in ?? 3600) - 60) * 1000 });
      });
      client.requestAccessToken({ prompt: 'consent' });
    } catch (error) {
      pendingRequest = false;
      set({ status: 'error', error: error instanceof Error ? error.message : 'Authorization failed.' });
    }
  },
  signInWithPassword: async (email, password) => {
    set({ status: 'authorizing', error: undefined });
    try {
      const accountEmail = await verifyLocalAccount(email, password);
      sessionStorage.setItem(LOCAL_SESSION_KEY, accountEmail);
      set({ status: 'authorized', authMethod: 'local', accountEmail, accessToken: undefined, expiresAt: undefined });
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : 'Sign-in failed.' });
    }
  },
  registerWithPassword: async (email, password) => {
    set({ status: 'authorizing', error: undefined });
    try {
      const accountEmail = await createLocalAccount(email, password);
      sessionStorage.setItem(LOCAL_SESSION_KEY, accountEmail);
      set({ status: 'authorized', authMethod: 'local', accountEmail, accessToken: undefined, expiresAt: undefined });
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : 'Account creation failed.' });
    }
  },
  signOut: async () => {
    const { accessToken: token, authMethod } = get();
    sessionStorage.removeItem(LOCAL_SESSION_KEY);
    set({ status: 'idle', authMethod: undefined, accountEmail: undefined, accessToken: undefined, expiresAt: undefined, error: undefined });
    if (token && authMethod === 'google') await revokeToken(token);
  },
  getValidToken: () => {
    const { accessToken, expiresAt, authMethod } = get();
    if (authMethod === 'local') return undefined;
    if (!accessToken || !expiresAt || expiresAt <= Date.now()) {
      if (accessToken) set({ status: 'reauth-required', accessToken: undefined, expiresAt: undefined });
      return undefined;
    }
    return accessToken;
  }
}));
