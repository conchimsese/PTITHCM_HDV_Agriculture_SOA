import {
  notificationSchema,
  notificationsPageSchema,
  markReadSchema,
  unreadCountSchema,
  type NotificationFilters,
} from '@agri/contracts';
import type { ApiClient } from './http';
export const createNotificationsApi = (http: ApiClient) => ({
  list: (filters: NotificationFilters, signal?: AbortSignal) => {
    const params = new URLSearchParams({ page: String(filters.page), size: '20' });
    if (filters.isRead !== undefined) params.set('isRead', String(filters.isRead));
    if (filters.type) params.set('type', filters.type);
    return http.request(`/api/v1/notifications?${params}`, {
      signal,
      schema: notificationsPageSchema,
    });
  },
  detail: (id: string, signal?: AbortSignal) =>
    http.request(`/api/v1/notifications/${encodeURIComponent(id)}`, {
      signal,
      schema: notificationSchema,
    }),
  unreadCount: (signal?: AbortSignal) =>
    http.request('/api/v1/notifications/unread-count', { signal, schema: unreadCountSchema }),
  markRead: (id: string) =>
    http.request(`/api/v1/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
      schema: markReadSchema,
    }),
});
