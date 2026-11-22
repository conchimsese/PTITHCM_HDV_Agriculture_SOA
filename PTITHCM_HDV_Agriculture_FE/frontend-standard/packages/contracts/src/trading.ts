import { z } from 'zod';
import { decimalMoneySchema, pageSchema } from './common';

// ─── Enums & Statuses ─────────────────────────────────────────────

export const listingStatusSchema = z.enum(['OPEN', 'LOCKED', 'SOLD']);
export type ListingStatus = z.infer<typeof listingStatusSchema>;

export const offerStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED']);
export type OfferStatus = z.infer<typeof offerStatusSchema>;

// ─── Listing Schemas & Types ─────────────────────────────────────

export const listingDtoSchema = z.object({
  listingId: z.string().uuid(),
  farmerId: z.string().uuid(),
  plotId: z.string().uuid(),
  cropSeasonId: z.string().uuid(),
  seedType: z.string().min(1),
  estimatedYield: z.number().nonnegative(), // in kg
  area: z.number().positive(), // in m²
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  expectedPrice: decimalMoneySchema, // positive decimal string in VND
  images: z.array(z.string()).default([]), // 1 to 5 picture URLs
  status: listingStatusSchema,
});
export type ListingDTO = z.infer<typeof listingDtoSchema>;

export const createListingRequestSchema = z.object({
  plotId: z.string().uuid(),
  cropSeasonId: z.string().uuid(),
  expectedPrice: decimalMoneySchema,
  images: z.array(z.string()).min(1, 'Tối thiểu 1 hình ảnh').max(5, 'Tối đa 5 hình ảnh'),
});
export type CreateListingRequest = z.infer<typeof createListingRequestSchema>;

export const uploadImagesResponseSchema = z.object({
  urls: z.array(z.string()),
  count: z.number().int().nonnegative(),
});
export type UploadImagesResponse = z.infer<typeof uploadImagesResponseSchema>;

export const listingFilterQuerySchema = z.object({
  page: z.number().int().nonnegative().optional(),
  size: z.number().int().min(1).max(100).optional(),
  status: listingStatusSchema.optional(),
  seedType: z.string().optional(),
  farmerId: z.string().uuid().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export type ListingFilterQuery = z.infer<typeof listingFilterQuerySchema>;

export const pagedListingSchema = pageSchema(listingDtoSchema);

// ─── Offer Schemas & Types ───────────────────────────────────────

export const offerDtoSchema = z.object({
  offerId: z.string().uuid(),
  listingId: z.string().uuid(),
  farmerId: z.string().uuid(),
  traderId: z.string().uuid(),
  offeredPrice: decimalMoneySchema, // in VND (decimal string), e.g. "4200000.00"
  depositAmount: decimalMoneySchema, // in VND, starts at "0.00"
  status: offerStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OfferDTO = z.infer<typeof offerDtoSchema>;

export const createOfferRequestSchema = z.object({
  listingId: z.string().uuid(),
  offeredPrice: decimalMoneySchema.optional(), // Optional counter-offer price
});
export type CreateOfferRequest = z.infer<typeof createOfferRequestSchema>;

export const offerFilterQuerySchema = z.object({
  page: z.number().int().nonnegative().optional(),
  size: z.number().int().min(1).max(100).optional(),
  listingId: z.string().uuid().optional(),
  status: offerStatusSchema.optional(),
  farmerId: z.string().uuid().optional(),
  traderId: z.string().uuid().optional(),
});
export type OfferFilterQuery = z.infer<typeof offerFilterQuerySchema>;

export const pagedOfferSchema = pageSchema(offerDtoSchema);

// ─── Legacy Feed Compatibility (v2.1 preview) ───────────────────

export const listingFeedItemSchema = z.object({
  listingId: z.string().uuid(),
  seedType: z.string(),
  plotLat: z.number(),
  plotLng: z.number(),
  distanceKm: z.number().nonnegative(),
  farmer: z.object({ farmerId: z.string().uuid(), fullName: z.string() }),
});
export const listingFeedPageSchema = pageSchema(listingFeedItemSchema);
export type ListingFeedItem = z.infer<typeof listingFeedItemSchema>;

export const feedParamsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().positive(),
  page: z.number().int().nonnegative(),
  size: z.number().int().min(1).max(100),
});
export type FeedParams = z.infer<typeof feedParamsSchema>;
