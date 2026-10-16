const { Pool } = require('pg');
const { createDatabase } = require('./lib/postgres');

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  throw new Error('Defina DATABASE_URL com a URL de conexão do PostgreSQL.');
}
try {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) throw new Error();
} catch {
  throw new Error('DATABASE_URL deve ser uma URL PostgreSQL válida (postgresql://usuario:senha@host:5432/banco).');
}
const pool = new Pool({ connectionString,
  connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000, max: 10 });
pool.on('error', (error) => console.error('Erro de conexão PostgreSQL:', error.message));
module.exports = createDatabase(pool);
