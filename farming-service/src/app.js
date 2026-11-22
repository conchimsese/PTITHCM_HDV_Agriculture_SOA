const express = require('express');
const cors = require('cors');
const errorHandler = require('./common/middlewares/error-handler');
const notFoundHandler = require('./common/middlewares/not-found.handler');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'farming-service',
    timestamp: new Date().toISOString()
  });
});

// Root API Welcome / Status
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'Farming Service',
    version: '1.0.0',
    status: 'RUNNING'
  });
});

// API v1 routes
const apiRouter = require('./routes');
app.use('/api/v1', apiRouter);

// Test routes for Error Handling verification in test environment
if (process.env.NODE_ENV === 'test') {
  const { ValidationError, ForbiddenError } = require('./common/errors/app-error');
  app.get('/test-error/validation', (req, res, next) => {
    next(new ValidationError('Invalid parameter provided'));
  });
  app.get('/test-error/forbidden', (req, res, next) => {
    next(new ForbiddenError('Access denied', 'ACCOUNT_NOT_ACTIVE'));
  });
}

// 404 Not Found Handler (must be registered after all routes)
app.use(notFoundHandler);

// Centralized Error Handler (must be registered last)
app.use(errorHandler);

module.exports = app;
