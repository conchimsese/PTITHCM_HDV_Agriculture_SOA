const { z } = require('zod');

const plotSummaryQuerySchema = z.object({
  cropSeasonId: z.string({ required_error: 'cropSeasonId query parameter is required' }).uuid('cropSeasonId must be a valid UUID')
});

module.exports = {
  plotSummaryQuerySchema
};
