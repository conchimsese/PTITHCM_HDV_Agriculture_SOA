const plotsService = require('./plots.service');

class PlotsController {
  constructor(service = plotsService) {
    this.plotsService = service;
  }

  create = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const plot = await this.plotsService.createPlot(farmerId, req.body);
      return res.status(201).json(plot);
    } catch (err) {
      next(err);
    }
  };

  getAll = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const response = await this.plotsService.getFarmerPlots(farmerId, req.query);
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const plot = await this.plotsService.getPlotDetail(farmerId, req.params.plotId);
      return res.status(200).json(plot);
    } catch (err) {
      next(err);
    }
  };

  update = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const updated = await this.plotsService.updatePlot(farmerId, req.params.plotId, req.body);
      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  };

  updateVisibility = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const result = await this.plotsService.updatePlotVisibility(
        farmerId,
        req.params.plotId,
        req.body.isVisible
      );
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  getSummary = async (req, res, next) => {
    try {
      const { plotId } = req.params;
      const { cropSeasonId } = req.query;
      const summary = await this.plotsService.getPlotSummary(plotId, cropSeasonId);
      return res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new PlotsController();
module.exports.PlotsController = PlotsController;
