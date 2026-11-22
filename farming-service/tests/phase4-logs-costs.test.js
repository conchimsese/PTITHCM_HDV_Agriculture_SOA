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

describe('Phase 4: Farming Logs & Costs (6 APIs)', () => {
  const farmer1 = '11111111-1111-1111-1111-111111111111';
  const farmer2 = '22222222-2222-2222-2222-222222222222';
  const farmer1Token = generateToken(farmer1, 'FARMER');
  const farmer2Token = generateToken(farmer2, 'FARMER');

  const validSeasonId = '88888888-8888-8888-8888-888888888888';
  const validLogId = '77777777-7777-7777-7777-777777777777';
  const validCostId = '66666666-6666-6666-6666-666666666666';

  beforeEach(() => {
    process.env.BYPASS_USER_SERVICE = 'true';
    jest.restoreAllMocks();
  });

  // ==========================================
  // FARMING LOGS TESTS
  // ==========================================
  describe('6.10 Create Farming Log: POST /api/v1/crop-seasons/{cropSeasonId}/logs', () => {
    it('should return 400 VALIDATION_ERROR if workType is not in allowlist', async () => {
      const res = await request(app)
        .post(`/api/v1/crop-seasons/${validSeasonId}/logs`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({
          workType: 'INVALID_TYPE',
          workDate: '2026-11-20',
          quantity: 50,
          unit: 'kg'
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 FORBIDDEN if crop season belongs to another farmer', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [{ crop_season_id: validSeasonId, farmer_id: farmer2 }],
        rowCount: 1
      });

      const res = await request(app)
        .post(`/api/v1/crop-seasons/${validSeasonId}/logs`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({
          workType: 'FERTILIZING',
          workDate: '2026-11-20',
          description: 'Bón phân lần 1',
          quantity: 50,
          unit: 'kg'
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should create farming log and return 201 on valid input', async () => {
      jest.spyOn(db, 'query')
        .mockResolvedValueOnce({
          rows: [{ crop_season_id: validSeasonId, farmer_id: farmer1 }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{
            log_id: validLogId,
            crop_season_id: validSeasonId,
            work_type: 'FERTILIZING',
            work_date: '2026-11-20',
            description: 'Bón phân lần 1',
            quantity: '50.00',
            unit: 'kg',
            is_visible: true
          }],
          rowCount: 1
        });

      const res = await request(app)
        .post(`/api/v1/crop-seasons/${validSeasonId}/logs`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({
          workType: 'FERTILIZING',
          workDate: '2026-11-20',
          description: 'Bón phân lần 1',
          quantity: 50,
          unit: 'kg'
        });

      expect(res.status).toBe(201);
      expect(res.body.logId).toBe(validLogId);
      expect(res.body.workType).toBe('FERTILIZING');
      expect(res.body.quantity).toBe(50);
      expect(res.body.unit).toBe('kg');
    });
  });

  describe('6.11 Update Farming Log: PATCH /api/v1/logs/{logId}', () => {
    it('should return 400 VALIDATION_ERROR if request body is empty', async () => {
      const res = await request(app)
        .patch(`/api/v1/logs/${validLogId}`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR if extra forbidden fields are sent (e.g. logId, cropSeasonId)', async () => {
      const res = await request(app)
        .patch(`/api/v1/logs/${validLogId}`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({
          logId: 'hack',
          description: 'update'
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should update partial fields and allow description to be null (cleared)', async () => {
      jest.spyOn(db, 'query')
        .mockResolvedValueOnce({
          rows: [{ log_id: validLogId, farmer_id: farmer1 }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{
            log_id: validLogId,
            crop_season_id: validSeasonId,
            work_type: 'FERTILIZING',
            work_date: '2026-11-20',
            description: null,
            quantity: '40.00',
            unit: 'kg',
            is_visible: true
          }],
          rowCount: 1
        });

      const res = await request(app)
        .patch(`/api/v1/logs/${validLogId}`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({
          description: null,
          quantity: 40
        });

      expect(res.status).toBe(200);
      expect(res.body.logId).toBe(validLogId);
      expect(res.body.description).toBeNull();
      expect(res.body.quantity).toBe(40);
      expect(res.body.isVisible).toBe(true);
    });
  });

  describe('6.12 Hide Farming Log: PATCH /api/v1/logs/{logId}/visibility', () => {
    it('should update visibility to false and return 200 { logId, isVisible }', async () => {
      jest.spyOn(db, 'query')
        .mockResolvedValueOnce({
          rows: [{ log_id: validLogId, farmer_id: farmer1 }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{ log_id: validLogId, is_visible: false }],
          rowCount: 1
        });

      const res = await request(app)
        .patch(`/api/v1/logs/${validLogId}/visibility`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({ isVisible: false });

      expect(res.status).toBe(200);
      expect(res.body.logId).toBe(validLogId);
      expect(res.body.isVisible).toBe(false);
    });
  });

  // ==========================================
  // COSTS TESTS
  // ==========================================
  describe('6.13 Create Cost: POST /api/v1/crop-seasons/{cropSeasonId}/costs', () => {
    it('should return 400 VALIDATION_ERROR on negative amount or missing category', async () => {
      const res = await request(app)
        .post(`/api/v1/crop-seasons/${validSeasonId}/costs`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({
          category: '',
          amount: -500,
          incurredDate: '2026-11-20'
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should create cost and return 201 with amount as decimal string', async () => {
      jest.spyOn(db, 'query')
        .mockResolvedValueOnce({
          rows: [{ crop_season_id: validSeasonId, farmer_id: farmer1 }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{
            cost_id: validCostId,
            crop_season_id: validSeasonId,
            category: 'FERTILIZER',
            amount: '850000.00',
            incurred_date: '2026-11-20',
            description: 'Phân bón lần 1',
            is_visible: true
          }],
          rowCount: 1
        });

      const res = await request(app)
        .post(`/api/v1/crop-seasons/${validSeasonId}/costs`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({
          category: 'FERTILIZER',
          amount: '850000.00',
          incurredDate: '2026-11-20',
          description: 'Phân bón lần 1'
        });

      expect(res.status).toBe(201);
      expect(res.body.costId).toBe(validCostId);
      expect(res.body.category).toBe('FERTILIZER');
      expect(res.body.amount).toBe('850000.00');
    });
  });

  describe('6.14 Update Cost: PATCH /api/v1/costs/{costId}', () => {
    it('should update cost amount and return 200 with isVisible included', async () => {
      jest.spyOn(db, 'query')
        .mockResolvedValueOnce({
          rows: [{ cost_id: validCostId, farmer_id: farmer1 }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{
            cost_id: validCostId,
            crop_season_id: validSeasonId,
            category: 'FERTILIZER',
            amount: '900000.00',
            incurred_date: '2026-11-20',
            description: 'Phân bón lần 1',
            is_visible: true
          }],
          rowCount: 1
        });

      const res = await request(app)
        .patch(`/api/v1/costs/${validCostId}`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({
          amount: '900000.00'
        });

      expect(res.status).toBe(200);
      expect(res.body.costId).toBe(validCostId);
      expect(res.body.amount).toBe('900000.00');
      expect(res.body.isVisible).toBe(true);
    });
  });

  describe('6.15 Hide Cost: PATCH /api/v1/costs/{costId}/visibility', () => {
    it('should update cost visibility to false and return 200 { costId, isVisible }', async () => {
      jest.spyOn(db, 'query')
        .mockResolvedValueOnce({
          rows: [{ cost_id: validCostId, farmer_id: farmer1 }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{ cost_id: validCostId, is_visible: false }],
          rowCount: 1
        });

      const res = await request(app)
        .patch(`/api/v1/costs/${validCostId}/visibility`)
        .set('Authorization', `Bearer ${farmer1Token}`)
        .send({ isVisible: false });

      expect(res.status).toBe(200);
      expect(res.body.costId).toBe(validCostId);
      expect(res.body.isVisible).toBe(false);
    });
  });
});
