const reportsService = require('./reports.service');

class ReportsController {
  constructor(service = reportsService) {
    this.reportsService = service;
  }

  getReport = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const { cropSeasonId } = req.params;
      const report = await this.reportsService.getFarmingReport(farmerId, cropSeasonId);
      return res.status(200).json(report);
    } catch (err) {
      next(err);
    }
  };

  exportPdf = async (req, res, next) => {
    try {
      const farmerId = req.user.accountId;
      const { cropSeasonId } = req.params;
      const pdfBuffer = await this.reportsService.exportFarmingReportPdf(farmerId, cropSeasonId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="farming-report-${cropSeasonId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      return res.status(200).end(pdfBuffer);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new ReportsController();
module.exports.ReportsController = ReportsController;
