import { z } from 'zod';
import { decimalMoneySchema } from './common';
export const contractSchema = z.object({
  contractId: z.uuid(),
  offerId: z.uuid(),
  conversationId: z.uuid(),
  farmerId: z.uuid(),
  traderId: z.uuid(),
  totalAmount: decimalMoneySchema,
  terms: z.string(),
  deliveryDate: z.string(),
  status: z.enum(['CREATED', 'PENDING_DEPOSIT', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
  stateVersion: z.number(),
  disputeSummary: z
    .object({
      disputeId: z.uuid(),
      status: z.string(),
      depositHold: z.boolean(),
      responseDueAt: z.string().nullable(),
    })
    .nullable()
    .optional(),
});
export const depositSchema = z.object({
  paymentTrackingId: z.uuid(),
  contractId: z.uuid(),
  depositAmount: decimalMoneySchema,
  status: z.enum(['PENDING', 'LOCKED', 'RELEASABLE', 'RELEASED', 'FORFEITED', 'REFUNDED']),
  releaseAt: z.string().nullable(),
  releasedAt: z.string().nullable(),
});
export const depositsSchema = z.object({
  data: z.array(depositSchema),
  nextCursor: z.string().nullable(),
});
export const disputeSchema = z.object({
  disputeId: z.uuid(),
  contractId: z.uuid(),
  status: z.string(),
  description: z.string(),
  reasonCode: z.string(),
  depositHold: z.boolean(),
  stateVersion: z.number(),
  assignedAdminId: z.string().nullable(),
  responseDueAt: z.string().nullable(),
  outcome: z.string().nullable(),
});
export type ContractStatus = z.infer<typeof contractSchema>['status'];
export type DepositStatus = z.infer<typeof depositSchema>['status'];
