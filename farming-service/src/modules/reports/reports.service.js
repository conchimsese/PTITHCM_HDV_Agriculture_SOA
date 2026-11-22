const reportsRepository = require('./reports.repository');
const PdfGenerator = require('./reports.pdf-generator');
const { NotFoundError, ForbiddenError } = require('../../common/errors/app-error');

class ReportsService {
  constructor(repository = reportsRepository) {
    this.reportsRepository = repository;
  }

  async getFarmingReport(farmerId, cropSeasonId) {
    const data = await this.reportsRepository.getSeasonWithPlot(cropSeasonId);
    if (!data) {
      throw new NotFoundError(`Crop season with id ${cropSeasonId} not found`);
    }

    if (data.farmerId !== farmerId) {
      throw new ForbiddenError('You do not have permission to access report for this crop season');
    }

    const [farmingLogs, costs] = await Promise.all([
      this.reportsRepository.getVisibleLogs(cropSeasonId),
      this.reportsRepository.getVisibleCosts(cropSeasonId)
    ]);

    const totalCost = costs.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);

    return {
      cropSeason: data.cropSeason,
      plot: data.plot,
      farmingLogs,
      costs,
      summary: {
        totalCost,
        expectedYield: data.cropSeason.expectedYield,
        actualYield: data.cropSeason.actualYield
      }
    };
  }

  async exportFarmingReportPdf(farmerId, cropSeasonId) {
    const reportData = await this.getFarmingReport(farmerId, cropSeasonId);
    return await PdfGenerator.generateReportPdf(reportData);
  }
}

module.exports = new ReportsService();
module.exports.ReportsService = ReportsService;
