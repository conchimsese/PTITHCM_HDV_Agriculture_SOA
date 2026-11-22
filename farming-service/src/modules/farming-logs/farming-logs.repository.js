const BaseRepository = require('../../common/repositories/base.repository');

class FarmingLogsRepository extends BaseRepository {
  constructor() {
    super('farming_logs', 'log_id');
  }

  mapRowToDto(row) {
    if (!row) return null;
    const dto = super.mapRowToDto(row);
    if (dto.quantity !== undefined && dto.quantity !== null) {
      dto.quantity = parseFloat(dto.quantity);
    }
    if (dto.workDate instanceof Date) {
      dto.workDate = dto.workDate.toISOString().split('T')[0];
    }
    return dto;
  }

  async create({ cropSeasonId, workType, workDate, description, quantity, unit }) {
    const sql = `
      INSERT INTO farming_logs (
        crop_season_id, work_type, work_date, description, quantity, unit
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [
      cropSeasonId,
      workType,
      workDate,
      description || null,
      quantity !== undefined ? quantity : null,
      unit || null
    ];
    const res = await this.query(sql, values);
    return this.mapRowToDto(res.rows[0]);
  }

  async findById(logId) {
    const sql = `
      SELECT fl.*, p.farmer_id
      FROM farming_logs fl
      JOIN crop_seasons cs ON fl.crop_season_id = cs.crop_season_id
      JOIN plots p ON cs.plot_id = p.plot_id
      WHERE fl.log_id = $1;
    `;
    const res = await this.query(sql, [logId]);
    return this.mapRowToDto(res.rows[0]);
  }

  async updatePartial(logId, updateData) {
    const { setClause, values } = this.buildUpdateClause(updateData, 2);
    const sql = `
      UPDATE farming_logs
      SET ${setClause}
      WHERE log_id = $1
      RETURNING *;
    `;
    const res = await this.query(sql, [logId, ...values]);
    return this.mapRowToDto(res.rows[0]);
  }

  async updateVisibility(logId, isVisible) {
    const sql = `
      UPDATE farming_logs
      SET is_visible = $2, updated_at = NOW()
      WHERE log_id = $1
      RETURNING log_id, is_visible;
    `;
    const res = await this.query(sql, [logId, isVisible]);
    const row = res.rows[0];
    return {
      logId: row.log_id,
      isVisible: row.is_visible
    };
  }

  async findByCropSeasonId(cropSeasonId, isVisibleOnly = true) {
    const sql = `
      SELECT *
      FROM farming_logs
      WHERE crop_season_id = $1
        AND ($2::boolean IS FALSE OR is_visible = true)
      ORDER BY work_date ASC, created_at ASC;
    `;
    const res = await this.query(sql, [cropSeasonId, isVisibleOnly]);
    return this.mapRowsToDtos(res.rows);
  }
}

module.exports = new FarmingLogsRepository();
