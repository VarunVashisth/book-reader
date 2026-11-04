import { DRIVE_SCOPES } from './googleIdentity';

describe('Google authorization scopes', () => {
  it('uses only the two least-privilege Drive scopes', () => {
    expect(DRIVE_SCOPES).toEqual([
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.appdata'
    ]);
    expect(DRIVE_SCOPES.join(' ')).not.toContain('auth/drive ');
    expect(DRIVE_SCOPES.join(' ')).not.toContain('drive.readonly');
  });
});
