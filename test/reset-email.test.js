const { it } = require('node:test');
const assert = require('node:assert/strict');
const { configuration, sendResetEmail } = require('../lib/reset-email');
it('exige configuração e HTTPS em produção e usa endereço confiável', () => {
  assert.throws(() => configuration({}), /RESEND_API_KEY/);
  const env = { RESEND_API_KEY: 'test-key', EMAIL_FROM: 'Dermosens <acesso@example.com>', APP_URL: 'https://vendas.example.com/login', NODE_ENV: 'production' };
  assert.equal(configuration(env).origin, 'https://vendas.example.com');
  assert.throws(() => configuration({ ...env, APP_URL: 'http://vendas.example.com' }), /HTTPS/);
  assert.throws(() => configuration({ ...env, APP_URL: 'https://user:pass@vendas.example.com' }), /HTTPS/);
  assert.equal(configuration({ ...env, APP_URL: '', RENDER_EXTERNAL_URL: 'https://vendas.onrender.com' }).origin, 'https://vendas.onrender.com');
});
it('envia link por HTTPS sem expor token na query e trata erro do provedor', async () => {
  const original = global.fetch;
  const config = { apiKey: 'test-key', from: 'Dermosens <acesso@example.com>', origin: 'https://vendas.example.com' };
  try {
    let payload;
    global.fetch = async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails');
      assert.equal(options.headers.Authorization, 'Bearer test-key');
      payload = JSON.parse(options.body); return { ok: true };
    };
    await sendResetEmail('maria@example.com', 'a'.repeat(64), config);
    assert.deepEqual(payload.to, ['maria@example.com']);
    assert.ok(payload.text.includes('https://vendas.example.com/login/redefinir-senha.html#token=' + 'a'.repeat(64)));
    assert.ok(!payload.text.includes('?token='));
    global.fetch = async () => ({ ok: false, status: 403 });
    await assert.rejects(sendResetEmail('maria@example.com', 'a'.repeat(64), config), /HTTP 403/);
  } finally { global.fetch = original; }
});
