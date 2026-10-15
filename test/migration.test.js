const {it} = require('node:test');
const assert = require('node:assert/strict');
const {migrate} = require('../scripts/migrate-sqlite-to-postgres');
const {schema} = require('../lib/postgres');
const Database = require('better-sqlite3');
function fixture() {
  const source = new Database(':memory:');
  source.exec(schema.replaceAll('SERIAL PRIMARY KEY','INTEGER PRIMARY KEY AUTOINCREMENT'));
  source.prepare('INSERT INTO usuarios (id,nome,email,senha_hash) VALUES (?,?,?,?)').run(7,'Maria','maria@teste.com','hash-original');
  source.prepare('INSERT INTO registros (id,usuario_id,data,meta_diaria,realizada,numero_vendas) VALUES (?,?,?,?,?,?)').run(12,7,'2026-10-14',0,123.45,2);
  source.prepare('INSERT INTO metas_mensais (id,usuario_id,mes,ano,meta) VALUES (?,?,?,?,?)').run(3,7,10,2026,1000);
  return source;
}
// Testa o protocolo transacional e os valores transferidos; a execução SQL real
// continua sendo validada pela simulação no PostgreSQL de destino.
function destination({nonempty=false, fail=false}={}) {
  const commands=[], rows={usuarios:[],registros:[],metas_mensais:[]};let released=false;
  const client={async query(sql,params) {
    commands.push(sql);
    if (sql.startsWith('INSERT')) {
      const table=sql.match(/INSERT INTO (\w+)/)[1];
      if (fail && table==='registros') throw new Error('falha de importação');
      rows[table].push(params); return {rows:[]};
    }
    if (sql.startsWith('SELECT COUNT')) {
      const table=sql.split(' FROM ')[1];return {rows:[{total:nonempty?1:rows[table].length}]};
    }
    return {rows:[]};
  },release(){released=true;}};
  return {pool:{connect:async()=>client},commands,rows,get released(){return released;}};
}
it('simulação preserva IDs, hashes e valores e termina em rollback',async()=>{
  const source=fixture(), target=destination();
  try {
    const result=await migrate(source,target.pool);
    assert.deepEqual(result,{applied:false,counts:{usuarios:1,registros:1,metas_mensais:1}});
    assert.deepEqual(target.rows.usuarios[0],[7,'Maria','maria@teste.com','hash-original','funcionaria']);
    assert.equal(target.rows.registros[0][4],123.45);
    assert.equal(target.commands.at(-1),'ROLLBACK');assert.equal(target.released,true);
  } finally {source.close();}
});
it('importação ajusta sequências antes do commit',async()=>{
  const source=fixture(),target=destination();
  try {
    assert.equal((await migrate(source,target.pool,{apply:true})).applied,true);
    assert.ok(target.commands.includes('ALTER SEQUENCE usuarios_id_seq RESTART WITH 8'));
    assert.ok(target.commands.includes('ALTER SEQUENCE registros_id_seq RESTART WITH 13'));
    assert.equal(target.commands.at(-1),'COMMIT');
  }finally{source.close();}
});
for(const options of [{nonempty:true},{fail:true}]) it('recusa destino ocupado ou interrompe falha sem commit: '+JSON.stringify(options),async()=>{
  const source=fixture(),target=destination(options);
  try{
    await assert.rejects(migrate(source,target.pool,{apply:true}));
    assert.equal(target.commands.includes('COMMIT'),false);
    assert.equal(target.commands.at(-1),'ROLLBACK');assert.equal(target.released,true);
  }finally{source.close();}
});
