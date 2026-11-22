import { useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession, setSession, subscribeSession } from '@agri/api-client';
import type { Role, Session } from '@agri/contracts';
import { authApi, queryClient } from '../api/runtime';

/**
 * Reactive hook to access the current session from RAM store
 */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribeSession, getSession);
}

/**
 * Access the current role of the authenticated user
 */
export function useRole(): Role | null {
  const session = useSession();
  return session?.role ?? null;
}

/**
 * Hook to perform logout and clear active session
 */
export function useLogout() {
  const navigate = useNavigate();
  const session = useSession();

  return async () => {
    try {
      if (session?.tokens?.refreshToken) {
        await authApi.logout(session.tokens.refreshToken);
      }
    } catch {
      // Even if server-side logout fails, clear local memory session
    } finally {
      setSession(null);
      queryClient.clear();
      navigate('/dang-nhap', { replace: true });
    }
  };
}
