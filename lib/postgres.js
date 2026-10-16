const schema = `
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY, nome TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL, tipo TEXT NOT NULL DEFAULT 'funcionaria'
);
CREATE TABLE IF NOT EXISTS registros (
  id SERIAL PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  data TEXT NOT NULL, meta_diaria DOUBLE PRECISION NOT NULL,
  realizada DOUBLE PRECISION NOT NULL, numero_vendas INTEGER NOT NULL,
  contatos INTEGER NOT NULL DEFAULT 0, retorno_contatos INTEGER NOT NULL DEFAULT 0,
  prospeccao INTEGER NOT NULL DEFAULT 0, clientes_novos INTEGER NOT NULL DEFAULT 0,
  balde INTEGER NOT NULL DEFAULT 0, UNIQUE(usuario_id, data)
);
CREATE TABLE IF NOT EXISTS metas_mensais (
  id SERIAL PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  mes INTEGER NOT NULL, ano INTEGER NOT NULL, meta DOUBLE PRECISION NOT NULL,
  UNIQUE(usuario_id, mes, ano)
);
CREATE TABLE IF NOT EXISTS recuperacoes_senha (
  usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, expire TIMESTAMPTZ NOT NULL,
  solicitado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sessoes (
  sid TEXT PRIMARY KEY, sess JSON NOT NULL, expire TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessoes_expire_idx ON sessoes(expire);
`;
function createDatabase(pool) {
  let ready;
  return {
    dialect: 'postgres', pool,
    initialize() { return ready ||= pool.query(schema); },
    prepare(sql) {
      let index = 0;
      const text = sql.replace(/\?/g, () => '$' + (++index));
      return {
        async get(...params) { return (await pool.query(text, params)).rows[0]; },
        async all(...params) { return (await pool.query(text, params)).rows; },
        async run(...params) {
          const returning = /^\s*INSERT\s+INTO\s+(usuarios|registros|metas_mensais)\b/i.test(text) && !/\bRETURNING\b/i.test(text);
          const result = await pool.query(text + (returning ? ' RETURNING id' : ''), params);
          return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
        },
      };
    },
    close() { return pool.end(); },
  };
}
module.exports = { createDatabase, schema };
