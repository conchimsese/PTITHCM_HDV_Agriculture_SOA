const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const db = require('../src/config/database');

const privateKey = fs.readFileSync(path.resolve(__dirname, '../keys/private.pem'), 'utf8');

function generateToken(accountId = '11111111-1111-1111-1111-111111111111', role = 'FARMER') {
  return jwt.sign(
    { sub: accountId, role },
    privateKey,
    {
      algorithm: 'RS256',
      issuer: 'urn:soa:user-service',
      audience: 'soa-api',
      expiresIn: '15m'
    }
  );
}

describe('Phase 5: Reports & PDF Export (2 APIs)', () => {
  const farmer1 = '11111111-1111-1111-1111-111111111111';
  const farmer2 = '22222222-2222-2222-2222-222222222222';
  const farmer1Token = generateToken(farmer1, 'FARMER');
  const farmer2Token = generateToken(farmer2, 'FARMER');

  const validSeasonId = '88888888-8888-8888-8888-888888888888';
  const validPlotId = '99999999-9999-9999-9999-999999999999';

  const mockSeasonPlotRow = {
    crop_season_id: validSeasonId,
    season_name: 'Đông Xuân 2026',
    start_date: '2026-11-01',
    end_date: null,
    status: 'IN_PROGRESS',
    crop_type: 'ST25',
    expected_yield: '1500.00',
    actual_yield: '1420.00',
    season_created_at: new Date(),
    season_updated_at: new Date(),
    plot_id: validPlotId,
    farmer_id: farmer1,
    plot_name: 'Ruộng A1',
    area: '2500.50',
    location: 'An Giang',
    plot_description: 'Ruộng lúa Đông Xuân',
    latitude: '10.123000',
    longitude: '106.456000',
    plot_is_visible: true
  };

  const mockLogs = [
    {
      log_id: '77777777-7777-7777-7777-777777777777',
      crop_season_id: validSeasonId,
      work_type: 'FERTILIZING',
      work_date: '2026-11-20',
      description: 'Bón phân lần 1',
      quantity: '50.00',
      unit: 'kg',
      is_visible: true
    }
  ];

  const mockCosts = [
    {
      cost_id: '66666666-6666-6666-6666-666666666666',
      crop_season_id: validSeasonId,
      category: 'FERTILIZER',
      amount: '850000.00',
      incurred_date: '2026-11-20',
      description: 'Phân bón đợt 1',
      is_visible: true
    },
    {
      cost_id: '66666666-6666-6666-6666-666666666667',
      crop_season_id: validSeasonId,
      category: 'SEED',
      amount: '150000.00',
      incurred_date: '2026-11-01',
      description: 'Giống ST25',
      is_visible: true
    }
  ];

  beforeEach(() => {
    process.env.BYPASS_USER_SERVICE = 'true';
    jest.restoreAllMocks();
  });

  describe('6.16 Get Farming Report: GET /api/v1/crop-seasons/{cropSeasonId}/report', () => {
    it('should return 404 NOT_FOUND if crop season does not exist', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get(`/api/v1/crop-seasons/${validSeasonId}/report`)
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should return 403 FORBIDDEN if crop season belongs to another farmer', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [{ ...mockSeasonPlotRow, farmer_id: farmer2 }],
        rowCount: 1
      });

      const res = await request(app)
        .get(`/api/v1/crop-seasons/${validSeasonId}/report`)
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should return 200 with complete report JSON and computed summary', async () => {
      jest.spyOn(db, 'query')
        .mockResolvedValueOnce({ rows: [mockSeasonPlotRow], rowCount: 1 }) // season with plot
        .mockResolvedValueOnce({ rows: mockLogs, rowCount: 1 })           // logs
        .mockResolvedValueOnce({ rows: mockCosts, rowCount: 2 });          // costs

      const res = await request(app)
        .get(`/api/v1/crop-seasons/${validSeasonId}/report`)
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('cropSeason');
      expect(res.body).toHaveProperty('plot');
      expect(res.body).toHaveProperty('farmingLogs');
      expect(res.body).toHaveProperty('costs');
      expect(res.body).toHaveProperty('summary');

      expect(res.body.cropSeason.cropSeasonId).toBe(validSeasonId);
      expect(res.body.plot.plotId).toBe(validPlotId);
      expect(res.body.farmingLogs).toHaveLength(1);
      expect(res.body.costs).toHaveLength(2);

      // totalCost = 850000 + 150000 = 1000000
      expect(res.body.summary.totalCost).toBe(1000000);
      expect(res.body.summary.expectedYield).toBe(1500);
      expect(res.body.summary.actualYield).toBe(1420);
    });
  });

  describe('6.17 Export Farming Report PDF: GET /api/v1/crop-seasons/{cropSeasonId}/report/pdf', () => {
    it('should return 200 and application/pdf binary stream', async () => {
      jest.spyOn(db, 'query')
        .mockResolvedValueOnce({ rows: [mockSeasonPlotRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: mockLogs, rowCount: 1 })
        .mockResolvedValueOnce({ rows: mockCosts, rowCount: 2 });

      const res = await request(app)
        .get(`/api/v1/crop-seasons/${validSeasonId}/report/pdf`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .expect('Content-Type', /application\/pdf/);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Buffer);
      // Valid PDF buffer starts with %PDF
      const header = res.body.slice(0, 5).toString('ascii');
      expect(header).toContain('%PDF');
    });
  });
});
