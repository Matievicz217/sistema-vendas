require('dotenv').config();
const tables = {
  usuarios: ['id', 'nome', 'email', 'senha_hash', 'tipo'],
  registros: ['id', 'usuario_id', 'data', 'meta_diaria', 'realizada', 'numero_vendas', 'contatos', 'retorno_contatos', 'prospeccao', 'clientes_novos', 'balde'],
  metas_mensais: ['id', 'usuario_id', 'mes', 'ano', 'meta'],
};
async function migrate(source, pool, { apply = false } = {}) {
  // Snapshot consistente; a aplicação antiga deve permanecer sem novas gravações até a troca.
  const snapshot = source.transaction(() => Object.fromEntries(
    Object.entries(tables).map(([table, columns]) => [table, source.prepare('SELECT ' + columns.join(', ') + ' FROM ' + table + ' ORDER BY id').all()]),
  ))();
  const counts = Object.fromEntries(Object.entries(snapshot).map(([table, rows]) => [table, rows.length]));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE usuarios, registros, metas_mensais IN EXCLUSIVE MODE');
    for (const table of Object.keys(tables)) {
      const result = await client.query('SELECT COUNT(*) AS total FROM ' + table);
      if (Number(result.rows[0].total) !== 0) throw new Error('Destino precisa estar vazio: ' + table);
    }
    for (const [table, columns] of Object.entries(tables)) {
      const sql = 'INSERT INTO ' + table + ' (' + columns.join(', ') + ') VALUES (' + columns.map((_, i) => '$' + (i + 1)).join(', ') + ')';
      for (const row of snapshot[table]) await client.query(sql, columns.map(column => row[column]));
      const result = await client.query('SELECT COUNT(*) AS total FROM ' + table);
      if (Number(result.rows[0].total) !== counts[table]) throw new Error('Contagem divergente: ' + table);
    }
    if (apply) {
      for (const table of Object.keys(tables)) {
        // ALTER SEQUENCE é transacional, ao contrário de setval.
        const next = snapshot[table].reduce((max, row) => Math.max(max, row.id), 0) + 1;
        await client.query('ALTER SEQUENCE ' + table + '_id_seq RESTART WITH ' + next);
      }
      await client.query('COMMIT');
    } else await client.query('ROLLBACK');
    return { applied: apply, counts };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
async function main() {
  if (!process.env.DATABASE_URL || !process.env.SQLITE_SOURCE_PATH) {
    throw new Error('Defina DATABASE_URL e SQLITE_SOURCE_PATH. Use uma cópia de segurança do SQLite de produção.');
  }
  const source = require('better-sqlite3')(process.env.SQLITE_SOURCE_PATH, { readonly: true, fileMustExist: true });
  const db = require('../database');
  try {
    await db.initialize();
    console.log(await migrate(source, db.pool, { apply: process.argv.includes('--apply') }));
    console.log(process.argv.includes('--apply') ? 'Dados migrados. Usuários devem entrar novamente.' : 'Simulação concluída, sem gravar dados. Execute novamente com --apply para importar.');
  } finally { source.close(); await db.close(); }
}
if (require.main === module) main().catch(error => {
  console.error('Migração falhou:', error.message); process.exitCode = 1;
});
module.exports = { migrate };
