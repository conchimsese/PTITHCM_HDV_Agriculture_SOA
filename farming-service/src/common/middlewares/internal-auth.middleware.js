const env = require('../../config/env');
const { UnauthorizedError, ForbiddenError } = require('../errors/app-error');

/**
 * Middleware for internal service-to-service communication
 * Authenticates caller via X-Service-Key header
 */
function authenticateServiceKey(req, res, next) {
  const serviceKey = req.headers['x-service-key'];
  if (!serviceKey) {
    return next(new UnauthorizedError('Missing X-Service-Key header'));
  }

  if (serviceKey !== env.TRADING_SERVICE_KEY) {
    return next(new ForbiddenError('Invalid service key for internal communication'));
  }

  next();
}

module.exports = {
  authenticateServiceKey
};
