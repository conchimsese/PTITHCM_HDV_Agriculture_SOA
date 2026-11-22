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

describe('Phase 3: Plots and Crop Seasons (9 APIs)', () => {
  const farmer1 = '11111111-1111-1111-1111-111111111111';
  const farmer2 = '22222222-2222-2222-2222-222222222222';
  const farmer1Token = generateToken(farmer1, 'FARMER');
  const farmer2Token = generateToken(farmer2, 'FARMER');
  const traderToken = generateToken(farmer1, 'TRADER');

  beforeEach(() => {
    // Enable bypass for user service HTTP in tests by default unless specifically overridden
    process.env.BYPASS_USER_SERVICE = 'true';
    jest.restoreAllMocks();
  });

  describe('Authentication & Access State on /api/v1/plots', () => {
    it('should return 401 UNAUTHORIZED if no token provided', async () => {
      const res = await request(app).get('/api/v1/plots');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN if token role is not FARMER', async () => {
      const res = await request(app)
        .get('/api/v1/plots')
        .set('Authorization', `Bearer ${traderToken}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });
  });

  describe('6.1 Create Plot: POST /api/v1/plots', () => {
    it('should return 400 VALIDATION_ERROR if required fields are missing or area <= 0', async () => {
      const res = await request(app)
        .post('/api/v1/plots')
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({
          name: 'Ruộng A1',
          area: -10, // Invalid
          location: 'An Giang'
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should create plot and return 201 on valid input', async () => {
      const mockCreatedRow = {
        plot_id: '99999999-9999-9999-9999-999999999999',
        farmer_id: farmer1,
        name: 'Ruộng A1',
        area: '2500.50',
        location: 'An Giang',
        description: 'Ruộng lúa Đông Xuân',
        latitude: '10.123000',
        longitude: '106.456000',
        is_visible: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [mockCreatedRow],
        rowCount: 1
      });

      const res = await request(app)
        .post('/api/v1/plots')
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({
          name: 'Ruộng A1',
          area: 2500.5,
          location: 'An Giang',
          description: 'Ruộng lúa Đông Xuân',
          latitude: 10.123,
          longitude: 106.456
        });

      expect(res.status).toBe(201);
      expect(res.body.plotId).toBe('99999999-9999-9999-9999-999999999999');
      expect(res.body.farmerId).toBe(farmer1);
      expect(res.body.name).toBe('Ruộng A1');
      expect(res.body.area).toBe(2500.5);
      expect(res.body.latitude).toBe(10.123);
      expect(res.body.longitude).toBe(106.456);
      expect(res.body.isVisible).toBe(true);
    });
  });

  describe("6.2 Get Farmer's Plots: GET /api/v1/plots", () => {
    it('should return paginated list of plots', async () => {
      const mockRows = [
        {
          plot_id: '99999999-9999-9999-9999-999999999999',
          farmer_id: farmer1,
          name: 'Ruộng A1',
          area: '2500.50',
          location: 'An Giang',
          description: 'Ruộng lúa',
          latitude: '10.123000',
          longitude: '106.456000',
          is_visible: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      jest.spyOn(db, 'query')
        .mockResolvedValueOnce({ rows: mockRows, rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 });

      const res = await request(app)
        .get('/api/v1/plots?page=0&size=20')
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body.items).toHaveLength(1);
      expect(res.body.page).toBe(0);
      expect(res.body.size).toBe(20);
      expect(res.body.totalElements).toBe(1);
      expect(res.body.totalPages).toBe(1);
    });
  });

  describe('6.3 Get Plot Detail: GET /api/v1/plots/{plotId}', () => {
    const validPlotId = '99999999-9999-9999-9999-999999999999';

    it('should return 404 NOT_FOUND if plot does not exist', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get(`/api/v1/plots/${validPlotId}`)
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should return 403 FORBIDDEN if plot belongs to another farmer', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [{
          plot_id: validPlotId,
          farmer_id: farmer2, // Belong to farmer 2
          name: 'Ruộng B'
        }],
        rowCount: 1
      });

      const res = await request(app)
        .get(`/api/v1/plots/${validPlotId}`)
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should return plot detail when owner requests it', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [{
          plot_id: validPlotId,
          farmer_id: farmer1,
          name: 'Ruộng A1',
          area: '2500.50',
          location: 'An Giang',
          latitude: '10.123000',
          longitude: '106.456000',
          is_visible: false // Owner can view even if hidden
        }],
        rowCount: 1
      });

      const res = await request(app)
        .get(`/api/v1/plots/${validPlotId}`)
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.plotId).toBe(validPlotId);
      expect(res.body.isVisible).toBe(false);
    });
  });

  describe('6.4 Update Plot: PUT /api/v1/plots/{plotId}', () => {
    const validPlotId = '99999999-9999-9999-9999-999999999999';

    it('should update plot and return 200 on valid input by owner', async () => {
      // 1st query: findById check
      jest.spyOn(db, 'query')
        .mockResolvedValueOnce({
          rows: [{ plot_id: validPlotId, farmer_id: farmer1, name: 'Old Name' }],
          rowCount: 1
        })
        // 2nd query: update
        .mockResolvedValueOnce({
          rows: [{
            plot_id: validPlotId,
            farmer_id: farmer1,
            name: 'Ruộng A1 - Updated',
            area: '2600.00',
            location: 'An Giang',
            latitude: '10.123000',
            longitude: '106.456000',
            is_visible: true
          }],
          rowCount: 1
        });

      const res = await request(app)
        .put(`/api/v1/plots/${validPlotId}`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({
          name: 'Ruộng A1 - Updated',
          area: 2600.0,
          location: 'An Giang',
          description: 'Ruộng lúa',
          latitude: 10.123,
          longitude: 106.456
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Ruộng A1 - Updated');
      expect(res.body.area).toBe(2600);
    });
  });

  describe('6.5 Hide/Show Plot: PATCH /api/v1/plots/{plotId}/visibility', () => {
    const validPlotId = '99999999-9999-9999-9999-999999999999';

    it('should update visibility and return 200 { plotId, isVisible }', async () => {
      jest.spyOn(db, 'query')
        .mockResolvedValueOnce({
          rows: [{ plot_id: validPlotId, farmer_id: farmer1 }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{ plot_id: validPlotId, is_visible: false }],
          rowCount: 1
        });

      const res = await request(app)
        .patch(`/api/v1/plots/${validPlotId}/visibility`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({ isVisible: false });

      expect(res.status).toBe(200);
      expect(res.body.plotId).toBe(validPlotId);
      expect(res.body.isVisible).toBe(false);
    });
  });

  describe('6.6 Create Crop Season: POST /api/v1/plots/{plotId}/crop-seasons', () => {
    const validPlotId = '99999999-9999-9999-9999-999999999999';

    it('should return 400 VALIDATION_ERROR if cropType is missing or empty', async () => {
      const res = await request(app)
        .post(`/api/v1/plots/${validPlotId}/crop-seasons`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({
          seasonName: 'Đông Xuân 2026',
          startDate: '2026-11-01',
          expectedYield: 1500,
          cropType: '' // Invalid
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 FORBIDDEN if plot belongs to another farmer', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [{ plot_id: validPlotId, farmer_id: farmer2 }],
        rowCount: 1
      });

      const res = await request(app)
        .post(`/api/v1/plots/${validPlotId}/crop-seasons`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({
          seasonName: 'Đông Xuân 2026',
          startDate: '2026-11-01',
          expectedYield: 1500,
          cropType: 'ST25'
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should create crop season with status IN_PROGRESS and return 201', async () => {
      jest.spyOn(db, 'query')
        .mockResolvedValueOnce({
          rows: [{ plot_id: validPlotId, farmer_id: farmer1 }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{
            crop_season_id: '88888888-8888-8888-8888-888888888888',
            plot_id: validPlotId,
            season_name: 'Đông Xuân 2026',
            start_date: '2026-11-01',
            end_date: null,
            status: 'IN_PROGRESS',
            expected_yield: '1500.00',
            actual_yield: null,
            crop_type: 'ST25'
          }],
          rowCount: 1
        });

      const res = await request(app)
        .post(`/api/v1/plots/${validPlotId}/crop-seasons`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({
          seasonName: 'Đông Xuân 2026',
          startDate: '2026-11-01',
          expectedYield: 1500,
          cropType: 'ST25'
        });

      expect(res.status).toBe(201);
      expect(res.body.cropSeasonId).toBe('88888888-8888-8888-8888-888888888888');
      expect(res.body.status).toBe('IN_PROGRESS');
      expect(res.body.cropType).toBe('ST25');
      expect(res.body.expectedYield).toBe(1500);
    });
  });

  describe('6.7 Get Crop Season Detail: GET /api/v1/crop-seasons/{cropSeasonId}', () => {
    const validSeasonId = '88888888-8888-8888-8888-888888888888';

    it('should return 404 NOT_FOUND if crop season not found', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get(`/api/v1/crop-seasons/${validSeasonId}`)
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should return 200 with crop season detail for owner', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [{
          crop_season_id: validSeasonId,
          plot_id: '99999999-9999-9999-9999-999999999999',
          farmer_id: farmer1,
          season_name: 'Đông Xuân 2026',
          status: 'IN_PROGRESS',
          crop_type: 'ST25'
        }],
        rowCount: 1
      });

      const res = await request(app)
        .get(`/api/v1/crop-seasons/${validSeasonId}`)
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.cropSeasonId).toBe(validSeasonId);
      expect(res.body.cropType).toBe('ST25');
    });
  });

  describe('6.8 Update Crop Season: PUT /api/v1/crop-seasons/{cropSeasonId}', () => {
    const validSeasonId = '88888888-8888-8888-8888-888888888888';

    it('should return 400 VALIDATION_ERROR if attempting to blank cropType', async () => {
      const res = await request(app)
        .put(`/api/v1/crop-seasons/${validSeasonId}`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({
          seasonName: 'Đông Xuân 2026',
          startDate: '2026-11-01',
          cropType: '' // Blanking cropType
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should update crop season and return 200', async () => {
      jest.spyOn(db, 'query')
        .mockResolvedValueOnce({
          rows: [{ crop_season_id: validSeasonId, farmer_id: farmer1, status: 'IN_PROGRESS' }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{
            crop_season_id: validSeasonId,
            season_name: 'Đông Xuân 2026',
            expected_yield: '1550.00',
            status: 'IN_PROGRESS',
            crop_type: 'ST25'
          }],
          rowCount: 1
        });

      const res = await request(app)
        .put(`/api/v1/crop-seasons/${validSeasonId}`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({
          seasonName: 'Đông Xuân 2026',
          startDate: '2026-11-01',
          expectedYield: 1550,
          cropType: 'ST25'
        });

      expect(res.status).toBe(200);
      expect(res.body.cropSeasonId).toBe(validSeasonId);
      expect(res.body.expectedYield).toBe(1550);
      expect(res.body.status).toBe('IN_PROGRESS');
    });
  });

  describe('6.9 Complete Crop Season: PATCH /api/v1/crop-seasons/{cropSeasonId}/complete', () => {
    const validSeasonId = '88888888-8888-8888-8888-888888888888';

    it('should return 409 CONFLICT if season is already COMPLETED', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [{
          crop_season_id: validSeasonId,
          farmer_id: farmer1,
          status: 'COMPLETED' // Already completed
        }],
        rowCount: 1
      });

      const res = await request(app)
        .patch(`/api/v1/crop-seasons/${validSeasonId}/complete`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({ actualYield: 1420 });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CONFLICT');
    });

    it('should complete crop season and set status to COMPLETED with actualYield', async () => {
      jest.spyOn(db, 'query')
        .mockResolvedValueOnce({
          rows: [{
            crop_season_id: validSeasonId,
            farmer_id: farmer1,
            status: 'IN_PROGRESS'
          }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{
            crop_season_id: validSeasonId,
            status: 'COMPLETED',
            actual_yield: '1420.00'
          }],
          rowCount: 1
        });

      const res = await request(app)
        .patch(`/api/v1/crop-seasons/${validSeasonId}/complete`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({ actualYield: 1420 });

      expect(res.status).toBe(200);
      expect(res.body.cropSeasonId).toBe(validSeasonId);
      expect(res.body.status).toBe('COMPLETED');
      expect(res.body.actualYield).toBe(1420);
    });
  });
});
