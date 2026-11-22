const express = require('express');
const costsController = require('./costs.controller');
const { authenticateToken } = require('../../common/middlewares/auth.middleware');
const { checkAccessState } = require('../../common/middlewares/access-state.middleware');
const { validateRequest } = require('../../common/middlewares/validate.middleware');
const {
  updateCostSchema,
  updateCostVisibilitySchema,
  costIdParamSchema
} = require('./dto/cost.validation');

const router = express.Router();

router.use(authenticateToken(['FARMER']));
router.use(checkAccessState);

// 6.14 Update Cost: PATCH /api/v1/costs/{costId}
router.patch(
  '/:costId',
  validateRequest({ params: costIdParamSchema, body: updateCostSchema }),
  costsController.update
);

// 6.15 Hide Cost: PATCH /api/v1/costs/{costId}/visibility
router.patch(
  '/:costId/visibility',
  validateRequest({ params: costIdParamSchema, body: updateCostVisibilitySchema }),
  costsController.updateVisibility
);

module.exports = router;
