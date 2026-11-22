import { contractSchema, depositsSchema, disputeSchema } from '@agri/contracts';
import type { ApiClient } from './http';
const root = '/api/v1/payments';
const id = (value: string) => encodeURIComponent(value);
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
  open: (value: string, reasonCode: string, description: string) =>
    http.request<{ disputeId: string }>(root + '/contracts/' + id(value) + '/disputes', {
      method: 'POST',
      body: { reasonCode, description, evidenceRefs: [] },
    }),
  respond: (value: string, statement: string) =>
    http.request(root + '/disputes/' + id(value) + '/responses', {
      method: 'POST',
      body: { statement, evidenceRefs: [] },
    }),
});
