const { z } = require('zod');

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const amountRegex = /^\d+(\.\d{1,2})?$/;

const createCostSchema = z.object({
  category: z.string().trim().min(1, 'category is required').max(50, 'category must not exceed 50 characters'),
  amount: z.union([z.string(), z.number()]).pipe(
    z.coerce.string().refine(val => amountRegex.test(val) && parseFloat(val) >= 0, {
      message: 'amount must be a valid non-negative decimal'
    })
  ),
  incurredDate: z.string().regex(dateRegex, 'incurredDate must be in format YYYY-MM-DD'),
  description: z.string().max(2000).nullable().optional()
});

// PATCH /api/v1/costs/{costId}: non-empty subset of {category, amount, incurredDate, description}
const updateCostSchema = z.object({
  category: z.string().trim().min(1, 'category cannot be empty').max(50, 'category must not exceed 50 characters').optional(),
  amount: z.union([z.string(), z.number()]).pipe(
    z.coerce.string().refine(val => amountRegex.test(val) && parseFloat(val) >= 0, {
      message: 'amount must be a valid non-negative decimal'
    })
  ).optional(),
  incurredDate: z.string().regex(dateRegex, 'incurredDate must be in format YYYY-MM-DD').optional(),
  description: z.string().max(2000).nullable().optional()
}).strict({
  message: 'Extra or forbidden fields are not allowed in update'
}).refine(data => Object.keys(data).length > 0, {
  message: 'Update body cannot be empty'
});

const updateCostVisibilitySchema = z.object({
  isVisible: z.boolean({ required_error: 'isVisible must be a boolean' })
});

const costIdParamSchema = z.object({
  costId: z.string().uuid('Invalid costId format')
});

module.exports = {
  createCostSchema,
  updateCostSchema,
  updateCostVisibilitySchema,
  costIdParamSchema
};
