const costsService = require('./costs.service');

class CostsController {
  constructor(service = costsService) {
    this.costsService = service;
  }

  create = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const { cropSeasonId } = req.params;
      const cost = await this.costsService.createCost(farmerId, cropSeasonId, req.body);
      return res.status(201).json(cost);
    } catch (err) {
      next(err);
    }
  };

  update = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const { costId } = req.params;
      const updated = await this.costsService.updateCost(farmerId, costId, req.body);
      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  };

  updateVisibility = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const { costId } = req.params;
      const result = await this.costsService.updateCostVisibility(
        farmerId,
        costId,
        req.body.isVisible
      );
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new CostsController();
module.exports.CostsController = CostsController;
