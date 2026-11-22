import { z } from 'zod';
export const messageSchema = z.object({
  messageId: z.uuid(),
  conversationId: z.uuid(),
  senderId: z.uuid(),
  messageType: z.enum(['TEXT', 'IMAGE', 'CONTRACT']),
  content: z.string().nullable(),
  attachmentUrl: z.string().nullable(),
  contractId: z.string().nullable().optional(),
  isRead: z.boolean().optional(),
  createdAt: z.string(),
  readAt: z.string().nullable().optional(),
});
export const roomSchema = z.object({
  conversationId: z.uuid(),
  offerId: z.uuid(),
  participantIds: z.array(z.uuid()),
  contractId: z.string().nullable(),
  status: z.string(),
  unreadCount: z.number().optional(),
});
export const roomsSchema = z.object({
  data: z.array(roomSchema),
  nextCursor: z.string().nullable(),
});
export const historySchema = z.object({
  data: z.array(messageSchema),
  nextCursor: z.string().nullable(),
});
export type ChatMessage = z.infer<typeof messageSchema>;
