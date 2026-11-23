import { describe, it, expect, vi } from 'vitest';
import { createApiClient } from './http';
import { createChatApi } from './chat';
import { createPaymentsApi } from './payments';
const uuid = '11111111-1111-4111-8111-111111111111';
function setup(response: Response) {
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response);
  const http = createApiClient({
    baseUrl: 'https://gateway.test',
    getAccessToken: () => 'access',
    fetchImpl,
  });
  return { fetchImpl, chat: createChatApi(http), payments: createPaymentsApi(http) };
}
describe('Chat and Payment integration boundary', () => {
  it('keeps cursor opaque and accepts the real Chat data-page shape', async () => {
    const { chat, fetchImpl } = setup(Response.json({ data: [], nextCursor: 'next' }));
    expect(await chat.history(uuid, 'a+/=')).toEqual({ data: [], nextCursor: 'next' });
    expect(String(fetchImpl.mock.calls[0][0])).toContain('cursor=a%2B%2F%3D');
  });
  it('sends one text message without trusting a client sender identity', async () => {
    const { chat, fetchImpl } = setup(
      Response.json({
        messageId: uuid,
        conversationId: uuid,
        senderId: uuid,
        messageType: 'TEXT',
        content: 'Hello',
        attachmentUrl: null,
        createdAt: '2026-11-04T00:00:00Z',
      }),
    );
    await chat.send(uuid, { messageType: 'TEXT', content: 'Hello' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ messageType: 'TEXT', content: 'Hello' }),
      headers: { Authorization: 'Bearer access' },
    });
  });
  it('does not retry a deposit conflict or turn it into success', async () => {
    const { payments, fetchImpl } = setup(
      Response.json(
        { status: 409, code: 'CONFLICT', message: 'Listing already committed' },
        { status: 409 },
      ),
    );
    await expect(payments.pay(uuid)).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][1]?.body).toBeUndefined();
  });
  it('rejects numeric money returned by a mismatched Payment server', async () => {
    const { payments } = setup(
      Response.json({
        data: [
          {
            paymentTrackingId: uuid,
            contractId: uuid,
            depositAmount: 500,
            status: 'LOCKED',
            releaseAt: null,
            releasedAt: null,
          },
        ],
        nextCursor: null,
      }),
    );
    await expect(payments.deposits()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('sends Idempotency-Key equal to decisionId for admin dispute resolution', async () => {
    const disputePayload = {
      disputeId: uuid,
      contractId: uuid,
      openedBy: uuid,
      status: 'RESOLVED',
      description: 'Sample',
      reasonCode: 'LATE_DELIVERY',
      depositHold: false,
      stateVersion: 2,
      assignedAdminId: uuid,
      responseDueAt: null,
      outcome: 'NO_VIOLATION',
    };
    const { payments, fetchImpl } = setup(Response.json(disputePayload));
    await payments.decideDispute(uuid, {
      decisionId: uuid,
      expectedVersion: 1,
      outcome: 'NO_VIOLATION',
      liableAccountId: null,
      violationCode: null,
      penaltyPoints: null,
      depositDisposition: 'NONE',
      reason: 'Không đủ căn cứ xử phạt.',
      evidenceRefs: [],
    });
    expect(fetchImpl.mock.calls[0][1]?.headers).toMatchObject({
      'Idempotency-Key': uuid,
      Authorization: 'Bearer access',
    });
  });
});
