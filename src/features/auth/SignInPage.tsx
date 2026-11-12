import { BookOpen, Cloud, LockKeyhole, WifiOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuthStore } from './authStore';

export function SignInPage() {
  const { status, error, authorize, signInWithPassword, registerWithPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    void (creatingAccount ? registerWithPassword(email, password) : signInWithPassword(email, password));
  };
  return (
    <main className="signin-shell">
      <section className="signin-copy">
        <a className="brand" href="/" aria-label="Leaf home"><span className="brand-mark"><BookOpen size={21} /></span> Leaf</a>
        <div className="hero-copy">
          <p className="eyebrow">Your books. Your Drive. Your space.</p>
          <h1>A quieter place<br />to read deeply.</h1>
          <p className="hero-lede">A private, offline-ready library that keeps every book, note, and reading position close—on every device.</p>
          <div className="trust-row">
            <span><LockKeyhole size={16} /> Private by design</span>
            <span><WifiOff size={16} /> Works offline</span>
            <span><Cloud size={16} /> Your Google Drive</span>
          </div>
        </div>
        <p className="quiet-note">No tracking. No public links. No subscription.</p>
      </section>
      <section className="signin-panel" aria-labelledby="signin-title">
        <div className="signin-card">
          <div className="mini-mark"><BookOpen size={24} /></div>
          <h2 id="signin-title">Welcome to Leaf</h2>
          <p>Sign in to open your personal library. Leaf only accesses books and private app data it creates.</p>
          <form className="password-form" onSubmit={submitPassword}>
            <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Password<input type="password" autoComplete={creatingAccount ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label>
            <button className="password-button" type="submit" disabled={status === 'authorizing'}>{creatingAccount ? 'Create local account' : 'Sign in with password'}</button>
          </form>
          <button className="account-mode" type="button" onClick={() => setCreatingAccount((value) => !value)}>
            {creatingAccount ? 'Already have a local account? Sign in' : 'New here? Create a local account'}
          </button>
          <div className="auth-divider"><span>or</span></div>
          <button className="google-button" onClick={() => void authorize()} disabled={status === 'authorizing'}>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h6a5.2 5.2 0 0 1-2.2 3.3v2.8h3.6c2.1-2 3.2-4.8 3.2-8.2Z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.6l-3.6-2.8c-1 .7-2.3 1-3.8 1a6.5 6.5 0 0 1-6.1-4.5H2.2V17A11.2 11.2 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.9 14.1a6.7 6.7 0 0 1 0-4.2V7H2.2a11.2 11.2 0 0 0 0 10l3.7-2.9Z"/><path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.2A11 11 0 0 0 2.2 7l3.7 2.9A6.5 6.5 0 0 1 12 5.4Z"/></svg>
            {status === 'authorizing' ? 'Opening Google…' : 'Continue with Google'}
          </button>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <p className="consent-note">Local accounts are stored only in this browser for testing and do not sync. Google sign-in requests only <strong>drive.file</strong> and <strong>drive.appdata</strong>.</p>
        </div>
      </section>
    </main>
  );
}
