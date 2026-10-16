const { newDb } = require('pg-mem');
const { createDatabase } = require('../../lib/postgres');
module.exports = function testDatabase() {
  const memory = newDb();
  memory.public.registerFunction({ name: 'substr', args: ['text', 'integer', 'integer'], returns: 'text', implementation: (text, start, length) => text.slice(start - 1, start - 1 + length) });
  const { Pool } = memory.adapters.createPg();
  const db = createDatabase(new Pool());
  require.cache[require.resolve('../../database')] = { exports: db };
  return db;
};
