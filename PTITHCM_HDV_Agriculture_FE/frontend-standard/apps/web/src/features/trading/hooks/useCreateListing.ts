import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { CreateListingRequest, ListingDTO } from '@agri/contracts';
import { tradingApi } from '../../../shared/api/runtime';

export function useCreateListing() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<ListingDTO, Error, CreateListingRequest>({
    mutationFn: async (payload) => {
      const idempotencyKey = crypto.randomUUID();
      return tradingApi.createListing(payload, idempotencyKey);
    },
    onSuccess: (newListing) => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      navigate(`/bai-dang/${newListing.listingId}`, {
        state: { createdSuccess: true },
      });
    },
  });
}
