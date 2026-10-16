const { before, after, it } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { createPasswordReset, digest } = require('../lib/password-reset');
const db = require('./helpers/database.cjs')();
const delivered = [];
const service = createPasswordReset(db, { sendResetEmail: async (email, token) => delivered.push({ email, token }) });
let server, base;
before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'password-reset-test-secret-long-enough';
  process.env.CODIGO_CADASTRO = 'test-registration-code';
  delete process.env.RESEND_API_KEY;
  await db.initialize();
  await db.prepare('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)').run('Maria', 'maria@example.com', await bcrypt.hash('senha-original', 4));
  server = require('../server').listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await db.close(); });
const post = (path, data) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
it('não envia para conta inexistente e armazena apenas o hash do token', async () => {
  await service.request('ausente@example.com', {});
  assert.equal(delivered.length, 0);
  await service.request('maria@example.com', {});
  assert.equal(delivered.length, 1);
  const row = await db.prepare('SELECT * FROM recuperacoes_senha').get();
  assert.equal(row.token_hash, digest(delivered[0].token));
  assert.notEqual(row.token_hash, delivered[0].token);
  assert.ok(new Date(row.expire).getTime() > Date.now() + 29 * 60000);
  await service.request('maria@example.com', {});
  assert.equal(delivered.length, 1, 'cooldown evita e-mails repetidos');
});
it('troca senha, invalida sessões e impede reutilização do link pela API', async () => {
  const login = await post('/api/login', { email: 'maria@example.com', senha: 'senha-original' });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const changed = await post('/api/redefinir-senha', { token: delivered[0].token, senha: 'nova-senha-segura' });
  assert.equal(changed.status, 200, JSON.stringify(await changed.json()));
  assert.equal((await post('/api/login', { email: 'maria@example.com', senha: 'senha-original' })).status, 401);
  assert.equal((await post('/api/login', { email: 'maria@example.com', senha: 'nova-senha-segura' })).status, 200);
  assert.equal((await fetch(base + '/api/me', { headers: { Cookie: cookie } })).status, 401);
  assert.equal((await post('/api/redefinir-senha', { token: delivered[0].token, senha: 'outra-senha-segura' })).status, 400);
});
it('recusa token expirado e senha inválida sem alterar a senha', async () => {
  await service.request('maria@example.com', {});
  const token = delivered.at(-1).token;
  assert.equal((await post('/api/redefinir-senha', { token, senha: 'curta' })).status, 400);
  await db.pool.query('UPDATE recuperacoes_senha SET expire = $1', [new Date(Date.now() - 60000)]);
  assert.equal((await post('/api/redefinir-senha', { token, senha: 'senha-que-nao-deve-valer' })).status, 400);
  assert.equal((await post('/api/login', { email: 'maria@example.com', senha: 'nova-senha-segura' })).status, 200);
});
it('nova solicitação substitui link anterior e falha no envio remove o token', async () => {
  await db.pool.query('UPDATE recuperacoes_senha SET solicitado_em = $1', [new Date(Date.now() - 120000)]);
  const oldToken = delivered.at(-1).token;
  await service.request('maria@example.com', {});
  const newToken = delivered.at(-1).token;
  assert.notEqual(newToken, oldToken);
  assert.equal(await service.reset(oldToken, 'nao-deve-trocar'), false);
  await db.pool.query('UPDATE recuperacoes_senha SET solicitado_em = $1', [new Date(Date.now() - 120000)]);
  const broken = createPasswordReset(db, { sendResetEmail: async () => { throw new Error('provider unavailable'); } });
  await assert.rejects(broken.request('maria@example.com', {}), /provider unavailable/);
  assert.equal((await db.prepare('SELECT * FROM recuperacoes_senha').all()).length, 0);
});
it('valida e-mail e informa indisponibilidade sem configuração', async () => {
  assert.equal((await post('/api/esqueci-senha', { email: 'invalido' })).status, 400);
  assert.equal((await post('/api/esqueci-senha', { email: 'maria@example.com' })).status, 503);
});
it('mesma resposta para conta existente ou inexistente e limite de tentativas', async () => {
  const sender = require('../lib/reset-email');
  const original = sender.sendResetEmail;
  process.env.RESEND_API_KEY = 'test-key'; process.env.EMAIL_FROM = 'test@example.com'; process.env.APP_URL = 'https://vendas.example.com';
  sender.sendResetEmail = async () => {};
  try {
    const existing = await post('/api/esqueci-senha', { email: 'maria@example.com' });
    const absent = await post('/api/esqueci-senha', { email: 'absent@example.com' });
    assert.equal(existing.status, 200); assert.equal(absent.status, 200);
    assert.deepEqual(await existing.json(), await absent.json());
    await post('/api/esqueci-senha', { email: 'absent@example.com' });
    assert.equal((await post('/api/esqueci-senha', { email: 'absent@example.com' })).status, 429);
    await new Promise(resolve => setTimeout(resolve, 100));
  } finally { sender.sendResetEmail = original; }
});
