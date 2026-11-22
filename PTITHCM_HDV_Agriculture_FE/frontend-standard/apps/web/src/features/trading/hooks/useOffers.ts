import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OfferDTO, OfferFilterQuery, Page } from '@agri/contracts';
import { tradingApi } from '../../../shared/api/runtime';

/**
 * Hook to fetch paginated offers with filtering
 */
export function useOffers(query: OfferFilterQuery = {}) {
  return useQuery<Page<OfferDTO>, Error>({
    queryKey: ['offers', query],
    queryFn: ({ signal }) => tradingApi.listOffers(query, signal),
  });
}

/**
 * Hook to accept an offer (Farmer action)
 */
export function useAcceptOffer() {
  const queryClient = useQueryClient();

  return useMutation<OfferDTO, Error, string>({
    mutationFn: async (offerId: string) => {
      return tradingApi.acceptOffer(offerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing'] });
    },
  });
}

/**
 * Hook to reject an offer (Farmer action)
 */
export function useRejectOffer() {
  const queryClient = useQueryClient();

  return useMutation<OfferDTO, Error, string>({
    mutationFn: async (offerId: string) => {
      return tradingApi.rejectOffer(offerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
    },
  });
}

/**
 * Hook to cancel an offer (Trader action)
 */
export function useCancelOffer() {
  const queryClient = useQueryClient();

  return useMutation<OfferDTO, Error, string>({
    mutationFn: async (offerId: string) => {
      return tradingApi.cancelOffer(offerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
    },
  });
}
