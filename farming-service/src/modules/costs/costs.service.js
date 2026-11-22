const costsRepository = require('./costs.repository');
const cropSeasonsRepository = require('../crop-seasons/crop-seasons.repository');
const { NotFoundError, ForbiddenError, ValidationError } = require('../../common/errors/app-error');

class CostsService {
  constructor(costRepo = costsRepository, seasonRepo = cropSeasonsRepository) {
    this.costsRepository = costRepo;
    this.cropSeasonsRepository = seasonRepo;
  }

  async createCost(farmerId, cropSeasonId, costData) {
    const season = await this.cropSeasonsRepository.findById(cropSeasonId);
    if (!season) {
      throw new NotFoundError(`Crop season with id ${cropSeasonId} not found`);
    }

    if (season.farmerId !== farmerId) {
      throw new ForbiddenError('You do not have permission to add a cost to this crop season');
    }

    const amountNum = parseFloat(costData.amount);
    if (isNaN(amountNum) || amountNum < 0) {
      throw new ValidationError('amount must be greater than or equal to 0');
    }

    return await this.costsRepository.create({
      cropSeasonId,
      category: costData.category,
      amount: amountNum.toFixed(2),
      incurredDate: costData.incurredDate,
      description: costData.description
    });
  }

  async updateCost(farmerId, costId, updateData) {
    const cost = await this.costsRepository.findById(costId);
    if (!cost) {
      throw new NotFoundError(`Cost with id ${costId} not found`);
    }

    if (cost.farmerId !== farmerId) {
      throw new ForbiddenError('You do not have permission to modify this cost');
    }

    if (updateData.amount !== undefined) {
      const amountNum = parseFloat(updateData.amount);
      if (isNaN(amountNum) || amountNum < 0) {
        throw new ValidationError('amount must be greater than or equal to 0');
      }
      updateData.amount = amountNum.toFixed(2);
    }

    return await this.costsRepository.updatePartial(costId, updateData);
  }

  async updateCostVisibility(farmerId, costId, isVisible) {
    const cost = await this.costsRepository.findById(costId);
    if (!cost) {
      throw new NotFoundError(`Cost with id ${costId} not found`);
    }

    if (cost.farmerId !== farmerId) {
      throw new ForbiddenError('You do not have permission to modify this cost');
    }

    return await this.costsRepository.updateVisibility(costId, isVisible);
  }
}

module.exports = new CostsService();
module.exports.CostsService = CostsService;
