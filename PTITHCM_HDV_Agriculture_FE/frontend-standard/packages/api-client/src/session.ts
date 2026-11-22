import type { Session, TokenPair, Role } from '@agri/contracts';
let session: Session | null = null;
const listeners = new Set<() => void>();
export const getSession = () => session;
export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function setSession(next: Session | null) {
  session = next;
  for (const listener of listeners) listener();
}
export function setTokenPair(tokens: TokenPair) {
  setSession({ accountId: tokens.accountId, role: tokens.role, tokens, isDemo: false });
}
export function createDemoSession(role: Role): Session {
  const ids: Record<Role, string> = {
    FARMER: '11111111-1111-4111-8111-111111111111',
    TRADER: '22222222-2222-4222-8222-222222222222',
    ADMIN: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  };
  return { accountId: ids[role], role, tokens: null, isDemo: true };
}
