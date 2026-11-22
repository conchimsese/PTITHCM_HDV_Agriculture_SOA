const express = require('express');
const cropSeasonsController = require('./crop-seasons.controller');
const farmingLogsController = require('../farming-logs/farming-logs.controller');
const costsController = require('../costs/costs.controller');
const reportsController = require('../reports/reports.controller');
const { authenticateToken } = require('../../common/middlewares/auth.middleware');
const { checkAccessState } = require('../../common/middlewares/access-state.middleware');
const { validateRequest } = require('../../common/middlewares/validate.middleware');
const {
  updateCropSeasonSchema,
  completeCropSeasonSchema,
  cropSeasonIdParamSchema
} = require('./dto/crop-season.validation');
const { createFarmingLogSchema } = require('../farming-logs/dto/farming-log.validation');
const { createCostSchema } = require('../costs/dto/cost.validation');

const router = express.Router();

// All crop seasons routes require FARMER authentication and active account state
router.use(authenticateToken(['FARMER']));
router.use(checkAccessState);

// 6.7 Get Crop Season Detail: GET /api/v1/crop-seasons/{cropSeasonId}
router.get(
  '/:cropSeasonId',
  validateRequest({ params: cropSeasonIdParamSchema }),
  cropSeasonsController.getById
);

// 6.8 Update Crop Season: PUT /api/v1/crop-seasons/{cropSeasonId}
router.put(
  '/:cropSeasonId',
  validateRequest({ params: cropSeasonIdParamSchema, body: updateCropSeasonSchema }),
  cropSeasonsController.update
);

// 6.9 Complete Crop Season: PATCH /api/v1/crop-seasons/{cropSeasonId}/complete
router.patch(
  '/:cropSeasonId/complete',
  validateRequest({ params: cropSeasonIdParamSchema, body: completeCropSeasonSchema }),
  cropSeasonsController.complete
);

// 6.10 Create Farming Log: POST /api/v1/crop-seasons/{cropSeasonId}/logs
router.post(
  '/:cropSeasonId/logs',
  validateRequest({ params: cropSeasonIdParamSchema, body: createFarmingLogSchema }),
  farmingLogsController.create
);

// 6.13 Create Cost: POST /api/v1/crop-seasons/{cropSeasonId}/costs
router.post(
  '/:cropSeasonId/costs',
  validateRequest({ params: cropSeasonIdParamSchema, body: createCostSchema }),
  costsController.create
);

// 6.16 Get Farming Report: GET /api/v1/crop-seasons/{cropSeasonId}/report
router.get(
  '/:cropSeasonId/report',
  validateRequest({ params: cropSeasonIdParamSchema }),
  reportsController.getReport
);

// 6.17 Export Farming Report PDF: GET /api/v1/crop-seasons/{cropSeasonId}/report/pdf
router.get(
  '/:cropSeasonId/report/pdf',
  validateRequest({ params: cropSeasonIdParamSchema }),
  reportsController.exportPdf
);

module.exports = router;
