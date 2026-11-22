import { useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUsersApi, getSession, subscribeSession, setSession } from '@agri/api-client';
import type {
  AccountFilters,
  AccountStatus,
  ProfileUpdate,
  RegisterRequest,
} from '@agri/contracts';
import { http, authApi, queryClient } from '../../../shared/api/runtime';

export const usersApi = createUsersApi(http);
export const useSession = () => useSyncExternalStore(subscribeSession, getSession);
export function useMyProfile() {
  const session = useSession();
  return useQuery({
    queryKey: ['users', session?.accountId, 'me'],
    enabled: Boolean(session?.tokens),
    queryFn: ({ signal }) => usersApi.me(signal),
  });
}
export function useSaveProfile(targetId?: string) {
  const session = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileUpdate) =>
      targetId ? usersApi.updateAccount(targetId, body) : usersApi.updateMe(body),
    onSuccess: () => client.invalidateQueries({ queryKey: ['users', session?.accountId] }),
    onError: () => client.invalidateQueries({ queryKey: ['users', session?.accountId] }),
  });
}
export function usePublicProfile(id: string) {
  const session = useSession();
  return useQuery({
    queryKey: ['users', session?.accountId, 'public', id],
    enabled: Boolean(session?.tokens && id),
    queryFn: ({ signal }) => usersApi.publicProfile(id, signal),
  });
}
export function useAccounts(filters: AccountFilters) {
  const session = useSession();
  return useQuery({
    queryKey: ['users', session?.accountId, 'accounts', filters],
    enabled: session?.role === 'ADMIN',
    queryFn: ({ signal }) => usersApi.accounts(filters, signal),
  });
}
export function useAccount(id: string) {
  const session = useSession();
  return useQuery({
    queryKey: ['users', session?.accountId, 'account', id],
    enabled: session?.role === 'ADMIN' && Boolean(id),
    queryFn: ({ signal }) => usersApi.account(id, signal),
  });
}
export function useManageAccount() {
  const session = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (
      action:
        | { id: string; status: Exclude<AccountStatus, 'UNVERIFIED'>; reason: string }
        | { id: string; remove: true }
        | { create: RegisterRequest },
    ) => {
      if ('create' in action) return usersApi.createAccount(action.create);
      if ('remove' in action) return usersApi.removeAccount(action.id);
      return usersApi.setStatus(action.id, action.status, action.reason);
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['users', session?.accountId] }),
  });
}
export async function logoutUser() {
  const tokens = getSession()?.tokens;
  try {
    if (tokens) await authApi.logout(tokens.refreshToken);
  } finally {
    queryClient.clear();
    setSession(null);
  }
}
