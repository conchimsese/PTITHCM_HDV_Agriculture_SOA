const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const env = require('../src/config/env');

describe('Phase 6: Trading Snapshot API (1 API)', () => {
  const validPlotId = '99999999-9999-9999-9999-999999999999';
  const validSeasonId = '88888888-8888-8888-8888-888888888888';
  const farmerId = '11111111-1111-1111-1111-111111111111';
  const serviceKey = env.TRADING_SERVICE_KEY;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('Authentication & Validation on GET /api/v1/plots/{plotId}/summary', () => {
    it('should return 401 UNAUTHORIZED if X-Service-Key header is missing', async () => {
      const res = await request(app)
        .get(`/api/v1/plots/${validPlotId}/summary?cropSeasonId=${validSeasonId}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN if X-Service-Key is invalid', async () => {
      const res = await request(app)
        .get(`/api/v1/plots/${validPlotId}/summary?cropSeasonId=${validSeasonId}`)
        .set('X-Service-Key', 'wrong-key');

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should return 400 VALIDATION_ERROR if cropSeasonId query parameter is missing', async () => {
      const res = await request(app)
        .get(`/api/v1/plots/${validPlotId}/summary`)
        .set('X-Service-Key', serviceKey);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR if cropSeasonId is not a valid UUID', async () => {
      const res = await request(app)
        .get(`/api/v1/plots/${validPlotId}/summary?cropSeasonId=not-a-uuid`)
        .set('X-Service-Key', serviceKey);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Business Logic & Snapshot Integrity', () => {
    it('should return 404 NOT_FOUND if plot does not exist', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get(`/api/v1/plots/${validPlotId}/summary?cropSeasonId=${validSeasonId}`)
        .set('X-Service-Key', serviceKey);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should return 403 FORBIDDEN if season does not belong to plot', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [{
          plot_id: validPlotId,
          farmer_id: farmerId,
          area: '2500.50',
          latitude: '10.123000',
          longitude: '106.456000',
          is_visible: true,
          crop_season_id: validSeasonId,
          season_plot_id: 'other-plot-id', // Does not match
          crop_type: 'ST25',
          expected_yield: '1500.00'
        }],
        rowCount: 1
      });

      const res = await request(app)
        .get(`/api/v1/plots/${validPlotId}/summary?cropSeasonId=${validSeasonId}`)
        .set('X-Service-Key', serviceKey);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should return 409 SNAPSHOT_INCOMPLETE if plot is hidden', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [{
          plot_id: validPlotId,
          farmer_id: farmerId,
          area: '2500.50',
          latitude: '10.123000',
          longitude: '106.456000',
          is_visible: false, // Plot hidden
          crop_season_id: validSeasonId,
          season_plot_id: validPlotId,
          crop_type: 'ST25',
          expected_yield: '1500.00'
        }],
        rowCount: 1
      });

      const res = await request(app)
        .get(`/api/v1/plots/${validPlotId}/summary?cropSeasonId=${validSeasonId}`)
        .set('X-Service-Key', serviceKey);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('SNAPSHOT_INCOMPLETE');
    });

    it('should return 409 SNAPSHOT_INCOMPLETE if GPS or cropType is missing in old data', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [{
          plot_id: validPlotId,
          farmer_id: farmerId,
          area: '2500.50',
          latitude: null, // Missing GPS
          longitude: null,
          is_visible: true,
          crop_season_id: validSeasonId,
          season_plot_id: validPlotId,
          crop_type: 'ST25',
          expected_yield: '1500.00'
        }],
        rowCount: 1
      });

      const res = await request(app)
        .get(`/api/v1/plots/${validPlotId}/summary?cropSeasonId=${validSeasonId}`)
        .set('X-Service-Key', serviceKey);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('SNAPSHOT_INCOMPLETE');
    });

    it('should return 200 with valid snapshot when data is complete', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [{
          plot_id: validPlotId,
          farmer_id: farmerId,
          area: '2500.50',
          latitude: '10.123000',
          longitude: '106.456000',
          is_visible: true,
          crop_season_id: validSeasonId,
          season_plot_id: validPlotId,
          crop_type: 'ST25',
          expected_yield: '1500.00'
        }],
        rowCount: 1
      });

      const res = await request(app)
        .get(`/api/v1/plots/${validPlotId}/summary?cropSeasonId=${validSeasonId}`)
        .set('X-Service-Key', serviceKey);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        plotId: validPlotId,
        farmerId: farmerId,
        area: 2500.5,
        latitude: 10.123,
        longitude: 106.456,
        currentSeason: {
          cropSeasonId: validSeasonId,
          cropType: 'ST25',
          expectedYield: 1500
        }
      });
    });
  });
});
