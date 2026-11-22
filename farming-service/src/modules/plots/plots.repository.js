const BaseRepository = require('../../common/repositories/base.repository');

class PlotsRepository extends BaseRepository {
  constructor() {
    super('plots', 'plot_id');
  }

  mapRowToDto(row) {
    if (!row) return null;
    const dto = super.mapRowToDto(row);
    if (dto.area !== undefined && dto.area !== null) {
      dto.area = parseFloat(dto.area);
    }
    if (dto.latitude !== undefined && dto.latitude !== null) {
      dto.latitude = parseFloat(dto.latitude);
    }
    if (dto.longitude !== undefined && dto.longitude !== null) {
      dto.longitude = parseFloat(dto.longitude);
    }
    return dto;
  }

  async create({ farmerId, name, area, location, description, latitude, longitude }) {
    const sql = `
      INSERT INTO plots (
        farmer_id, name, area, location, description, latitude, longitude
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [farmerId, name, area, location, description || null, latitude, longitude];
    const res = await this.query(sql, values);
    return this.mapRowToDto(res.rows[0]);
  }

  async findById(plotId) {
    const sql = `
      SELECT *
      FROM plots
      WHERE plot_id = $1;
    `;
    const res = await this.query(sql, [plotId]);
    return this.mapRowToDto(res.rows[0]);
  }

  async findByFarmerId(farmerId, { page = 0, size = 20, isVisibleOnly = true }) {
    const offset = page * size;
    const itemsSql = `
      SELECT *
      FROM plots
      WHERE farmer_id = $1
        AND ($2::boolean IS FALSE OR is_visible = true)
      ORDER BY created_at DESC, plot_id DESC
      LIMIT $3 OFFSET $4;
    `;
    const countSql = `
      SELECT COUNT(*) AS total
      FROM plots
      WHERE farmer_id = $1
        AND ($2::boolean IS FALSE OR is_visible = true);
    `;

    const [itemsRes, countRes] = await Promise.all([
      this.query(itemsSql, [farmerId, isVisibleOnly, size, offset]),
      this.query(countSql, [farmerId, isVisibleOnly])
    ]);

    const items = this.mapRowsToDtos(itemsRes.rows);
    const totalElements = parseInt(countRes.rows[0].total, 10);

    return {
      items,
      totalElements
    };
  }

  async update(plotId, updateData) {
    const { setClause, values } = this.buildUpdateClause(updateData, 2);
    const sql = `
      UPDATE plots
      SET ${setClause}
      WHERE plot_id = $1
      RETURNING *;
    `;
    const res = await this.query(sql, [plotId, ...values]);
    return this.mapRowToDto(res.rows[0]);
  }

  async updateVisibility(plotId, isVisible) {
    const sql = `
      UPDATE plots
      SET is_visible = $2, updated_at = NOW()
      WHERE plot_id = $1
      RETURNING plot_id, is_visible;
    `;
    const res = await this.query(sql, [plotId, isVisible]);
    const row = res.rows[0];
    return {
      plotId: row.plot_id,
      isVisible: row.is_visible
    };
  }

  async getPlotSummaryWithSeason(plotId, cropSeasonId) {
    const sql = `
      SELECT 
        p.plot_id,
        p.farmer_id,
        p.area,
        p.latitude,
        p.longitude,
        p.is_visible,
        cs.crop_season_id,
        cs.plot_id AS season_plot_id,
        cs.crop_type,
        cs.expected_yield
      FROM plots p
      LEFT JOIN crop_seasons cs ON cs.crop_season_id = $2
      WHERE p.plot_id = $1;
    `;
    const res = await this.query(sql, [plotId, cropSeasonId]);
    if (!res.rows || res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      plotId: row.plot_id,
      farmerId: row.farmer_id,
      area: parseFloat(row.area),
      latitude: row.latitude !== null ? parseFloat(row.latitude) : null,
      longitude: row.longitude !== null ? parseFloat(row.longitude) : null,
      isVisible: row.is_visible,
      season: row.crop_season_id ? {
        cropSeasonId: row.crop_season_id,
        plotId: row.season_plot_id,
        cropType: row.crop_type,
        expectedYield: row.expected_yield !== null ? parseFloat(row.expected_yield) : null
      } : null
    };
  }
}

module.exports = new PlotsRepository();
