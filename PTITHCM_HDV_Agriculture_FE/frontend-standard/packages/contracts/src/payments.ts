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
export const disputeDecisionSchema = z.object({
  decisionId: z.uuid(),
  disputeId: z.uuid().optional(),
  adminId: z.string().optional(),
  expectedVersion: z.number().optional(),
  outcome: z.string(),
  depositDisposition: z.string(),
  reason: z.string(),
  evidenceRefs: z.array(z.string()).optional(),
});
export const disputeSchema = z.object({
  disputeId: z.uuid(),
  contractId: z.uuid(),
  openedBy: z.string().optional(),
  farmerId: z.uuid().optional(),
  traderId: z.uuid().optional(),
  status: z.string(),
  description: z.string(),
  reasonCode: z.string(),
  depositHold: z.boolean(),
  stateVersion: z.number(),
  decisionVersion: z.number().optional(),
  assignedAdminId: z.string().nullable(),
  responseDueAt: z.string().nullable(),
  resolvedAt: z.string().nullable().optional(),
  outcome: z.string().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  decision: disputeDecisionSchema.nullable().optional(),
});
export const adminDisputesPageSchema = z.object({
  items: z.array(disputeSchema),
  nextCursor: z.string().nullable(),
});
export const evidenceItemSchema = z.object({
  evidenceId: z.uuid(),
  uploaderId: z.uuid(),
  sourceAccountId: z.string().nullable(),
  description: z.string().nullable(),
  contentType: z.string(),
  sizeBytes: z.number(),
  createdAt: z.string(),
  downloadUrl: z.string(),
});
export const evidencePageSchema = z.object({
  items: z.array(evidenceItemSchema),
  nextCursor: z.string().nullable(),
});
export const evidenceUploadSchema = z.object({
  evidenceId: z.uuid(),
  downloadUrl: z.string(),
  contentType: z.string(),
  sizeBytes: z.number(),
});
export type ContractStatus = z.infer<typeof contractSchema>['status'];
export type DepositStatus = z.infer<typeof depositSchema>['status'];
export type DisputeItem = z.infer<typeof disputeSchema>;
export type DisputeEvidenceItem = z.infer<typeof evidenceItemSchema>;
