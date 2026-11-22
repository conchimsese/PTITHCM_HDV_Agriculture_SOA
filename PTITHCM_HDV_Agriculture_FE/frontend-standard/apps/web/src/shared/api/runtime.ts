import { QueryClient } from '@tanstack/react-query';
import {
  createApiClient,
  createAuthApi,
  createTradingApi,
  mockTradingApi,
  getSession,
  setSession,
  type TradingApi,
} from '@agri/api-client';
import { env } from '../config/env';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});

export const http = createApiClient({
  baseUrl: env.gatewayUrl,
  getAccessToken: () => getSession()?.tokens?.accessToken,
  onUnauthorized: (sentToken) => {
    if (getSession()?.tokens?.accessToken !== sentToken) return;
    queryClient.clear();
    setSession(null);
  },
});

export const authApi = createAuthApi(http);

const realTradingApi = createTradingApi(http);

export const tradingApi: TradingApi = {
  uploadImages: (files, signal) =>
    getSession()?.isDemo
      ? mockTradingApi.uploadImages(files, signal)
      : realTradingApi.uploadImages(files, signal),
  createListing: (payload, key, signal) =>
    getSession()?.isDemo
      ? mockTradingApi.createListing(payload, key, signal)
      : realTradingApi.createListing(payload, key, signal),
  getListings: (params, signal) =>
    getSession()?.isDemo
      ? mockTradingApi.getListings(params, signal)
      : realTradingApi.getListings(params, signal),
  getListingDetail: (id, signal) =>
    getSession()?.isDemo
      ? mockTradingApi.getListingDetail(id, signal)
      : realTradingApi.getListingDetail(id, signal),
  createOffer: (payload, key, signal) =>
    getSession()?.isDemo
      ? mockTradingApi.createOffer(payload, key, signal)
      : realTradingApi.createOffer(payload, key, signal),
  acceptOffer: (id, signal) =>
    getSession()?.isDemo
      ? mockTradingApi.acceptOffer(id, signal)
      : realTradingApi.acceptOffer(id, signal),
  rejectOffer: (id, signal) =>
    getSession()?.isDemo
      ? mockTradingApi.rejectOffer(id, signal)
      : realTradingApi.rejectOffer(id, signal),
  cancelOffer: (id, signal) =>
    getSession()?.isDemo
      ? mockTradingApi.cancelOffer(id, signal)
      : realTradingApi.cancelOffer(id, signal),
  getOfferDetail: (id, signal) =>
    getSession()?.isDemo
      ? mockTradingApi.getOfferDetail(id, signal)
      : realTradingApi.getOfferDetail(id, signal),
  listOffers: (params, signal) =>
    getSession()?.isDemo
      ? mockTradingApi.listOffers(params, signal)
      : realTradingApi.listOffers(params, signal),
  getFeed: (params, signal) =>
    getSession()?.isDemo
      ? mockTradingApi.getFeed(params, signal)
      : realTradingApi.getFeed(params, signal),
};
