const { before, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { newDb } = require('pg-mem');
const { createDatabase } = require('../lib/postgres');
const PostgresSessionStore = require('../lib/postgres-session-store');
const memory = newDb();
memory.public.registerFunction({name:'substr', args:['text','integer','integer'], returns:'text', implementation:(text,start,length)=>text.slice(start-1,start-1+length)});
const { Pool } = memory.adapters.createPg();
const db = createDatabase(new Pool());
let server, base;
before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test-secret-with-more-than-32-characters';
  process.env.CODIGO_CADASTRO = 'postgres-test-code';
  await db.initialize();
  // A mesma API da produção usa o driver pg fornecido pelo emulador.
  require.cache[require.resolve('../database')] = { exports: db };
  const app = require('../server');
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await db.close(); });
it('PostgreSQL: cadastro, login, sessão e registros diários', async () => {
  const post = (path, data, cookie) => fetch(base + path, {method:'POST', headers:{'Content-Type':'application/json', ...(cookie ? {Cookie:cookie}: {})}, body:JSON.stringify(data)});
  const cadastro = await post('/api/cadastro', {nome:'Maria Teste', email:'maria@teste.com', senha:'senha-de-teste', codigoAcesso:'postgres-test-code'});
  assert.equal(cadastro.status, 200);
  const login = await post('/api/login', {email:'maria@teste.com', senha:'senha-de-teste'});
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const me = await fetch(base+'/api/me', {headers:{Cookie:cookie}});
  assert.equal(me.status, 200);
  assert.equal((await me.json()).usuario.email, 'maria@teste.com');
  const values = {data:'2026-10-14', realizada:123.45, numeroVendas:2, contatos:3, retornoContatos:1, prospeccao:4, clientesNovos:1, balde:0};
  const insert = await post('/api/registros', values, cookie);
  const inserted = await insert.json();
  assert.equal(insert.status, 200); assert.ok(inserted.registroId);
  const update = await post('/api/registros', {...values, realizada:200}, cookie);
  assert.equal((await update.json()).atualizado, true);
  const list = await fetch(base+'/api/registros', {headers:{Cookie:cookie}});
  const records = (await list.json()).registros;
  assert.equal(records.length,1); assert.equal(records[0].realizada,200);
  const resumo = await fetch(base+'/api/me/resumo-mensal?mes=10&ano=2026', {headers:{Cookie:cookie}});
  assert.equal(resumo.status,200);assert.equal((await resumo.json()).resumo.valor_vendido,200);
  const ranking = await fetch(base+'/api/ranking?mes=10&ano=2026', {headers:{Cookie:cookie}});
  assert.equal(ranking.status,200);assert.equal(Number((await ranking.json()).ranking[0].valor_vendido),200);
  const hash = await require('bcrypt').hash('senha-de-teste', 4);
  await db.prepare("INSERT INTO usuarios (nome,email,senha_hash,tipo) VALUES (?, ?, ?, 'admin')").run('Admin','admin@teste.com',hash);
  const adminLogin = await post('/api/login',{email:'admin@teste.com',senha:'senha-de-teste'});
  const adminCookie = adminLogin.headers.get('set-cookie').split(';')[0];
  const usuario = await db.prepare('SELECT id FROM usuarios WHERE email = ?').get('maria@teste.com');
  for (const meta of [1000,2000]) {
    const response = await post('/api/admin/metas',{usuarioId:usuario.id,mes:10,ano:2026,meta},adminCookie);
    assert.equal(response.status,200);
  }
  for (const path of ['/api/admin/funcionarias','/api/admin/registros','/api/admin/resumo-mensal?mes=10&ano=2026']) {
    const response = await fetch(base+path,{headers:{Cookie:adminCookie}});
    assert.equal(response.status,200);
  }
  const logout = await post('/api/logout', {}, cookie); assert.equal(logout.status,200);
  assert.equal((await fetch(base+'/api/me', {headers:{Cookie:cookie}})).status,401);
});
it('PostgreSQL: sessão expirada, renovação e remoção', async () => {
  const store = new PostgresSessionStore(db);
  const call = (method, ...args) => new Promise((resolve,reject) => store[method](...args, (err,result) => err ? reject(err):resolve(result)));
  try {
    await call('set','expired',{cookie:{expires:new Date(Date.now()-10000)}, usuarioId:1});
    assert.equal(await call('get','expired'),null);
    const sess = {cookie:{expires:new Date(Date.now()+60000)}, usuarioId:1};
    await call('set','valid',sess);
    assert.equal((await call('get','valid')).usuarioId,1);
    await call('touch','valid',{...sess,usuarioId:2});
    assert.equal((await call('get','valid')).usuarioId,2);
    await call('destroy','valid');assert.equal(await call('get','valid'),null);
  } finally { store.stopInterval(); }
});

it('PostgreSQL: primeiro admin é idempotente e preserva credenciais existentes', async () => {
  const createAdmin = require('../lib/create-admin');
  const env = {ADMIN_NAME:'Admin Inicial',ADMIN_EMAIL:' INICIAL@TESTE.COM ',ADMIN_PASSWORD:'senha-inicial-segura'};
  await createAdmin(db,env);
  const original = await db.prepare('SELECT * FROM usuarios WHERE email = ?').get('inicial@teste.com');
  assert.equal(original.tipo,'admin');
  assert.equal(await require('bcrypt').compare(env.ADMIN_PASSWORD,original.senha_hash),true);
  await createAdmin(db,{...env,ADMIN_PASSWORD:'outra-senha-segura'});
  const unchanged = await db.prepare('SELECT * FROM usuarios WHERE email = ?').get('inicial@teste.com');
  assert.equal(unchanged.senha_hash,original.senha_hash);
  await assert.rejects(createAdmin(db,{...env,ADMIN_EMAIL:'maria@teste.com'}), /não é administradora/);
  await assert.rejects(createAdmin(db,{...env,ADMIN_PASSWORD:'curta'}), /12 e 128/);
});
