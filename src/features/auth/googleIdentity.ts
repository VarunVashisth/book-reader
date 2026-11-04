const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client';
export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata'
] as const;

export interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  callback: (response: TokenResponse) => void;
  requestAccessToken: (options?: { prompt?: string; hint?: string }) => void;
}

declare global {
  interface Window {
    google?: { accounts: { oauth2: { initTokenClient(config: { client_id: string; scope: string; callback: (response: TokenResponse) => void }): TokenClient; revoke(token: string, callback: () => void): void } } };
  }
}

let scriptPromise: Promise<void> | undefined;

function loadScript(): Promise<void> {
  if (window.google) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Identity Services could not be loaded.'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export async function createTokenClient(clientId: string, onToken: (response: TokenResponse) => void): Promise<TokenClient> {
  await loadScript();
  if (!window.google) throw new Error('Google Identity Services is unavailable.');
  return window.google.accounts.oauth2.initTokenClient({ client_id: clientId, scope: DRIVE_SCOPES.join(' '), callback: onToken });
}

export function revokeToken(token: string): Promise<void> {
  return new Promise((resolve) => window.google?.accounts.oauth2.revoke(token, resolve));
}
