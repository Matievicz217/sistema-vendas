const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { normalizarEmail, emailValido } = require('./validation');
const emailSender = require('./reset-email');
const genericMessage = 'Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha. Confira também a pasta de spam.';
const digest = token => crypto.createHash('sha256').update(token).digest('hex');

function createPasswordReset(db, sender = emailSender) {
  async function request(email, config) {
    const user = await db.prepare('SELECT id, email FROM usuarios WHERE email = ?').get(email);
    if (!user) return;
    const token = crypto.randomBytes(32).toString('hex');
    const hash = digest(token);
    // Uma solicitação por minuto por conta, inclusive entre instâncias do servidor.
    const result = await db.pool.query(
      'INSERT INTO recuperacoes_senha (usuario_id, token_hash, expire, solicitado_em) VALUES ($1, $2, $3, $4) ON CONFLICT (usuario_id) DO UPDATE SET token_hash = EXCLUDED.token_hash, expire = EXCLUDED.expire, solicitado_em = EXCLUDED.solicitado_em WHERE recuperacoes_senha.solicitado_em < $5 RETURNING token_hash',
      [user.id, hash, new Date(Date.now() + 30 * 60 * 1000), new Date(), new Date(Date.now() - 60000)]);
    if (result.rows[0]?.token_hash !== hash) return;
    try { await sender.sendResetEmail(user.email, token, config); }
    catch (error) {
      await db.pool.query('DELETE FROM recuperacoes_senha WHERE token_hash = $1', [hash]);
      throw error;
    }
  }
  async function reset(token, password) {
    const passwordHash = await bcrypt.hash(password, 12);
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      // DELETE RETURNING garante que o token só possa ser consumido uma vez.
      const result = await client.query('DELETE FROM recuperacoes_senha WHERE token_hash = $1 AND expire > NOW() RETURNING usuario_id', [digest(token)]);
      if (!result.rows.length) { await client.query('ROLLBACK'); return false; }
      const id = result.rows[0].usuario_id;
      await client.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [passwordHash, id]);
      await client.query("DELETE FROM sessoes WHERE sess->>'usuarioId' = $1", [String(id)]);
      await client.query('COMMIT');
      return true;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  return { request, reset };
}
function mountPasswordReset(app, db) {
  const rateLimit = require('express-rate-limit');
  const service = createPasswordReset(db);
  const limiter = limit => rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { sucesso: false, mensagem: 'Muitas tentativas. Aguarde 15 minutos.' } });
  app.post('/api/esqueci-senha', limiter(5), (req, res) => {
    res.set('Cache-Control', 'no-store');
    const email = normalizarEmail(req.body?.email);
    if (!emailValido(email)) return res.status(400).json({ sucesso: false, mensagem: 'Informe um e-mail válido.' });
    let config;
    try { config = emailSender.configuration(); }
    catch { return res.status(503).json({ sucesso: false, mensagem: 'A recuperação por e-mail está indisponível. Entre em contato com a administração.' }); }
    // Resposta independente da existência da conta e do tempo do provedor de e-mail.
    res.json({ sucesso: true, mensagem: genericMessage });
    service.request(email, config).catch(() => console.error('Falha ao enviar e-mail de recuperação. Verifique o provedor e a configuração de envio.'));
  });
  app.post('/api/redefinir-senha', limiter(10), async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const { token, senha } = req.body || {};
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ sucesso: false, mensagem: 'Link inválido ou expirado. Solicite um novo link.' });
    if (typeof senha !== 'string' || senha.length < 8 || senha.length > 128 || Buffer.byteLength(senha, 'utf8') > 72) return res.status(400).json({ sucesso: false, mensagem: 'A senha deve ter de 8 a 128 caracteres e no máximo 72 bytes.' });
    try {
      if (!await service.reset(token, senha)) return res.status(400).json({ sucesso: false, mensagem: 'Link inválido ou expirado. Solicite um novo link.' });
      res.json({ sucesso: true, mensagem: 'Senha atualizada! Entre com sua nova senha.' });
    } catch {
      console.error('Falha ao redefinir senha.');
      res.status(500).json({ sucesso: false, mensagem: 'Não foi possível redefinir sua senha. Tente novamente.' });
    }
  });
}
module.exports = { createPasswordReset, mountPasswordReset, digest };
