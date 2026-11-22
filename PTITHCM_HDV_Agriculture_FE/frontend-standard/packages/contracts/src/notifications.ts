import { z } from 'zod';
import { pageSchema } from './common';
export const notificationTypeSchema = z.enum([
  'OFFER_CREATED',
  'OFFER_ACCEPTED',
  'MESSAGE_CREATED',
  'CONTRACT_CREATED',
  'CONTRACT_STATUS_CHANGED',
  'DEPOSIT_PAID',
  'DEPOSIT_STATUS_CHANGED',
  'REPUTATION_CHANGED',
  'ACCOUNT_LOCKED',
  'ACCOUNT_UNLOCKED',
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;
export const notificationSchema = z
  .object({
    notificationId: z.uuid(),
    type: notificationTypeSchema,
    title: z.string(),
    content: z.string(),
    sourceService: z.string(),
    referenceType: z.enum(['OFFER', 'CONVERSATION', 'CONTRACT', 'DEPOSIT', 'ACCOUNT']),
    referenceId: z.uuid(),
    status: z.enum(['UNREAD', 'READ']),
    createdAt: z.string(),
    readAt: z.string().nullable(),
  })
  .refine((value) => (value.status === 'READ' ? value.readAt !== null : value.readAt === null), {
    message: 'Trạng thái đọc không khớp thời điểm đọc.',
  });
export const notificationsPageSchema = pageSchema(notificationSchema);
export const unreadCountSchema = z.object({ count: z.number().int().nonnegative() });
export const markReadSchema = z.object({
  notificationId: z.uuid(),
  status: z.literal('READ'),
  readAt: z.string(),
});
export type Notification = z.infer<typeof notificationSchema>;
export type NotificationFilters = { page: number; isRead?: boolean; type?: NotificationType };
export const notificationTypeLabels: Record<NotificationType, string> = {
  OFFER_CREATED: 'Báo giá mới',
  OFFER_ACCEPTED: 'Báo giá được chấp nhận',
  MESSAGE_CREATED: 'Tin nhắn mới',
  CONTRACT_CREATED: 'Hợp đồng mới',
  CONTRACT_STATUS_CHANGED: 'Cập nhật hợp đồng',
  DEPOSIT_PAID: 'Xác nhận tiền cọc',
  DEPOSIT_STATUS_CHANGED: 'Cập nhật tiền cọc',
  REPUTATION_CHANGED: 'Cập nhật uy tín',
  ACCOUNT_LOCKED: 'Khóa tài khoản',
  ACCOUNT_UNLOCKED: 'Mở khóa tài khoản',
};
export const notificationIcons: Record<NotificationType, string> = {
  OFFER_CREATED: '⇄',
  OFFER_ACCEPTED: '✓',
  MESSAGE_CREATED: '✉',
  CONTRACT_CREATED: '▤',
  CONTRACT_STATUS_CHANGED: '▤',
  DEPOSIT_PAID: '₫',
  DEPOSIT_STATUS_CHANGED: '₫',
  REPUTATION_CHANGED: '↗',
  ACCOUNT_LOCKED: '◈',
  ACCOUNT_UNLOCKED: '◈',
};
export function notificationDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Chưa có thời gian'
    : date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
}
