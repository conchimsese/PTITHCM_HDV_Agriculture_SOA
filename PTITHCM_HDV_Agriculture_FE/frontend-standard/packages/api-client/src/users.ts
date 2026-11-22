import {
  accountSummarySchema,
  accountsPageSchema,
  privateProfileSchema,
  publicProfileSchema,
  avatarUploadSchema,
  userMediaPath,
  type AccountFilters,
  type AccountStatus,
  type ProfileUpdate,
  type RegisterRequest,
  type RegisterResponse,
} from '@agri/contracts';
import type { ApiClient } from './http';
const accountPath = (id: string) => `/api/v1/admin/accounts/${encodeURIComponent(id)}`;
export const createUsersApi = (http: ApiClient) => ({
  uploadAvatar: (formData: FormData) =>
    http.request('/api/v1/users/me/avatar', {
      method: 'POST',
      formData,
      schema: avatarUploadSchema,
    }),
  avatar: (path: string, signal?: AbortSignal) => {
    if (!userMediaPath(path)) throw new Error('Đường dẫn ảnh đại diện không hợp lệ.');
    return http.request<Blob>(path, { signal, responseType: 'blob' });
  },
  me: (signal?: AbortSignal) =>
    http.request('/api/v1/users/me', { signal, schema: privateProfileSchema }),
  updateMe: (body: ProfileUpdate) =>
    http.request('/api/v1/users/me', { method: 'PUT', body, schema: privateProfileSchema }),
  publicProfile: (id: string, signal?: AbortSignal) =>
    http.request(`/api/v1/users/${encodeURIComponent(id)}`, {
      signal,
      schema: publicProfileSchema,
    }),
  accounts: (filters: AccountFilters, signal?: AbortSignal) => {
    const params = new URLSearchParams({ page: String(filters.page), size: '20' });
    if (filters.role) params.set('role', filters.role);
    if (filters.status) params.set('status', filters.status);
    return http.request(`/api/v1/admin/accounts?${params}`, { signal, schema: accountsPageSchema });
  },
  account: (id: string, signal?: AbortSignal) =>
    http.request(accountPath(id), { signal, schema: privateProfileSchema }),
  createAccount: (body: RegisterRequest) =>
    http.request<RegisterResponse>('/api/v1/admin/accounts', { method: 'POST', body }),
  updateAccount: (id: string, body: ProfileUpdate) =>
    http.request(accountPath(id), { method: 'PATCH', body, schema: privateProfileSchema }),
  setStatus: (id: string, status: Exclude<AccountStatus, 'UNVERIFIED'>, reason: string) =>
    http.request(`${accountPath(id)}/status`, {
      method: 'PATCH',
      body: { status, reason },
      schema: accountSummarySchema,
    }),
  removeAccount: (id: string) => http.request(accountPath(id), { method: 'DELETE' }),
});
