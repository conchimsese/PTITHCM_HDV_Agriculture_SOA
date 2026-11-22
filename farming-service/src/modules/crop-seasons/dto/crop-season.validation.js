const { z } = require('zod');

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createCropSeasonSchema = z.object({
  seasonName: z.string().trim().min(1, 'seasonName is required').max(100, 'seasonName must not exceed 100 characters'),
  startDate: z.string().regex(dateRegex, 'startDate must be in format YYYY-MM-DD'),
  expectedYield: z.coerce.number().min(0, 'expectedYield must be >= 0').nullable().optional(),
  cropType: z.string().trim().min(1, 'cropType is required and cannot be blank').max(100, 'cropType must not exceed 100 characters')
});

const updateCropSeasonSchema = z.object({
  seasonName: z.string().trim().min(1, 'seasonName is required').max(100, 'seasonName must not exceed 100 characters'),
  startDate: z.string().regex(dateRegex, 'startDate must be in format YYYY-MM-DD'),
  expectedYield: z.coerce.number().min(0, 'expectedYield must be >= 0').nullable().optional(),
  cropType: z.string().trim().min(1, 'cropType cannot be blank').max(100, 'cropType must not exceed 100 characters')
});

const completeCropSeasonSchema = z.object({
  actualYield: z.coerce.number().min(0, 'actualYield must be >= 0')
});

const cropSeasonIdParamSchema = z.object({
  cropSeasonId: z.string().uuid('Invalid cropSeasonId format')
});

const plotIdParamSchema = z.object({
  plotId: z.string().uuid('Invalid plotId format')
});

module.exports = {
  createCropSeasonSchema,
  updateCropSeasonSchema,
  completeCropSeasonSchema,
  cropSeasonIdParamSchema,
  plotIdParamSchema
};
