import { describe, it, expect, vi } from 'vitest';
import {
  listingDtoSchema,
  offerDtoSchema,
  pagedListingSchema,
  pagedOfferSchema,
} from '@agri/contracts';
import { createApiClient } from './http';
import { createTradingApi } from './trading';
import { mockTradingApi } from './mock';

describe('Trading Service Contracts & API Adapters (contract.md v1.0.0)', () => {
  describe('Listing Endpoints (GET /api/v1/listings, POST /api/v1/listings, GET /api/v1/listings/:id)', () => {
    it('returns paginated listings matching pagedListingSchema', async () => {
      const res = await mockTradingApi.getListings({ page: 0, size: 2 });
      expect(pagedListingSchema.safeParse(res).success).toBe(true);
      expect(res.items.length).toBeLessThanOrEqual(2);
      expect(res.page).toBe(0);
      expect(res.totalElements).toBeGreaterThan(0);
    });

    it('filters listings by status and farmerId', async () => {
      const openOnly = await mockTradingApi.getListings({ status: 'OPEN' });
      expect(openOnly.items.every((item) => item.status === 'OPEN')).toBe(true);

      const farmerListings = await mockTradingApi.getListings({
        farmerId: '11111111-1111-4111-8111-111111111111',
      });
      expect(
        farmerListings.items.every(
          (item) => item.farmerId === '11111111-1111-4111-8111-111111111111',
        ),
      ).toBe(true);
    });

    it('sorts listings by proximity when latitude and longitude are supplied', async () => {
      const sorted = await mockTradingApi.getListings({
        latitude: 10.125,
        longitude: 106.45,
      });
      expect(sorted.items[0].latitude).toBe(10.125);
      expect(sorted.items[0].longitude).toBe(106.45);
    });

    it('fetches listing detail and unwraps single-resource envelope', async () => {
      const detail = await mockTradingApi.getListingDetail('44444444-4444-4444-8444-444444444444');
      expect(listingDtoSchema.safeParse(detail).success).toBe(true);
      expect(detail.listingId).toBe('44444444-4444-4444-8444-444444444444');
      expect(detail.status).toBe('OPEN');
    });

    it('uploads produce pictures (1 to 5 images) via multipart form data', async () => {
      const dummyFile1 = new File(['fake-image-bytes-1'], 'produce1.jpg', { type: 'image/jpeg' });
      const dummyFile2 = new File(['fake-image-bytes-2'], 'produce2.png', { type: 'image/png' });
      const urls = await mockTradingApi.uploadImages([dummyFile1, dummyFile2]);
      expect(urls.length).toBe(2);
      expect(typeof urls[0]).toBe('string');

      // Rejects empty image array
      await expect(mockTradingApi.uploadImages([])).rejects.toThrow();

      // Rejects > 5 images
      const sixFiles = Array.from(
        { length: 6 },
        (_, i) => new File(['bytes'], `img${i}.jpg`, { type: 'image/jpeg' }),
      );
      await expect(mockTradingApi.uploadImages(sixFiles)).rejects.toThrow();
    });

    it('creates listing with 201 direct ListingDTO response', async () => {
      const newListing = await mockTradingApi.createListing({
        plotId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        cropSeasonId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        expectedPrice: '4500000.00',
        images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'],
      });
      expect(listingDtoSchema.safeParse(newListing).success).toBe(true);
      expect(newListing.status).toBe('OPEN');
      expect(newListing.expectedPrice).toBe('4500000.00');
      expect(newListing.images.length).toBe(1);
    });

    it('rejects invalid create listing payload before sending request', async () => {
      const fetchImpl = vi.fn<typeof fetch>();
      const api = createTradingApi(
        createApiClient({ baseUrl: '', getAccessToken: () => undefined, fetchImpl }),
      );

      // Invalid plotId (not UUID)
      await expect(
        api.createListing({
          plotId: 'not-a-uuid',
          cropSeasonId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          expectedPrice: '4500000.00',
          images: ['https://example.com/1.jpg'],
        }),
      ).rejects.toThrow();

      // Invalid price (not decimal string)
      await expect(
        api.createListing({
          plotId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          cropSeasonId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          expectedPrice: 'invalid-price',
          images: ['https://example.com/1.jpg'],
        }),
      ).rejects.toThrow();

      // Missing images (must have at least 1)
      await expect(
        api.createListing({
          plotId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          cropSeasonId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          expectedPrice: '4500000.00',
          images: [],
        }),
      ).rejects.toThrow();

      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });

  describe('Offer Endpoints (POST /api/v1/offers, POST /api/v1/offers/:id/accept, GET /api/v1/offers)', () => {
    it('creates an offer with 201 direct OfferDTO response, custom offeredPrice, and PENDING status', async () => {
      const offer = await mockTradingApi.createOffer({
        listingId: '44444444-4444-4444-8444-444444444444',
        offeredPrice: '4300000.00',
      });
      expect(offerDtoSchema.safeParse(offer).success).toBe(true);
      expect(offer.status).toBe('PENDING');
      expect(offer.offeredPrice).toBe('4300000.00');
      expect(offer.depositAmount).toBe('0.00');
    });

    it('accepts an offer, transitioning status to ACCEPTED', async () => {
      const accepted = await mockTradingApi.acceptOffer('0193132e-5000-7000-8000-000000000001');
      expect(accepted.status).toBe('ACCEPTED');
      expect(offerDtoSchema.safeParse(accepted).success).toBe(true);
    });

    it('rejects a pending offer by farmer, transitioning status to REJECTED', async () => {
      const rejected = await mockTradingApi.rejectOffer('0193132e-5000-7000-8000-000000000003');
      expect(rejected.status).toBe('REJECTED');
      expect(offerDtoSchema.safeParse(rejected).success).toBe(true);
    });

    it('cancels a pending offer by trader, transitioning status to CANCELLED', async () => {
      const freshOffer = await mockTradingApi.createOffer({
        listingId: '44444444-4444-4444-8444-444444444444',
        offeredPrice: '4100000.00',
      });
      const cancelled = await mockTradingApi.cancelOffer(freshOffer.offerId);
      expect(cancelled.status).toBe('CANCELLED');
    });

    it('prevents rejecting or cancelling an accepted offer', async () => {
      await expect(
        mockTradingApi.rejectOffer('0193132e-5000-7000-8000-000000000002'),
      ).rejects.toThrow();
      await expect(
        mockTradingApi.cancelOffer('0193132e-5000-7000-8000-000000000002'),
      ).rejects.toThrow();
    });

    it('lists offers with pagedOfferSchema format and filters by listingId', async () => {
      const offers = await mockTradingApi.listOffers({
        listingId: '44444444-4444-4444-8444-444444444444',
      });
      expect(pagedOfferSchema.safeParse(offers).success).toBe(true);
      expect(
        offers.items.every((item) => item.listingId === '44444444-4444-4444-8444-444444444444'),
      ).toBe(true);
    });
  });

  describe('HTTP Adapter & Gateway Serialization', () => {
    it('sends correct query parameters and Idempotency-Key header on creation', async () => {
      const fakeCreatedListing = {
        listingId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        farmerId: '4a72d3e1-2f3b-48d6-95f3-f5c225381180',
        plotId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        cropSeasonId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        seedType: 'Jasmine Rice',
        estimatedYield: 5000,
        area: 10000,
        latitude: 10.762622,
        longitude: 106.660172,
        expectedPrice: '4500000.00',
        images: ['https://example.com/produce.jpg'],
        status: 'OPEN',
      };

      const fetchImpl = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json(fakeCreatedListing, { status: 201 }));

      const api = createTradingApi(
        createApiClient({
          baseUrl: 'https://gateway.example.test',
          getAccessToken: () => 'valid-jwt-token',
          fetchImpl,
        }),
      );

      const res = await api.createListing(
        {
          plotId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          cropSeasonId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          expectedPrice: '4500000.00',
          images: ['https://example.com/produce.jpg'],
        },
        'idempotency-uuid-1234',
      );

      expect(res.listingId).toBe('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      const call = fetchImpl.mock.calls[0];
      expect(call[0]).toBe('https://gateway.example.test/api/v1/listings');
      const reqInit = call[1] as RequestInit;
      expect(reqInit.method).toBe('POST');
      expect((reqInit.headers as Record<string, string>)['Idempotency-Key']).toBe(
        'idempotency-uuid-1234',
      );
      expect((reqInit.headers as Record<string, string>).Authorization).toBe(
        'Bearer valid-jwt-token',
      );
    });

    it('unwraps single response envelope for acceptOffer', async () => {
      const fakeOfferResponse = {
        data: {
          offerId: '5f1a329d-ef81-4f1c-99f5-4f7f6a73c091',
          listingId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
          farmerId: '4a72d3e1-2f3b-48d6-95f3-f5c225381180',
          traderId: '8b3f2c5d-91b4-4e78-9e54-5d9c223a7891',
          offeredPrice: '4200000.00',
          depositAmount: '0.00',
          status: 'ACCEPTED',
          createdAt: '2026-11-09T08:35:00.000Z',
          updatedAt: '2026-11-09T08:40:00.000Z',
        },
      };

      const fetchImpl = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json(fakeOfferResponse, { status: 200 }));

      const api = createTradingApi(
        createApiClient({
          baseUrl: 'https://gateway.example.test',
          getAccessToken: () => 'token',
          fetchImpl,
        }),
      );

      const offer = await api.acceptOffer('5f1a329d-ef81-4f1c-99f5-4f7f6a73c091');
      expect(offer.offerId).toBe('5f1a329d-ef81-4f1c-99f5-4f7f6a73c091');
      expect(offer.status).toBe('ACCEPTED');
      expect(fetchImpl.mock.calls[0][0]).toBe(
        'https://gateway.example.test/api/v1/offers/5f1a329d-ef81-4f1c-99f5-4f7f6a73c091/accept',
      );
    });
  });
});
