const db = require('../../config/database');

/**
 * Base Repository providing common database operations and row-to-DTO mappers
 */
class BaseRepository {
  constructor(tableName, primaryKey = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
    this.db = db;
  }

  /**
   * Convert snake_case string to camelCase
   */
  static snakeToCamel(str) {
    return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Convert camelCase string to snake_case
   */
  static camelToSnake(str) {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Map database row object from snake_case keys to camelCase keys
   */
  mapRowToDto(row) {
    if (!row) return null;
    const dto = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = BaseRepository.snakeToCamel(key);
      dto[camelKey] = value;
    }
    return dto;
  }

  /**
   * Map array of database rows to array of DTOs
   */
  mapRowsToDtos(rows) {
    if (!rows || !Array.isArray(rows)) return [];
    return rows.map(r => this.mapRowToDto(r));
  }

  /**
   * Build dynamic SET clause for partial updates
   * @param {Object} updateData - Object with camelCase or snake_case fields
   * @param {number} startIndex - Starting parameter index (e.g. 1 or 2)
   * @returns {{ setClause: string, values: Array }}
   */
  buildUpdateClause(updateData, startIndex = 1) {
    const fields = [];
    const values = [];
    let paramIndex = startIndex;

    for (const [key, val] of Object.entries(updateData)) {
      if (val !== undefined) {
        const snakeKey = BaseRepository.camelToSnake(key);
        fields.push(`${snakeKey} = $${paramIndex}`);
        values.push(val);
        paramIndex++;
      }
    }

    // Always update updated_at if it exists
    fields.push(`updated_at = NOW()`);

    return {
      setClause: fields.join(', '),
      values
    };
  }

  /**
   * Execute raw query
   */
  async query(text, params) {
    return await this.db.query(text, params);
  }
}

module.exports = BaseRepository;
