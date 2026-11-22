import {
  tokenPairSchema,
  type LoginRequest,
  type RegisterRequest,
  type RegisterResponse,
} from '@agri/contracts';
import type { ApiClient } from './http';
export const createAuthApi = (http: ApiClient) => ({
  register: (body: RegisterRequest) =>
    http.request<RegisterResponse>('/api/v1/auth/register', { method: 'POST', body, auth: false }),
  verifyEmail: (email: string, otp: string) =>
    http.request('/api/v1/auth/verify-email', {
      method: 'POST',
      body: { email, otp },
      auth: false,
    }),
  resendVerification: (email: string) =>
    http.request('/api/v1/auth/resend-verification', {
      method: 'POST',
      body: { email },
      auth: false,
    }),
  login: (body: LoginRequest) =>
    http.request('/api/v1/auth/login', {
      method: 'POST',
      body,
      auth: false,
      schema: tokenPairSchema,
    }),
  logout: (refreshToken: string) =>
    http.request('/api/v1/auth/logout', {
      method: 'POST',
      body: { refreshToken },
    }),
});
// Baseline hiện trả về login khi 401. Refresh single-flight là công việc trong docs/06.
