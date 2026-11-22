const BaseRepository = require('../../common/repositories/base.repository');

class ReportsRepository extends BaseRepository {
  constructor() {
    super('crop_seasons', 'crop_season_id');
  }

  async getSeasonWithPlot(cropSeasonId) {
    const sql = `
      SELECT 
        cs.crop_season_id,
        cs.season_name,
        cs.start_date,
        cs.end_date,
        cs.status,
        cs.crop_type,
        cs.expected_yield,
        cs.actual_yield,
        cs.created_at AS season_created_at,
        cs.updated_at AS season_updated_at,
        p.plot_id,
        p.farmer_id,
        p.name AS plot_name,
        p.area,
        p.location,
        p.description AS plot_description,
        p.latitude,
        p.longitude,
        p.is_visible AS plot_is_visible
      FROM crop_seasons cs
      JOIN plots p ON cs.plot_id = p.plot_id
      WHERE cs.crop_season_id = $1;
    `;
    const res = await this.query(sql, [cropSeasonId]);
    if (!res.rows || res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      cropSeason: {
        cropSeasonId: row.crop_season_id,
        plotId: row.plot_id,
        seasonName: row.season_name,
        startDate: row.start_date instanceof Date ? row.start_date.toISOString().split('T')[0] : row.start_date,
        endDate: row.end_date instanceof Date ? row.end_date.toISOString().split('T')[0] : row.end_date,
        status: row.status,
        cropType: row.crop_type,
        expectedYield: row.expected_yield !== null ? parseFloat(row.expected_yield) : null,
        actualYield: row.actual_yield !== null ? parseFloat(row.actual_yield) : null
      },
      plot: {
        plotId: row.plot_id,
        farmerId: row.farmer_id,
        name: row.plot_name,
        area: parseFloat(row.area),
        location: row.location,
        description: row.plot_description,
        latitude: row.latitude !== null ? parseFloat(row.latitude) : null,
        longitude: row.longitude !== null ? parseFloat(row.longitude) : null
      },
      farmerId: row.farmer_id
    };
  }

  async getVisibleLogs(cropSeasonId) {
    const sql = `
      SELECT 
        log_id,
        crop_season_id,
        work_type,
        work_date,
        description,
        quantity,
        unit,
        is_visible
      FROM farming_logs
      WHERE crop_season_id = $1
        AND is_visible = true
      ORDER BY work_date ASC, created_at ASC;
    `;
    const res = await this.query(sql, [cropSeasonId]);
    return res.rows.map(r => ({
      logId: r.log_id,
      cropSeasonId: r.crop_season_id,
      workType: r.work_type,
      workDate: r.work_date instanceof Date ? r.work_date.toISOString().split('T')[0] : r.work_date,
      description: r.description,
      quantity: r.quantity !== null ? parseFloat(r.quantity) : null,
      unit: r.unit,
      isVisible: r.is_visible
    }));
  }

  async getVisibleCosts(cropSeasonId) {
    const sql = `
      SELECT 
        cost_id,
        crop_season_id,
        category,
        amount,
        incurred_date,
        description,
        is_visible
      FROM costs
      WHERE crop_season_id = $1
        AND is_visible = true
      ORDER BY incurred_date ASC, created_at ASC;
    `;
    const res = await this.query(sql, [cropSeasonId]);
    return res.rows.map(r => ({
      costId: r.cost_id,
      cropSeasonId: r.crop_season_id,
      category: r.category,
      amount: parseFloat(r.amount).toFixed(2),
      incurredDate: r.incurred_date instanceof Date ? r.incurred_date.toISOString().split('T')[0] : r.incurred_date,
      description: r.description,
      isVisible: r.is_visible
    }));
  }
}

module.exports = new ReportsRepository();
