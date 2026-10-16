const { it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
for (const status of [200, 401, 503]) {
  it('confirma sessão antes de abrir painel: ' + status, async () => {
    let submit;
    const feedback = { classList: { remove() {}, add() {} } };
    const elements = {
      '#formLogin': { addEventListener(event, callback) { submit = callback; } },
      '#loginFeedback': feedback,
      '#btnLogin': {},
      '#email': { value: 'teste@exemplo.com' },
      '#senha': { value: 'senha-de-teste' },
    };
    const window = { location: {}, mostrarNotificacao() {} };
    const requests = [];
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/login/login.js'), 'utf8'), {
      document: { querySelector: (selector) => elements[selector] }, window, console,
      fetch: async (url) => {
        requests.push(url);
        return url === '/api/login'
          ? { ok: true, json: async () => ({ usuario: { tipo: 'funcionaria' } }) }
          : { ok: status === 200, status };
      },
    });
    await submit({ preventDefault() {} });
    assert.deepEqual(requests, ['/api/login', '/api/me']);
    assert.equal(window.location.href, status === 200 ? '/funcionaria/funcionaria.html' : undefined);
    if (status !== 200) assert.match(feedback.textContent, /sessão/);
  });
}

for (const config of [
  { nome: 'proxy explícito', RENDER: '', TRUST_PROXY_HOPS: '1' },
  { nome: 'Render sem configuração manual', RENDER: 'true', TRUST_PROXY_HOPS: '' },
]) {
it('mantém sessão HTTPS e recusa HTTP: ' + config.nome, () => {
  const { execFileSync } = require('node:child_process');
    execFileSync(process.execPath, ['-e', "const assert = require('node:assert/strict');\n(async () => {\nconst db = require('./test/helpers/database.cjs')();\nawait db.initialize();\nconst app = require('./server');\nawait db.prepare('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)').run('Teste', 'sessao@exemplo.com', require('bcrypt').hashSync('senha-de-teste', 10));\nconst server = app.listen(0, '127.0.0.1', async () => {\n  try {\n    const base = 'http://127.0.0.1:' + server.address().port;\n    const options = { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-Proto': 'https' }, body: JSON.stringify({email: 'sessao@exemplo.com', senha: 'senha-de-teste'}) };\n    const login = await fetch(base + '/api/login', options);\n    assert.equal(login.status, 200);\n    const cookie = login.headers.get('set-cookie');\n    assert.match(cookie, /; Secure/);\n    for (let i = 0; i < 3; i++) {\n      const me = await fetch(base + '/api/me', { headers: {Cookie: cookie.split(';')[0], 'X-Forwarded-Proto': 'https'} });\n      assert.equal(me.status, 200);\n      assert.equal((await me.json()).usuario.email, 'sessao@exemplo.com');\n    }\n    delete options.headers['X-Forwarded-Proto'];\n    const insecure = await fetch(base + '/api/login', options);\n    assert.equal(insecure.status, 503);\n    assert.equal((await insecure.json()).sucesso, false);\n  } catch (error) { console.error(error); process.exitCode = 1; }\n  finally { server.close(() => db.close()); }\n});\n})().catch(error => { console.error(error); process.exitCode = 1; });"], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'production', SESSION_SECRET: 'test-session-secret-with-at-least-32-characters', CODIGO_CADASTRO: 'test-registration-code-long-enough', RENDER: config.RENDER, TRUST_PROXY_HOPS: config.TRUST_PROXY_HOPS },
      encoding: 'utf8', timeout: 15000, stdio: 'pipe',
    });
});

}
