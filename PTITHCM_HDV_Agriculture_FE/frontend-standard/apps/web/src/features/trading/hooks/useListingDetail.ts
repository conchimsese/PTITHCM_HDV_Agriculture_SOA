import { useQuery } from '@tanstack/react-query';
import type { ListingDTO } from '@agri/contracts';
import { tradingApi } from '../../../shared/api/runtime';

/**
 * Hook to fetch detailed produce listing by ID
 */
export function useListingDetail(listingId?: string) {
  return useQuery<ListingDTO, Error>({
    queryKey: ['listing', listingId],
    queryFn: ({ signal }) => {
      if (!listingId) throw new Error('Mã bài đăng không hợp lệ');
      return tradingApi.getListingDetail(listingId, signal);
    },
    enabled: Boolean(listingId),
  });
}
