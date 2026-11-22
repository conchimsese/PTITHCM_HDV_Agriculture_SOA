const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const env = require('../../config/env');
const { UnauthorizedError, ForbiddenError } = require('../errors/app-error');

let cachedPublicKey = null;

function getPublicKey() {
  if (cachedPublicKey) return cachedPublicKey;
  const keyPath = path.resolve(process.cwd(), env.JWT_PUBLIC_KEY_PATH);
  if (fs.existsSync(keyPath)) {
    cachedPublicKey = fs.readFileSync(keyPath, 'utf8');
    return cachedPublicKey;
  }
  throw new Error(`JWT Public Key file not found at ${keyPath}`);
}

/**
 * Authentication Middleware
 * Verifies JWT token signed with RS256 by User Service
 * Enforces role check (FARMER)
 */
function authenticateToken(allowedRoles = ['FARMER']) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new UnauthorizedError('Missing or invalid Authorization header'));
    }

    const token = authHeader.substring(7);

    try {
      const publicKey = getPublicKey();
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE
      });

      // Role authorization
      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        return next(new ForbiddenError(`Role ${decoded.role} is not permitted to perform this action`));
      }

      req.user = {
        accountId: decoded.sub,
        role: decoded.role
      };

      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new UnauthorizedError('Token has expired'));
      }
      return next(new UnauthorizedError('Invalid token signature or claims'));
    }
  };
}

module.exports = {
  authenticateToken
};
