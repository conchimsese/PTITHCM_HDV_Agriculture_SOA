const { AppError } = require('../errors/app-error');

/**
 * Global Error Handling Middleware
 * Adheres strictly to Section 10 Error Contract:
 * {
 *   "timestamp": "2026-09-25T10:00:00Z",
 *   "status": 400,
 *   "code": "VALIDATION_ERROR",
 *   "message": "Invalid request",
 *   "path": "/api/..."
 * }
 */
function errorHandler(err, req, res, next) {
  let status = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'Internal server error';

  if (err instanceof AppError) {
    status = err.statusCode;
    code = err.code;
    message = err.message;
  } else if (err.name === 'ZodError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    // Format friendly Zod error message
    const issues = err.issues || err.errors || [];
    message = issues.length > 0 
      ? issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      : 'Validation failed';
  } else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Malformed JSON in request body';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    code = 'UNAUTHORIZED';
    message = err.message || 'Invalid or expired token';
  } else {
    // Unhandled exception
    if (process.env.NODE_ENV !== 'test') {
      console.error('[UNHANDLED ERROR]', err);
    }
    message = err.message || 'An unexpected error occurred';
  }

  // Response matches Section 10 contract precisely
  const errorResponse = {
    timestamp: new Date().toISOString(),
    status,
    code,
    message,
    path: req.originalUrl || req.url
  };

  return res.status(status).json(errorResponse);
}

module.exports = errorHandler;
