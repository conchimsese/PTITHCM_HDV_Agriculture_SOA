import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './http';
import { createUsersApi } from './users';
const id = '11111111-1111-4111-8111-111111111111';
function setup(data: unknown) {
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(Response.json(data));
  const api = createUsersApi(
    createApiClient({ baseUrl: 'https://gateway.test', getAccessToken: () => 'token', fetchImpl }),
  );
  return { api, fetchImpl };
}
describe('User DTO boundaries', () => {
  it('rejects a private profile whose fields do not match its role', async () => {
    const { api } = setup({
      accountId: id,
      username: 'farmer',
      email: 'a@example.com',
      role: 'FARMER',
      status: 'ACTIVE',
      createdAt: '2026-01-01',
      emailVerifiedAt: null,
      profile: {
        businessName: 'Trader',
        phone: null,
        address: null,
        province: null,
        district: null,
        avatarUrl: null,
      },
    });
    await expect(api.me()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('exposes only public whitelist fields even if backend adds contacts', async () => {
    const { api } = setup({
      accountId: id,
      displayName: 'Nhà nông',
      avatarUrl: null,
      province: null,
      district: null,
      joinedAt: '2026-01-01',
      email: 'private@example.com',
      phone: '0912345678',
      reputation: 10,
    });
    const result = await api.publicProfile(id);
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('phone');
    expect(result).not.toHaveProperty('reputation');
  });
  it('sends multipart without a JSON content type and keeps Bearer auth', async () => {
    const { api, fetchImpl } = setup({
      mediaId: id,
      avatarUrl: `/api/v1/users/media/${id}`,
      contentType: 'image/png',
      sizeBytes: 2,
    });
    const form = new FormData();
    form.append('file', new Blob(['ok'], { type: 'image/png' }), 'avatar.png');
    await api.uploadAvatar(form);
    const options = fetchImpl.mock.calls[0][1];
    expect(options?.body).toBe(form);
    expect(options?.headers).toHaveProperty('Authorization', 'Bearer token');
    expect(options?.headers).not.toHaveProperty('Content-Type');
  });
  it('does not send credentials to arbitrary avatar URLs', () => {
    const { api, fetchImpl } = setup({});
    expect(() => api.avatar('https://untrusted.example/avatar')).toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
