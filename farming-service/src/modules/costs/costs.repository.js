const BaseRepository = require('../../common/repositories/base.repository');

class CostsRepository extends BaseRepository {
  constructor() {
    super('costs', 'cost_id');
  }

  mapRowToDto(row) {
    if (!row) return null;
    const dto = super.mapRowToDto(row);
    if (dto.amount !== undefined && dto.amount !== null) {
      dto.amount = parseFloat(dto.amount).toFixed(2);
    }
    if (dto.incurredDate instanceof Date) {
      dto.incurredDate = dto.incurredDate.toISOString().split('T')[0];
    }
    return dto;
  }

  async create({ cropSeasonId, category, amount, incurredDate, description }) {
    const sql = `
      INSERT INTO costs (
        crop_season_id, category, amount, incurred_date, description
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [
      cropSeasonId,
      category,
      amount,
      incurredDate,
      description || null
    ];
    const res = await this.query(sql, values);
    return this.mapRowToDto(res.rows[0]);
  }

  async findById(costId) {
    const sql = `
      SELECT c.*, p.farmer_id
      FROM costs c
      JOIN crop_seasons cs ON c.crop_season_id = cs.crop_season_id
      JOIN plots p ON cs.plot_id = p.plot_id
      WHERE c.cost_id = $1;
    `;
    const res = await this.query(sql, [costId]);
    return this.mapRowToDto(res.rows[0]);
  }

  async updatePartial(costId, updateData) {
    const { setClause, values } = this.buildUpdateClause(updateData, 2);
    const sql = `
      UPDATE costs
      SET ${setClause}
      WHERE cost_id = $1
      RETURNING *;
    `;
    const res = await this.query(sql, [costId, ...values]);
    return this.mapRowToDto(res.rows[0]);
  }

  async updateVisibility(costId, isVisible) {
    const sql = `
      UPDATE costs
      SET is_visible = $2, updated_at = NOW()
      WHERE cost_id = $1
      RETURNING cost_id, is_visible;
    `;
    const res = await this.query(sql, [costId, isVisible]);
    const row = res.rows[0];
    return {
      costId: row.cost_id,
      isVisible: row.is_visible
    };
  }

  async findByCropSeasonId(cropSeasonId, isVisibleOnly = true) {
    const sql = `
      SELECT *
      FROM costs
      WHERE crop_season_id = $1
        AND ($2::boolean IS FALSE OR is_visible = true)
      ORDER BY incurred_date ASC, created_at ASC;
    `;
    const res = await this.query(sql, [cropSeasonId, isVisibleOnly]);
    return this.mapRowsToDtos(res.rows);
  }
}

module.exports = new CostsRepository();
