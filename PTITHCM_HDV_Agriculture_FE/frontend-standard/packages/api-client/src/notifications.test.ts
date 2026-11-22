import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './http';
import { createNotificationsApi } from './notifications';
const id = '11111111-1111-4111-8111-111111111111';
const unread = {
  notificationId: id,
  type: 'MESSAGE_CREATED',
  title: 'Tin nhắn mới',
  content: 'Bạn có tin nhắn mới.',
  sourceService: 'chat-service',
  referenceType: 'CONVERSATION',
  referenceId: id,
  status: 'UNREAD',
  createdAt: '2026-11-08T00:00:00Z',
  readAt: null,
};
function setup(data: unknown, status = 200) {
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(Response.json(data, { status }));
  const api = createNotificationsApi(
    createApiClient({
      baseUrl: 'https://gateway.test',
      getAccessToken: () => 'private-token',
      fetchImpl,
    }),
  );
  return { api, fetchImpl };
}
describe('Notification API boundaries', () => {
  it('preserves false unread filter without allowing a recipient override', async () => {
    const { api, fetchImpl } = setup({
      items: [unread],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });
    await api.list({ page: 0, isRead: false, type: 'MESSAGE_CREATED' });
    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.searchParams.get('isRead')).toBe('false');
    expect(url.searchParams.get('type')).toBe('MESSAGE_CREATED');
    expect(url.searchParams.has('recipientId')).toBe(false);
    expect(fetchImpl.mock.calls[0][1]?.headers).toHaveProperty(
      'Authorization',
      'Bearer private-token',
    );
  });
  it('rejects inconsistent read state rather than displaying a false read acknowledgement', async () => {
    const { api } = setup({ ...unread, status: 'READ', readAt: null });
    await expect(api.detail(id)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('marks one notification without a request body and uses the server readAt', async () => {
    const readAt = '2026-11-08T01:00:00Z';
    const { api, fetchImpl } = setup({ notificationId: id, status: 'READ', readAt });
    expect(await api.markRead(id)).toEqual({ notificationId: id, status: 'READ', readAt });
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ method: 'PATCH', body: undefined });
    expect(fetchImpl.mock.calls[0][1]?.headers).not.toHaveProperty('Content-Type');
  });
  it('keeps ownership and retention 404 errors instead of manufacturing notification content', async () => {
    const { api } = setup(
      { status: 404, code: 'NOT_FOUND', message: 'Không tìm thấy thông báo.' },
      404,
    );
    await expect(api.detail(id)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
  it('rejects a negative unread count', async () => {
    const { api } = setup({ count: -1 });
    await expect(api.unreadCount()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
