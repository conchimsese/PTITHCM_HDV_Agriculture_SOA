import {
  createListingRequestSchema,
  createOfferRequestSchema,
  feedParamsSchema,
  listingFilterQuerySchema,
  offerFilterQuerySchema,
  type CreateListingRequest,
  type CreateOfferRequest,
  type FeedParams,
  type ListingDTO,
  type ListingFeedItem,
  type ListingFilterQuery,
  type OfferDTO,
  type OfferFilterQuery,
  type Page,
} from '@agri/contracts';
import type { TradingApi } from './trading';
import { ApiError } from './http';

const radians = (n: number) => (n * Math.PI) / 180;
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const a =
    Math.sin(radians(lat2 - lat1) / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

const mockListings: ListingDTO[] = [
  {
    listingId: '44444444-4444-4444-8444-444444444444',
    farmerId: '11111111-1111-4111-8111-111111111111',
    plotId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    cropSeasonId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    seedType: 'ST25 Lúa Thơm',
    estimatedYield: 5000,
    area: 12000,
    latitude: 10.125,
    longitude: 106.45,
    expectedPrice: '4500000.00',
    images: [
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'OPEN',
  },
  {
    listingId: '55555555-5555-4555-8555-555555555555',
    farmerId: '66666666-6666-4666-8666-666666666666',
    plotId: '3fa85f64-5717-4562-b3fc-2c963f66afa7',
    cropSeasonId: '7c9e6679-7425-40de-944b-e07fc1f90ae8',
    seedType: 'OM18',
    estimatedYield: 6000,
    area: 15000,
    latitude: 10.195,
    longitude: 106.512,
    expectedPrice: '3800000.00',
    images: [
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'OPEN',
  },
  {
    listingId: '77777777-7777-4777-8777-777777777777',
    farmerId: '88888888-8888-4888-8888-888888888888',
    plotId: '3fa85f64-5717-4562-b3fc-2c963f66afa8',
    cropSeasonId: '7c9e6679-7425-40de-944b-e07fc1f90ae9',
    seedType: 'Đài Thơm 8',
    estimatedYield: 4500,
    area: 10000,
    latitude: 10.32,
    longitude: 106.61,
    expectedPrice: '4200000.00',
    images: [
      'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'OPEN',
  },
  {
    listingId: '88888888-8888-4888-8888-888888888888',
    farmerId: '11111111-1111-4111-8111-111111111111',
    plotId: '3fa85f64-5717-4562-b3fc-2c963f66afa9',
    cropSeasonId: '7c9e6679-7425-40de-944b-e07fc1f90aea',
    seedType: 'Jasmine 85',
    estimatedYield: 7000,
    area: 18000,
    latitude: 10.762,
    longitude: 106.66,
    expectedPrice: '5200000.00',
    images: [
      'https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'LOCKED',
  },
];

const mockOffers: OfferDTO[] = [
  {
    offerId: '0193132e-5000-7000-8000-000000000001',
    listingId: '44444444-4444-4444-8444-444444444444',
    farmerId: '11111111-1111-4111-8111-111111111111',
    traderId: '22222222-2222-4222-8222-222222222222',
    offeredPrice: '4400000.00',
    depositAmount: '0.00',
    status: 'PENDING',
    createdAt: '2026-11-09T08:00:00.000Z',
    updatedAt: '2026-11-09T08:00:00.000Z',
  },
  {
    offerId: '0193132e-5000-7000-8000-000000000002',
    listingId: '88888888-8888-4888-8888-888888888888',
    farmerId: '11111111-1111-4111-8111-111111111111',
    traderId: '22222222-2222-4222-8222-222222222222',
    offeredPrice: '5200000.00',
    depositAmount: '260000.00',
    status: 'ACCEPTED',
    createdAt: '2026-11-08T10:00:00.000Z',
    updatedAt: '2026-11-08T11:00:00.000Z',
  },
  {
    offerId: '0193132e-5000-7000-8000-000000000003',
    listingId: '44444444-4444-4444-8444-444444444444',
    farmerId: '11111111-1111-4111-8111-111111111111',
    traderId: '33333333-3333-4333-8333-333333333333',
    offeredPrice: '4600000.00',
    depositAmount: '0.00',
    status: 'PENDING',
    createdAt: '2026-11-09T09:15:00.000Z',
    updatedAt: '2026-11-09T09:15:00.000Z',
  },
];

export const resetMockTradingData = () => {
  // Can be called in tests if needed
};

export const mockTradingApi: TradingApi = {
  async uploadImages(files: File[], signal?: AbortSignal): Promise<string[]> {
    signal?.throwIfAborted();
    if (!files || files.length === 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Phải có ít nhất 1 ảnh chụp nông sản.');
    }
    if (files.length > 5) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Tối đa 5 ảnh chụp nông sản.');
    }
    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) {
        throw new ApiError(413, 'PAYLOAD_TOO_LARGE', `Ảnh ${f.name} vượt quá giới hạn 5 MiB.`);
      }
    }
    return files.map((file, idx) => {
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        try {
          return URL.createObjectURL(file);
        } catch {
          // fallback
        }
      }
      return `https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80&idx=${idx}`;
    });
  },

  async createListing(payload: CreateListingRequest): Promise<ListingDTO> {
    const valid = createListingRequestSchema.parse(payload);
    const newListing: ListingDTO = {
      listingId:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      farmerId: '11111111-1111-4111-8111-111111111111',
      plotId: valid.plotId,
      cropSeasonId: valid.cropSeasonId,
      seedType: 'ST25 Fragrant Rice',
      estimatedYield: 5000,
      area: 12000,
      latitude: 10.762622,
      longitude: 106.660172,
      expectedPrice: valid.expectedPrice,
      images:
        valid.images && valid.images.length > 0
          ? valid.images
          : [
              'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
            ],
      status: 'OPEN',
    };
    mockListings.unshift(newListing);
    return newListing;
  },

  async getListings(
    params: ListingFilterQuery = {},
    signal?: AbortSignal,
  ): Promise<Page<ListingDTO>> {
    const valid = listingFilterQuerySchema.parse(params);
    signal?.throwIfAborted();
    let result = [...mockListings];

    if (valid.status) {
      result = result.filter((item) => item.status === valid.status);
    }
    if (valid.seedType) {
      const q = valid.seedType.toLowerCase();
      result = result.filter((item) => item.seedType.toLowerCase().includes(q));
    }
    if (valid.farmerId) {
      result = result.filter((item) => item.farmerId === valid.farmerId);
    }

    if (valid.latitude !== undefined && valid.longitude !== undefined) {
      const lat = valid.latitude;
      const lng = valid.longitude;
      result = result.sort((a, b) => {
        const distA = haversineDistance(lat, lng, a.latitude, a.longitude);
        const distB = haversineDistance(lat, lng, b.latitude, b.longitude);
        return distA - distB || a.listingId.localeCompare(b.listingId);
      });
    }

    const page = valid.page ?? 0;
    const size = valid.size ?? 20;
    const startIndex = page * size;
    const items = result.slice(startIndex, startIndex + size);

    return {
      items,
      page,
      size,
      totalElements: result.length,
      totalPages: Math.ceil(result.length / size) || 0,
    };
  },

  async getListingDetail(listingId: string, signal?: AbortSignal): Promise<ListingDTO> {
    signal?.throwIfAborted();
    const found = mockListings.find((item) => item.listingId === listingId);
    if (!found) {
      throw new ApiError(404, 'LISTING_NOT_FOUND', 'Không tìm thấy bài đăng');
    }
    return found;
  },

  async createOffer(payload: CreateOfferRequest): Promise<OfferDTO> {
    const valid = createOfferRequestSchema.parse(payload);
    const listing = mockListings.find((item) => item.listingId === valid.listingId);
    if (!listing) {
      throw new ApiError(404, 'LISTING_NOT_FOUND', 'Không tìm thấy bài đăng để gửi báo giá');
    }
    if (listing.status !== 'OPEN') {
      throw new ApiError(409, 'LISTING_NOT_OPEN', 'Bài đăng hiện không mở nhận báo giá');
    }

    const newOffer: OfferDTO = {
      offerId:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : '5f1a329d-ef81-4f1c-99f5-4f7f6a73c091',
      listingId: valid.listingId,
      farmerId: listing.farmerId,
      traderId: '22222222-2222-4222-8222-222222222222',
      offeredPrice: valid.offeredPrice || listing.expectedPrice,
      depositAmount: '0.00',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockOffers.unshift(newOffer);
    return newOffer;
  },

  async acceptOffer(offerId: string, signal?: AbortSignal): Promise<OfferDTO> {
    signal?.throwIfAborted();
    const found = mockOffers.find((item) => item.offerId === offerId);
    if (!found) {
      throw new ApiError(404, 'OFFER_NOT_FOUND', 'Không tìm thấy báo giá');
    }
    found.status = 'ACCEPTED';
    found.updatedAt = new Date().toISOString();
    return found;
  },

  async rejectOffer(offerId: string, signal?: AbortSignal): Promise<OfferDTO> {
    signal?.throwIfAborted();
    const found = mockOffers.find((item) => item.offerId === offerId);
    if (!found) {
      throw new ApiError(404, 'OFFER_NOT_FOUND', 'Không tìm thấy báo giá');
    }
    if (found.status === 'ACCEPTED') {
      throw new ApiError(
        400,
        'INVALID_STATE_TRANSITION',
        'Báo giá đã được chấp thuận, không thể từ chối',
      );
    }
    found.status = 'REJECTED';
    found.updatedAt = new Date().toISOString();
    return found;
  },

  async cancelOffer(offerId: string, signal?: AbortSignal): Promise<OfferDTO> {
    signal?.throwIfAborted();
    const found = mockOffers.find((item) => item.offerId === offerId);
    if (!found) {
      throw new ApiError(404, 'OFFER_NOT_FOUND', 'Không tìm thấy báo giá');
    }
    if (found.status === 'ACCEPTED') {
      throw new ApiError(
        400,
        'INVALID_STATE_TRANSITION',
        'Báo giá đã được chấp thuận, không thể hủy bỏ',
      );
    }
    found.status = 'CANCELLED';
    found.updatedAt = new Date().toISOString();
    return found;
  },

  async getOfferDetail(offerId: string, signal?: AbortSignal): Promise<OfferDTO> {
    signal?.throwIfAborted();
    const found = mockOffers.find((item) => item.offerId === offerId);
    if (!found) {
      throw new ApiError(404, 'OFFER_NOT_FOUND', 'Không tìm thấy báo giá');
    }
    return found;
  },

  async listOffers(params: OfferFilterQuery = {}, signal?: AbortSignal): Promise<Page<OfferDTO>> {
    const valid = offerFilterQuerySchema.parse(params);
    signal?.throwIfAborted();
    let result = [...mockOffers];

    if (valid.listingId) {
      result = result.filter((item) => item.listingId === valid.listingId);
    }
    if (valid.status) {
      result = result.filter((item) => item.status === valid.status);
    }
    if (valid.farmerId) {
      result = result.filter((item) => item.farmerId === valid.farmerId);
    }
    if (valid.traderId) {
      result = result.filter((item) => item.traderId === valid.traderId);
    }

    const page = valid.page ?? 0;
    const size = valid.size ?? 20;
    const startIndex = page * size;
    const items = result.slice(startIndex, startIndex + size);

    return {
      items,
      page,
      size,
      totalElements: result.length,
      totalPages: Math.ceil(result.length / size) || 0,
    };
  },

  async getFeed(params: FeedParams, signal?: AbortSignal): Promise<Page<ListingFeedItem>> {
    feedParamsSchema.parse(params);
    signal?.throwIfAborted();
    const legacyRows: ListingFeedItem[] = mockListings.map((l) => ({
      listingId: l.listingId,
      seedType: l.seedType,
      plotLat: l.latitude,
      plotLng: l.longitude,
      distanceKm: haversineDistance(params.lat, params.lng, l.latitude, l.longitude),
      farmer: { farmerId: l.farmerId, fullName: 'Nông dân' },
    }));

    const filtered = legacyRows
      .filter((row) => row.distanceKm <= params.radius)
      .sort((a, b) => a.distanceKm - b.distanceKm || a.listingId.localeCompare(b.listingId));

    return {
      items: filtered.slice(params.page * params.size, (params.page + 1) * params.size),
      page: params.page,
      size: params.size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / params.size) || 0,
    };
  },
};
