const fs = require('fs');
const path = require('path');
const BaseRepository = require('../src/common/repositories/base.repository');
const db = require('../src/config/database');

describe('Phase 2: Database Configuration & Migration Validation', () => {
  describe('BaseRepository helper tests', () => {
    const repo = new BaseRepository('plots', 'plot_id');

    it('should correctly convert snake_case to camelCase and vice versa', () => {
      expect(BaseRepository.snakeToCamel('crop_season_id')).toBe('cropSeasonId');
      expect(BaseRepository.snakeToCamel('is_visible')).toBe('isVisible');
      expect(BaseRepository.snakeToCamel('expected_yield')).toBe('expectedYield');

      expect(BaseRepository.camelToSnake('cropSeasonId')).toBe('crop_season_id');
      expect(BaseRepository.camelToSnake('isVisible')).toBe('is_visible');
      expect(BaseRepository.camelToSnake('expectedYield')).toBe('expected_yield');
    });

    it('should map database row to camelCase DTO', () => {
      const dbRow = {
        plot_id: '11111111-1111-1111-1111-111111111111',
        farmer_id: '22222222-2222-2222-2222-222222222222',
        name: 'Ruộng A1',
        area: 2500.5,
        location: 'An Giang',
        is_visible: true,
        created_at: new Date('2026-10-21T10:00:00Z')
      };

      const dto = repo.mapRowToDto(dbRow);
      expect(dto).toEqual({
        plotId: '11111111-1111-1111-1111-111111111111',
        farmerId: '22222222-2222-2222-2222-222222222222',
        name: 'Ruộng A1',
        area: 2500.5,
        location: 'An Giang',
        isVisible: true,
        createdAt: new Date('2026-10-21T10:00:00Z')
      });
    });

    it('should correctly construct dynamic update SET clause for partial PATCH', () => {
      const updateData = {
        name: 'Ruộng A1 - Đổi tên',
        area: 3000.0,
        description: null // Explicit null to delete/clear field
      };

      const { setClause, values } = repo.buildUpdateClause(updateData, 1);
      expect(setClause).toContain('name = $1');
      expect(setClause).toContain('area = $2');
      expect(setClause).toContain('description = $3');
      expect(setClause).toContain('updated_at = NOW()');
      expect(values).toEqual(['Ruộng A1 - Đổi tên', 3000.0, null]);
    });
  });

  describe('Database migration SQL schema validation', () => {
    const migrationFile = path.join(__dirname, '../src/database/migrations/001_initial_farming_schema.sql');

    it('should have 001_initial_farming_schema.sql file existing', () => {
      expect(fs.existsSync(migrationFile)).toBe(true);
    });

    it('should define all 4 required tables and specific constraints', () => {
      const sql = fs.readFileSync(migrationFile, 'utf-8');

      // Table definitions
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS plots');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS crop_seasons');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS farming_logs');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS costs');

      // Check Constraints
      expect(sql).toContain('CHECK (area > 0)');
      expect(sql).toContain("CHECK (status IN ('IN_PROGRESS', 'COMPLETED'))");
      expect(sql).toContain('CHECK (amount >= 0)');
      expect(sql).toContain('crop_type VARCHAR(100) NOT NULL');
      expect(sql).toContain('is_visible BOOLEAN NOT NULL DEFAULT true');

      // 6 Work types allowlist
      expect(sql).toContain('LAND_PREPARATION');
      expect(sql).toContain('PLANTING');
      expect(sql).toContain('PEST_CONTROL');
      expect(sql).toContain('WATERING');
      expect(sql).toContain('FERTILIZING');
      expect(sql).toContain('HARVESTING');

      // Performance & Visibility Indexes
      expect(sql).toContain('idx_plots_farmer_visible');
      expect(sql).toContain('idx_crop_seasons_plot');
      expect(sql).toContain('idx_farming_logs_season_visible');
      expect(sql).toContain('idx_costs_season_visible');
    });
  });

  describe('Database module interface test', () => {
    it('should export all required functions', () => {
      expect(typeof db.query).toBe('function');
      expect(typeof db.getClient).toBe('function');
      expect(typeof db.withTransaction).toBe('function');
      expect(typeof db.testConnection).toBe('function');
      expect(typeof db.close).toBe('function');
    });
  });
});
