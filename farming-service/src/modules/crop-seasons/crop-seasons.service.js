const cropSeasonsRepository = require('./crop-seasons.repository');
const plotsRepository = require('../plots/plots.repository');
const { NotFoundError, ForbiddenError, ValidationError, ConflictError } = require('../../common/errors/app-error');

class CropSeasonsService {
  constructor(seasonRepo = cropSeasonsRepository, plotRepo = plotsRepository) {
    this.cropSeasonsRepository = seasonRepo;
    this.plotsRepository = plotRepo;
  }

  async createCropSeason(farmerId, plotId, seasonData) {
    const plot = await this.plotsRepository.findById(plotId);
    if (!plot) {
      throw new NotFoundError(`Plot with id ${plotId} not found`);
    }

    if (plot.farmerId !== farmerId) {
      throw new ForbiddenError('You do not have permission to create a crop season on this plot');
    }

    if (!seasonData.cropType || seasonData.cropType.trim() === '') {
      throw new ValidationError('cropType is required for new crop seasons');
    }

    return await this.cropSeasonsRepository.create({
      plotId,
      seasonName: seasonData.seasonName,
      startDate: seasonData.startDate,
      expectedYield: seasonData.expectedYield,
      cropType: seasonData.cropType.trim()
    });
  }

  async getCropSeasonDetail(farmerId, cropSeasonId) {
    const season = await this.cropSeasonsRepository.findById(cropSeasonId);
    if (!season) {
      throw new NotFoundError(`Crop season with id ${cropSeasonId} not found`);
    }

    if (season.farmerId !== farmerId) {
      throw new ForbiddenError('You do not have permission to view this crop season');
    }

    // Do not leak farmerId if not in crop_seasons schema, but it's part of plot anyway
    return season;
  }

  async updateCropSeason(farmerId, cropSeasonId, updateData) {
    const season = await this.cropSeasonsRepository.findById(cropSeasonId);
    if (!season) {
      throw new NotFoundError(`Crop season with id ${cropSeasonId} not found`);
    }

    if (season.farmerId !== farmerId) {
      throw new ForbiddenError('You do not have permission to modify this crop season');
    }

    if ('cropType' in updateData) {
      if (!updateData.cropType || updateData.cropType.trim() === '') {
        throw new ValidationError('cropType cannot be removed or blank');
      }
      updateData.cropType = updateData.cropType.trim();
    }

    return await this.cropSeasonsRepository.update(cropSeasonId, updateData);
  }

  async completeCropSeason(farmerId, cropSeasonId, { actualYield }) {
    const season = await this.cropSeasonsRepository.findById(cropSeasonId);
    if (!season) {
      throw new NotFoundError(`Crop season with id ${cropSeasonId} not found`);
    }

    if (season.farmerId !== farmerId) {
      throw new ForbiddenError('You do not have permission to complete this crop season');
    }

    if (season.status === 'COMPLETED') {
      throw new ConflictError('Crop season is already completed');
    }

    if (actualYield === undefined || actualYield === null || actualYield < 0) {
      throw new ValidationError('actualYield must be greater than or equal to 0');
    }

    return await this.cropSeasonsRepository.complete(cropSeasonId, { actualYield });
  }
}

module.exports = new CropSeasonsService();
module.exports.CropSeasonsService = CropSeasonsService;
