import { QueryClient } from '@tanstack/react-query';
import {
  createApiClient,
  createAuthApi,
  createTradingApi,
  getSession,
  setSession,
} from '@agri/api-client';
import { env } from '../config/env';
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});
export const http = createApiClient({
  baseUrl: env.gatewayUrl,
  getAccessToken: () => getSession()?.tokens?.accessToken,
  onUnauthorized: () => {
    queryClient.clear();
    setSession(null);
  },
});
export const authApi = createAuthApi(http);
export const tradingApi = createTradingApi(http);
