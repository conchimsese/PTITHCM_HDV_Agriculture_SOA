const request = require('supertest');
const app = require('../src/app');
const { ValidationError, ForbiddenError } = require('../src/common/errors/app-error');

describe('Phase 1: Foundation & Error Handling Tests', () => {
  it('GET /health should return 200 and status UP', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'UP');
    expect(res.body).toHaveProperty('service', 'farming-service');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET / should return 200 and service metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('service', 'Farming Service');
    expect(res.body).toHaveProperty('status', 'RUNNING');
  });

  it('GET /api/v1/not-found should return 404 conforming to Section 10 Error Contract', async () => {
    const res = await request(app).get('/api/v1/not-found');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('status', 404);
    expect(res.body).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('path', '/api/v1/not-found');
  });

  it('Should handle AppError subclasses with correct code and status', async () => {
    const valRes = await request(app).get('/test-error/validation');
    expect(valRes.status).toBe(400);
    expect(valRes.body.code).toBe('VALIDATION_ERROR');
    expect(valRes.body.message).toBe('Invalid parameter provided');
    expect(valRes.body.path).toBe('/test-error/validation');

    const forbRes = await request(app).get('/test-error/forbidden');
    expect(forbRes.status).toBe(403);
    expect(forbRes.body.code).toBe('ACCOUNT_NOT_ACTIVE');
    expect(forbRes.body.message).toBe('Access denied');
    expect(forbRes.body.path).toBe('/test-error/forbidden');
  });
});
