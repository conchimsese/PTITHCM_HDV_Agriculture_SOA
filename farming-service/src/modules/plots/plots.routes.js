const express = require('express');
const plotsController = require('./plots.controller');
const cropSeasonsController = require('../crop-seasons/crop-seasons.controller');
const { authenticateToken } = require('../../common/middlewares/auth.middleware');
const { checkAccessState } = require('../../common/middlewares/access-state.middleware');
const { authenticateServiceKey } = require('../../common/middlewares/internal-auth.middleware');
const { validateRequest } = require('../../common/middlewares/validate.middleware');
const {
  createPlotSchema,
  updatePlotSchema,
  updatePlotVisibilitySchema,
  plotIdParamSchema,
  listPlotsQuerySchema
} = require('./dto/plot.validation');
const { createCropSeasonSchema } = require('../crop-seasons/dto/crop-season.validation');
const { plotSummaryQuerySchema } = require('./dto/plot-summary.validation');

const router = express.Router();

// 6.18 Trading -> Farming: Get Plot Summary
// Note: Internal service call, protected by X-Service-Key, placed before router-level FARMER JWT middleware
router.get(
  '/:plotId/summary',
  authenticateServiceKey,
  validateRequest({ params: plotIdParamSchema, query: plotSummaryQuerySchema }),
  plotsController.getSummary
);

// All user-facing plots routes require FARMER authentication and active account state
router.use(authenticateToken(['FARMER']));
router.use(checkAccessState);

// 6.1 Create Plot: POST /api/v1/plots
router.post(
  '/',
  validateRequest({ body: createPlotSchema }),
  plotsController.create
);

// 6.2 Get Farmer's Plots: GET /api/v1/plots
router.get(
  '/',
  validateRequest({ query: listPlotsQuerySchema }),
  plotsController.getAll
);

// 6.3 Get Plot Detail: GET /api/v1/plots/{plotId}
router.get(
  '/:plotId',
  validateRequest({ params: plotIdParamSchema }),
  plotsController.getById
);

// 6.4 Update Plot: PUT /api/v1/plots/{plotId}
router.put(
  '/:plotId',
  validateRequest({ params: plotIdParamSchema, body: updatePlotSchema }),
  plotsController.update
);

// 6.5 Hide/Show Plot: PATCH /api/v1/plots/{plotId}/visibility
router.patch(
  '/:plotId/visibility',
  validateRequest({ params: plotIdParamSchema, body: updatePlotVisibilitySchema }),
  plotsController.updateVisibility
);

// 6.6 Create Crop Season on Plot: POST /api/v1/plots/{plotId}/crop-seasons
router.get(
  '/:plotId/crop-seasons',
  validateRequest({ params: plotIdParamSchema }),
  cropSeasonsController.listForPlot
);

router.post(
  '/:plotId/crop-seasons',
  validateRequest({ params: plotIdParamSchema, body: createCropSeasonSchema }),
  cropSeasonsController.create
);

module.exports = router;
