import {
  adminDisputesPageSchema,
  contractSchema,
  depositsSchema,
  disputeSchema,
  evidencePageSchema,
  evidenceUploadSchema,
} from '@agri/contracts';
import type { ApiClient } from './http';
const root = '/api/v1/payments';
const id = (value: string) => encodeURIComponent(value);
export type DisputeDecisionBody = {
  decisionId: string;
  expectedVersion: number;
  outcome:
    | 'NO_VIOLATION'
    | 'INSUFFICIENT_EVIDENCE'
    | 'FARMER_VIOLATION'
    | 'TRADER_VIOLATION'
    | 'MUTUAL_CANCEL';
  liableAccountId: string | null;
  violationCode: string | null;
  penaltyPoints: string | null;
  depositDisposition: 'NONE' | 'REFUND_TO_TRADER' | 'FORFEIT_TO_FARMER';
  reason: string;
  evidenceRefs: string[];
};
export const createPaymentsApi = (http: ApiClient) => ({
  contract: (value: string, signal?: AbortSignal) =>
    http.request(root + '/contracts/' + id(value), { schema: contractSchema, signal }),
  deposits: (cursor?: string, signal?: AbortSignal) =>
    http.request(root + '/deposits?limit=20' + (cursor ? '&cursor=' + id(cursor) : ''), {
      schema: depositsSchema,
      signal,
    }),
  create: (body: {
    offerId: string;
    conversationId: string;
    farmerId: string;
    totalAmount: string;
    deliveryDate: string;
    terms: string;
  }) => http.request(root + '/contracts', { method: 'POST', body, schema: contractSchema }),
  edit: (value: string, body: { totalAmount: string; deliveryDate: string; terms: string }) =>
    http.request(root + '/contracts/' + id(value), {
      method: 'PATCH',
      body,
      schema: contractSchema,
    }),
  accept: (value: string) =>
    http.request(root + '/contracts/' + id(value) + '/accept', { method: 'POST' }),
  pay: (value: string) =>
    http.request(root + '/deposits/' + id(value) + '/pay', { method: 'POST' }),
  complete: (value: string) =>
    http.request(root + '/contracts/' + id(value) + '/complete', { method: 'POST' }),
  release: (value: string) =>
    http.request(root + '/deposits/' + id(value) + '/release', { method: 'POST' }),
  dispute: (value: string, signal?: AbortSignal) =>
    http.request(root + '/disputes/' + id(value), { schema: disputeSchema, signal }),
  open: (value: string, reasonCode: string, description: string, evidenceRefs: string[] = []) =>
    http.request<{ disputeId: string }>(root + '/contracts/' + id(value) + '/disputes', {
      method: 'POST',
      body: { reasonCode, description, evidenceRefs },
    }),
  respond: (value: string, statement: string, evidenceRefs: string[] = []) =>
    http.request(root + '/disputes/' + id(value) + '/responses', {
      method: 'POST',
      body: { statement, evidenceRefs },
    }),
  evidenceList: (value: string, cursor?: string, signal?: AbortSignal) =>
    http.request(
      root +
        '/disputes/' +
        id(value) +
        '/evidence?limit=50' +
        (cursor ? '&cursor=' + id(cursor) : ''),
      { schema: evidencePageSchema, signal },
    ),
  uploadEvidence: (value: string, file: File, description?: string, sourceAccountId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    if (sourceAccountId) formData.append('sourceAccountId', sourceAccountId);
    return http.request(root + '/disputes/' + id(value) + '/evidence', {
      method: 'POST',
      formData,
      schema: evidenceUploadSchema,
    });
  },
  adminDisputes: (status?: string, cursor?: string, limit = 30, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (status) params.set('status', status);
    if (cursor) params.set('cursor', cursor);
    return http.request(root + '/admin/disputes?' + params.toString(), {
      schema: adminDisputesPageSchema,
      signal,
    });
  },
  reviewDispute: (value: string, note: string, expectedVersion: number | null) =>
    http.request(root + '/admin/disputes/' + id(value) + '/review', {
      method: 'POST',
      body: { note, expectedVersion },
      schema: disputeSchema,
    }),
  decideDispute: (value: string, body: DisputeDecisionBody) =>
    http.request(root + '/admin/disputes/' + id(value) + '/decisions', {
      method: 'POST',
      idempotencyKey: body.decisionId,
      body,
      schema: disputeSchema,
    }),
});
