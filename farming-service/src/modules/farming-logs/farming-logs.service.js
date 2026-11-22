const farmingLogsRepository = require('./farming-logs.repository');
const cropSeasonsRepository = require('../crop-seasons/crop-seasons.repository');
const { NotFoundError, ForbiddenError, ValidationError } = require('../../common/errors/app-error');

class FarmingLogsService {
  constructor(logRepo = farmingLogsRepository, seasonRepo = cropSeasonsRepository) {
    this.farmingLogsRepository = logRepo;
    this.cropSeasonsRepository = seasonRepo;
  }

  async createLog(farmerId, cropSeasonId, logData) {
    const season = await this.cropSeasonsRepository.findById(cropSeasonId);
    if (!season) {
      throw new NotFoundError(`Crop season with id ${cropSeasonId} not found`);
    }

    if (season.farmerId !== farmerId) {
      throw new ForbiddenError('You do not have permission to add a log to this crop season');
    }

    if (logData.quantity !== undefined && logData.quantity !== null && logData.quantity < 0) {
      throw new ValidationError('quantity must be greater than or equal to 0');
    }

    return await this.farmingLogsRepository.create({
      cropSeasonId,
      workType: logData.workType,
      workDate: logData.workDate,
      description: logData.description,
      quantity: logData.quantity,
      unit: logData.unit
    });
  }

  async updateLog(farmerId, logId, updateData) {
    const log = await this.farmingLogsRepository.findById(logId);
    if (!log) {
      throw new NotFoundError(`Farming log with id ${logId} not found`);
    }

    if (log.farmerId !== farmerId) {
      throw new ForbiddenError('You do not have permission to modify this farming log');
    }

    if (updateData.quantity !== undefined && updateData.quantity !== null && updateData.quantity < 0) {
      throw new ValidationError('quantity must be greater than or equal to 0');
    }

    return await this.farmingLogsRepository.updatePartial(logId, updateData);
  }

  async updateLogVisibility(farmerId, logId, isVisible) {
    const log = await this.farmingLogsRepository.findById(logId);
    if (!log) {
      throw new NotFoundError(`Farming log with id ${logId} not found`);
    }

    if (log.farmerId !== farmerId) {
      throw new ForbiddenError('You do not have permission to modify this farming log');
    }

    return await this.farmingLogsRepository.updateVisibility(logId, isVisible);
  }
}

module.exports = new FarmingLogsService();
module.exports.FarmingLogsService = FarmingLogsService;
