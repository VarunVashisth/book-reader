const ACCOUNTS_KEY = 'leaf.local-accounts.v1';
const ITERATIONS = 120_000;

interface StoredAccount {
  email: string;
  salt: string;
  passwordHash: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function readAccounts(): StoredAccount[] {
  try {
    const value = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function hashPassword(password: string, salt: ArrayBuffer): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256);
  return bytesToBase64(new Uint8Array(bits));
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createLocalAccount(email: string, password: string): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error('Enter a valid email address.');
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');

  const accounts = readAccounts();
  if (accounts.some((account) => account.email === normalizedEmail)) throw new Error('An account with this email already exists.');

  const salt = crypto.getRandomValues(new Uint8Array(16));
  accounts.push({ email: normalizedEmail, salt: bytesToBase64(salt), passwordHash: await hashPassword(password, salt.buffer) });
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  return normalizedEmail;
}

export async function verifyLocalAccount(email: string, password: string): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  const account = readAccounts().find((candidate) => candidate.email === normalizedEmail);
  if (!account) throw new Error('Email or password is incorrect.');

  const salt = Uint8Array.from(atob(account.salt), (character) => character.charCodeAt(0));
  const candidateHash = await hashPassword(password, salt.buffer as ArrayBuffer);
  if (candidateHash !== account.passwordHash) throw new Error('Email or password is incorrect.');
  return normalizedEmail;
}
