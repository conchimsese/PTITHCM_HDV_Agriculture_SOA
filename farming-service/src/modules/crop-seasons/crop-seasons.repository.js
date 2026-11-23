const BaseRepository = require('../../common/repositories/base.repository');

class CropSeasonsRepository extends BaseRepository {
  constructor() {
    super('crop_seasons', 'crop_season_id');
  }

  mapRowToDto(row) {
    if (!row) return null;
    const dto = super.mapRowToDto(row);
    if (dto.expectedYield !== undefined && dto.expectedYield !== null) {
      dto.expectedYield = parseFloat(dto.expectedYield);
    }
    if (dto.actualYield !== undefined && dto.actualYield !== null) {
      dto.actualYield = parseFloat(dto.actualYield);
    }
    if (dto.startDate instanceof Date) {
      dto.startDate = dto.startDate.toISOString().split('T')[0];
    }
    if (dto.endDate instanceof Date) {
      dto.endDate = dto.endDate.toISOString().split('T')[0];
    }
    return dto;
  }

  async create({ plotId, seasonName, startDate, expectedYield, cropType }) {
    const sql = `
      INSERT INTO crop_seasons (
        plot_id, season_name, start_date, expected_yield, crop_type, status
      )
      VALUES ($1, $2, $3, $4, $5, 'IN_PROGRESS')
      RETURNING *;
    `;
    const values = [plotId, seasonName, startDate, expectedYield !== undefined ? expectedYield : null, cropType];
    const res = await this.query(sql, values);
    return this.mapRowToDto(res.rows[0]);
  }

  async findById(cropSeasonId) {
    const sql = `
      SELECT cs.*, p.farmer_id
      FROM crop_seasons cs
      JOIN plots p ON cs.plot_id = p.plot_id
      WHERE cs.crop_season_id = $1;
    `;
    const res = await this.query(sql, [cropSeasonId]);
    return this.mapRowToDto(res.rows[0]);
  }

  async findByPlotId(plotId) {
    const res = await this.query(
      'SELECT * FROM crop_seasons WHERE plot_id = $1 ORDER BY start_date DESC, crop_season_id DESC',
      [plotId]
    );
    return res.rows.map((row) => this.mapRowToDto(row));
  }

  async update(cropSeasonId, updateData) {
    const { setClause, values } = this.buildUpdateClause(updateData, 2);
    const sql = `
      UPDATE crop_seasons
      SET ${setClause}
      WHERE crop_season_id = $1
      RETURNING *;
    `;
    const res = await this.query(sql, [cropSeasonId, ...values]);
    return this.mapRowToDto(res.rows[0]);
  }

  async complete(cropSeasonId, { actualYield, endDate = null }) {
    const sql = `
      UPDATE crop_seasons
      SET status = 'COMPLETED',
          actual_yield = $2,
          end_date = COALESCE($3, CURRENT_DATE),
          updated_at = NOW()
      WHERE crop_season_id = $1
      RETURNING *;
    `;
    const res = await this.query(sql, [cropSeasonId, actualYield, endDate]);
    const row = this.mapRowToDto(res.rows[0]);
    return {
      cropSeasonId: row.cropSeasonId,
      status: row.status,
      actualYield: row.actualYield
    };
  }
}

module.exports = new CropSeasonsRepository();
