const farmingLogsService = require('./farming-logs.service');

class FarmingLogsController {
  constructor(service = farmingLogsService) {
    this.farmingLogsService = service;
  }

  create = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const { cropSeasonId } = req.params;
      const log = await this.farmingLogsService.createLog(farmerId, cropSeasonId, req.body);
      return res.status(201).json(log);
    } catch (err) {
      next(err);
    }
  };

  update = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const { logId } = req.params;
      const updated = await this.farmingLogsService.updateLog(farmerId, logId, req.body);
      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  };

  updateVisibility = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const { logId } = req.params;
      const result = await this.farmingLogsService.updateLogVisibility(
        farmerId,
        logId,
        req.body.isVisible
      );
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new FarmingLogsController();
module.exports.FarmingLogsController = FarmingLogsController;
