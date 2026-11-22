# Chat/Payment web — 04/11/2026

Branch feat/chat-payment, based on main cc510d0. Backend main: Chat b28cfc1; Payment a8fab5f.

## Run

In frontend-standard: npm ci; configure apps/web/.env from .env.example with VITE_GATEWAY_URL; npm run dev:web. Use an ACTIVE Farmer/Trader account. Tokens remain in RAM. Gateway must forward /api/v1/conversations/**, /api/v1/payments/**, and WebSocket Upgrade /ws/chat with the web origin allowed. Never commit credentials.

## Implemented web participant flows

- /chat, /chat/:conversationId: cursor conversations/history, message deduplication, REST text/image send, private Bearer image downloads, read receipt. JSON WebSocket CONNECT/joinConversation, reconnect backoff, REST reconciliation after join, absolute unread updates via refetch; versioned contract invalidation. Logout/account change closes socket, clears cache and revokes image blob URLs.
- /payments: cursor deposit history and Contract lookup by UUID; no invented Contract-list endpoint.
- /payments/new: Trader creates Contract from Chat context, decimal-string money and ISO delivery date.
- /payments/contracts/:contractId: view/edit draft, accept/pay/complete/release according to participant role, ownership and state. Backend remains authoritative. No automatic mutation retries. Conflict causes refetch.
- /payments/disputes/:disputeId: participant reads dispute, uploads/pages private evidence, submits statement. Open dispute from Contract with empty evidenceRefs, then upload evidence. Responses currently use empty evidenceRefs; uploaded evidence remains available on the dispute.

## Scope and validation

Web participant UI only. Admin adjudication/reversal/on-behalf filing and native screens are not implemented in this branch. Existing auth pages retained; successful login enters Chat. Refresh single-flight remains User-module work; 401 clears session. No live Gateway/account supplied: browser/device and real FE end-to-end acceptance remain outstanding.

npm run check passed: workspace typecheck, ESLint, 23 tests including 4 new adapter boundary regressions, web production build. npm run export:android passed for shared-package compatibility; it does not imply native screens or device acceptance.
