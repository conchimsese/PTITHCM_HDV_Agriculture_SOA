const app = require('./app');
const env = require('./config/env');

const server = app.listen(env.PORT, () => {
  console.log(`[FARMING SERVICE] Server is running on port ${env.PORT} in ${env.NODE_ENV} mode.`);
});

// Graceful Shutdown
function handleShutdown(signal) {
  console.log(`[FARMING SERVICE] Received ${signal}. Gracefully shutting down...`);
  server.close(() => {
    console.log('[FARMING SERVICE] HTTP server closed.');
    process.exit(0);
  });

  // Force close after 10s if graceful shutdown hangs
  setTimeout(() => {
    console.error('[FARMING SERVICE] Forcing server shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = server;
