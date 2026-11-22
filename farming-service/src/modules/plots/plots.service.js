const plotsRepository = require('./plots.repository');
const { NotFoundError, ForbiddenError, ValidationError, SnapshotIncompleteError } = require('../../common/errors/app-error');
const { formatPaginatedResponse } = require('../../common/utils/response.util');

class PlotsService {
  constructor(repository = plotsRepository) {
    this.plotsRepository = repository;
  }

  async createPlot(farmerId, plotData) {
    if (!farmerId) {
      throw new ForbiddenError('Farmer identifier is required');
    }
    if (plotData.area <= 0) {
      throw new ValidationError('Plot area must be greater than 0');
    }

    return await this.plotsRepository.create({
      farmerId,
      name: plotData.name,
      area: plotData.area,
      location: plotData.location,
      description: plotData.description,
      latitude: plotData.latitude,
      longitude: plotData.longitude
    });
  }

  async getFarmerPlots(farmerId, { page = 0, size = 20 }) {
    const { items, totalElements } = await this.plotsRepository.findByFarmerId(farmerId, {
      page,
      size,
      isVisibleOnly: true
    });

    return formatPaginatedResponse(items, page, size, totalElements);
  }

  async getPlotDetail(farmerId, plotId) {
    const plot = await this.plotsRepository.findById(plotId);
    if (!plot) {
      throw new NotFoundError(`Plot with id ${plotId} not found`);
    }

    if (plot.farmerId !== farmerId) {
      throw new ForbiddenError('You do not have permission to view this plot');
    }

    return plot;
  }

  async updatePlot(farmerId, plotId, updateData) {
    const plot = await this.plotsRepository.findById(plotId);
    if (!plot) {
      throw new NotFoundError(`Plot with id ${plotId} not found`);
    }

    if (plot.farmerId !== farmerId) {
      throw new ForbiddenError('You do not have permission to modify this plot');
    }

    if (updateData.area !== undefined && updateData.area <= 0) {
      throw new ValidationError('Plot area must be greater than 0');
    }

    return await this.plotsRepository.update(plotId, updateData);
  }

  async updatePlotVisibility(farmerId, plotId, isVisible) {
    const plot = await this.plotsRepository.findById(plotId);
    if (!plot) {
      throw new NotFoundError(`Plot with id ${plotId} not found`);
    }

    if (plot.farmerId !== farmerId) {
      throw new ForbiddenError('You do not have permission to modify this plot');
    }

    return await this.plotsRepository.updateVisibility(plotId, isVisible);
  }

  async getPlotSummary(plotId, cropSeasonId) {
    const data = await this.plotsRepository.getPlotSummaryWithSeason(plotId, cropSeasonId);
    if (!data) {
      throw new NotFoundError(`Plot with id ${plotId} not found`);
    }

    if (!data.season || data.season.plotId !== plotId) {
      throw new ForbiddenError(`Crop season ${cropSeasonId} does not belong to plot ${plotId}`);
    }

    // Spec Contract v2.1 §7: Plot ẩn hoặc thiếu snapshot -> 409 SNAPSHOT_INCOMPLETE
    if (!data.isVisible) {
      throw new SnapshotIncompleteError('Plot is hidden and cannot be used for trading listing snapshot');
    }

    if (
      data.latitude === null ||
      data.longitude === null ||
      !data.season.cropType ||
      data.season.cropType.trim() === '' ||
      data.season.expectedYield === null ||
      data.season.expectedYield === undefined
    ) {
      throw new SnapshotIncompleteError('Snapshot data is incomplete (missing cropType, GPS, or expectedYield)');
    }

    return {
      plotId: data.plotId,
      farmerId: data.farmerId,
      area: data.area,
      latitude: data.latitude,
      longitude: data.longitude,
      currentSeason: {
        cropSeasonId: data.season.cropSeasonId,
        cropType: data.season.cropType,
        expectedYield: data.season.expectedYield
      }
    };
  }
}

module.exports = new PlotsService();
module.exports.PlotsService = PlotsService;
