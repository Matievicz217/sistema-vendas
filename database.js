if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  const { createDatabase } = require('./lib/postgres');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000, max: 10 });
  pool.on('error', (error) => console.error('Erro de conexão PostgreSQL:', error.message));
  module.exports = createDatabase(pool);
} else {
  module.exports = require('./lib/sqlite');
  module.exports.dialect = 'sqlite';
  module.exports.initialize = async () => {};
}
