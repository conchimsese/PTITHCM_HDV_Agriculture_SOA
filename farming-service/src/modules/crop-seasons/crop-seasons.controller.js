const cropSeasonsService = require('./crop-seasons.service');

class CropSeasonsController {
  constructor(service = cropSeasonsService) {
    this.cropSeasonsService = service;
  }

  create = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const { plotId } = req.params;
      const season = await this.cropSeasonsService.createCropSeason(farmerId, plotId, req.body);
      return res.status(201).json(season);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const { cropSeasonId } = req.params;
      const season = await this.cropSeasonsService.getCropSeasonDetail(farmerId, cropSeasonId);
      return res.status(200).json(season);
    } catch (err) {
      next(err);
    }
  };

  update = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const { cropSeasonId } = req.params;
      const updated = await this.cropSeasonsService.updateCropSeason(farmerId, cropSeasonId, req.body);
      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  };

  complete = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const { cropSeasonId } = req.params;
      const result = await this.cropSeasonsService.completeCropSeason(farmerId, cropSeasonId, req.body);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new CropSeasonsController();
module.exports.CropSeasonsController = CropSeasonsController;
