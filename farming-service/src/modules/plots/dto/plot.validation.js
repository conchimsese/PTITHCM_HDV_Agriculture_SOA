const { z } = require('zod');

const createPlotSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must not exceed 100 characters'),
  area: z.coerce.number().positive('Area must be greater than 0'),
  location: z.string().trim().min(1, 'Location is required').max(255, 'Location must not exceed 255 characters'),
  description: z.string().max(1000).nullable().optional(),
  latitude: z.coerce.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  longitude: z.coerce.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180')
});

const updatePlotSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must not exceed 100 characters'),
  area: z.coerce.number().positive('Area must be greater than 0'),
  location: z.string().trim().min(1, 'Location is required').max(255, 'Location must not exceed 255 characters'),
  description: z.string().max(1000).nullable().optional(),
  latitude: z.coerce.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  longitude: z.coerce.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180')
});

const updatePlotVisibilitySchema = z.object({
  isVisible: z.boolean({ required_error: 'isVisible must be a boolean' })
});

const plotIdParamSchema = z.object({
  plotId: z.string().uuid('Invalid plotId format')
});

const listPlotsQuerySchema = z.object({
  page: z.coerce.number().int().min(0, 'Page must be >= 0').default(0),
  size: z.coerce.number().int().min(1, 'Size must be >= 1').max(100, 'Size must not exceed 100').default(20)
});

module.exports = {
  createPlotSchema,
  updatePlotSchema,
  updatePlotVisibilitySchema,
  plotIdParamSchema,
  listPlotsQuerySchema
};
