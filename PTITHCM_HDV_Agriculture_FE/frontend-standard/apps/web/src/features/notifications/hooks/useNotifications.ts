import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createNotificationsApi } from '@agri/api-client';
import type { NotificationFilters } from '@agri/contracts';
import { http } from '../../../shared/api/runtime';
import { useSession } from '../../users/hooks/useUsers';
const api = createNotificationsApi(http);
export function useNotifications(filters: NotificationFilters) {
  const session = useSession();
  return useQuery({
    queryKey: ['notifications', session?.accountId, 'list', filters],
    enabled: Boolean(session?.tokens),
    queryFn: ({ signal }) => api.list(filters, signal),
  });
}
export function useNotification(id: string) {
  const session = useSession();
  return useQuery({
    queryKey: ['notifications', session?.accountId, 'detail', id],
    enabled: Boolean(session?.tokens && id),
    queryFn: ({ signal }) => api.detail(id, signal),
  });
}
export function useUnreadCount() {
  const session = useSession();
  return useQuery({
    queryKey: ['notifications', session?.accountId, 'unread-count'],
    enabled: Boolean(session?.tokens),
    queryFn: ({ signal }) => api.unreadCount(signal),
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
}
export function useMarkRead() {
  const session = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markRead(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['notifications', session?.accountId] }),
    onError: () => client.invalidateQueries({ queryKey: ['notifications', session?.accountId] }),
  });
}
