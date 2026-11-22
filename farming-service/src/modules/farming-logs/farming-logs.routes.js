const express = require('express');
const farmingLogsController = require('./farming-logs.controller');
const { authenticateToken } = require('../../common/middlewares/auth.middleware');
const { checkAccessState } = require('../../common/middlewares/access-state.middleware');
const { validateRequest } = require('../../common/middlewares/validate.middleware');
const {
  updateFarmingLogSchema,
  updateLogVisibilitySchema,
  logIdParamSchema
} = require('./dto/farming-log.validation');

const router = express.Router();

router.use(authenticateToken(['FARMER']));
router.use(checkAccessState);

// 6.11 Update Farming Log: PATCH /api/v1/logs/{logId}
router.patch(
  '/:logId',
  validateRequest({ params: logIdParamSchema, body: updateFarmingLogSchema }),
  farmingLogsController.update
);

// 6.12 Hide Farming Log: PATCH /api/v1/logs/{logId}/visibility
router.patch(
  '/:logId/visibility',
  validateRequest({ params: logIdParamSchema, body: updateLogVisibilitySchema }),
  farmingLogsController.updateVisibility
);

module.exports = router;
