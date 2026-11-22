const { z } = require('zod');

const WORK_TYPES = [
  'LAND_PREPARATION',
  'PLANTING',
  'PEST_CONTROL',
  'WATERING',
  'FERTILIZING',
  'HARVESTING'
];

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createFarmingLogSchema = z.object({
  workType: z.enum(WORK_TYPES, {
    errorMap: () => ({ message: `workType must be one of: ${WORK_TYPES.join(', ')}` })
  }),
  workDate: z.string().regex(dateRegex, 'workDate must be in format YYYY-MM-DD'),
  description: z.string().max(2000).nullable().optional(),
  quantity: z.coerce.number().min(0, 'quantity must be >= 0').nullable().optional(),
  unit: z.string().max(20, 'unit must not exceed 20 characters').nullable().optional()
});

// PATCH /api/v1/logs/{logId}: non-empty subset of allowlist, description: null to clear, other fields cannot be null
const updateFarmingLogSchema = z.object({
  workType: z.enum(WORK_TYPES, {
    errorMap: () => ({ message: `workType must be one of: ${WORK_TYPES.join(', ')}` })
  }).optional(),
  workDate: z.string().regex(dateRegex, 'workDate must be in format YYYY-MM-DD').optional(),
  description: z.string().max(2000).nullable().optional(),
  quantity: z.coerce.number().min(0, 'quantity must be >= 0').optional(),
  unit: z.string().max(20, 'unit must not exceed 20 characters').optional()
}).strict({
  message: 'Extra or forbidden fields are not allowed in update'
}).refine(data => Object.keys(data).length > 0, {
  message: 'Update body cannot be empty'
});

const updateLogVisibilitySchema = z.object({
  isVisible: z.boolean({ required_error: 'isVisible must be a boolean' })
});

const logIdParamSchema = z.object({
  logId: z.string().uuid('Invalid logId format')
});

module.exports = {
  WORK_TYPES,
  createFarmingLogSchema,
  updateFarmingLogSchema,
  updateLogVisibilitySchema,
  logIdParamSchema
};
