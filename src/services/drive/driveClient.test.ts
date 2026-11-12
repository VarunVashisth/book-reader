import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBook, getDriveUser } from './driveClient';

afterEach(() => vi.restoreAllMocks());

describe('Drive client', () => {
  it('resolves a stable Google Drive identity with the bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ user: { permissionId: 'permission-1', displayName: 'Reader', emailAddress: 'reader@example.com' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await expect(getDriveUser('access-token')).resolves.toMatchObject({ permissionId: 'permission-1', emailAddress: 'reader@example.com' });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/about?fields='), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer access-token' }) }));
  });

  it('turns an expired download token into a reauthorization message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 401 }));
    await expect(downloadBook('expired', 'file-1', 'book-1')).rejects.toThrow('authorization expired');
  });

  it('refuses to download a file outside the Leaf Books folder', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: [{ id: 'leaf-folder', name: 'Leaf Books' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'foreign-file', name: 'Other.pdf', parents: ['other-folder'], appProperties: { leafBookId: 'book-1' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await expect(downloadBook('token', 'foreign-file', 'book-1')).rejects.toThrow('outside its managed books folder');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
