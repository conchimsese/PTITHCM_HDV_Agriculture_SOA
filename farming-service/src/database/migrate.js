const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

/**
 * Migration Runner for Farming Service
 */
async function runMigrations() {
  console.log('[MIGRATION] Starting database migration check...');
  const client = await pool.connect();

  try {
    // 1. Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migration versions
    const appliedResult = await client.query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(appliedResult.rows.map(r => r.version));

    // 3. Read migration files from directory
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('[MIGRATION] No migrations directory found.');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let appliedCount = 0;

    for (const file of files) {
      if (appliedVersions.has(file)) {
        continue;
      }

      console.log(`[MIGRATION] Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Execute migration within transaction
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[MIGRATION] Successfully applied: ${file}`);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[MIGRATION ERROR] Failed applying ${file}:`, err.message);
        throw err;
      }
    }

    if (appliedCount === 0) {
      console.log('[MIGRATION] Database is already up to date. No new migrations applied.');
    } else {
      console.log(`[MIGRATION] Successfully applied ${appliedCount} migration(s).`);
    }
  } finally {
    client.release();
  }
}

// Execute directly if run as a script
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[MIGRATION] Completed successfully.');
      pool.end();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[MIGRATION FAILED]', err.message);
      console.error('\n[HINT] Please verify that PostgreSQL is running and DATABASE_URL in .env is correctly configured.');
      pool.end();
      process.exit(1);
    });
}

module.exports = {
  runMigrations
};
