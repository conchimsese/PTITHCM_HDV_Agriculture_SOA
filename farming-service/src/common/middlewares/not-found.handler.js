/**
 * 404 Not Found Middleware
 * Returns standard Section 10 error response when route is not found
 */
function notFoundHandler(req, res, next) {
  const status = 404;
  const code = 'NOT_FOUND';
  const message = `Route ${req.method} ${req.originalUrl || req.url} not found`;

  return res.status(status).json({
    timestamp: new Date().toISOString(),
    status,
    code,
    message,
    path: req.originalUrl || req.url
  });
}

module.exports = notFoundHandler;
