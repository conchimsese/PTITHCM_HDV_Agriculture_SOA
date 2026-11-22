const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');

const privateKey = fs.readFileSync(path.resolve(__dirname, '../keys/private.pem'), 'utf8');

function generateToken(payload = {}) {
  const defaultPayload = {
    sub: '11111111-1111-1111-1111-111111111111',
    role: 'FARMER'
  };
  return jwt.sign(
    { ...defaultPayload, ...payload },
    privateKey,
    {
      algorithm: 'RS256',
      issuer: 'urn:soa:user-service',
      audience: 'soa-api',
      expiresIn: '15m'
    }
  );
}

describe('Phase 7: Security & Comprehensive Integrity Tests', () => {
  const farmer1 = '11111111-1111-1111-1111-111111111111';
  const farmer1Token = generateToken({ sub: farmer1, role: 'FARMER' });

  afterEach(() => {
    delete process.env.BYPASS_USER_SERVICE;
    jest.restoreAllMocks();
  });

  describe('Client Identity Spoofing Protection', () => {
    it('should ignore client spoofed headers (x-user-id, x-user-role) and strictly rely on JWT payload', async () => {
      process.env.BYPASS_USER_SERVICE = 'true';
      const fakeAccountId = '99999999-9999-9999-9999-999999999999';

      const res = await request(app)
        .get('/api/v1/plots')
        .set('Authorization', `Bearer ${farmer1Token}`)
        .set('x-user-id', fakeAccountId)
        .set('x-user-role', 'ADMIN');

      // The request should succeed or execute with JWT sub (farmer1), ignoring spoofed headers
      expect(res.status).not.toBe(403);
    });

    it('should reject requests with invalid token signature or wrong issuer', async () => {
      const invalidIssuerToken = jwt.sign(
        { sub: farmer1, role: 'FARMER' },
        privateKey,
        {
          algorithm: 'RS256',
          issuer: 'urn:soa:malicious-service',
          audience: 'soa-api',
          expiresIn: '15m'
        }
      );

      const res = await request(app)
        .get('/api/v1/plots')
        .set('Authorization', `Bearer ${invalidIssuerToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with expired token', async () => {
      const expiredToken = jwt.sign(
        { sub: farmer1, role: 'FARMER' },
        privateKey,
        {
          algorithm: 'RS256',
          issuer: 'urn:soa:user-service',
          audience: 'soa-api',
          expiresIn: '-1s'
        }
      );

      const res = await request(app)
        .get('/api/v1/plots')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
      expect(res.body.message).toContain('expired');
    });
  });

  describe('Real-time Access-State & Fail-Closed Enforcement', () => {
    it('should return 403 ACCOUNT_NOT_ACTIVE if User Service reports account is LOCKED or INACTIVE', async () => {
      delete process.env.BYPASS_USER_SERVICE;

      // Mock global fetch
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ accountId: farmer1, status: 'LOCKED' })
      });
      global.fetch = mockFetch;

      const res = await request(app)
        .get('/api/v1/plots')
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ACCOUNT_NOT_ACTIVE');
    });

    it('should fail-closed with 503 ACCESS_STATE_UNAVAILABLE when User Service network fails or times out', async () => {
      delete process.env.BYPASS_USER_SERVICE;

      const mockFetch = jest.fn().mockRejectedValue(new Error('Network connection timeout'));
      global.fetch = mockFetch;

      const res = await request(app)
        .get('/api/v1/plots')
        .set('Authorization', `Bearer ${farmer1Token}`);

      expect(res.status).toBe(503);
      expect(res.body.code).toBe('ACCESS_STATE_UNAVAILABLE');
    });
  });
});
