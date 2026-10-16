function configuration(env = process.env) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new Error('Configure RESEND_API_KEY e EMAIL_FROM.');
  const url = new URL(env.APP_URL || env.RENDER_EXTERNAL_URL || '');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      (env.NODE_ENV === 'production' && url.protocol !== 'https:')) {
    throw new Error('APP_URL deve ser o endereço público HTTPS do sistema.');
  }
  return { apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, origin: url.origin };
}
async function sendResetEmail(to, token, config) {
  const url = new URL('/login/redefinir-senha.html', config.origin);
  url.hash = new URLSearchParams({ token }).toString();
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + config.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: config.from, to: [to], subject: 'Redefinir sua senha | Dermosens',
      text: 'Recebemos uma solicitação para redefinir sua senha no Sistema de Vendas Dermosens.\n\nAcesse o link para criar uma nova senha (válido por 30 minutos e apenas uma vez):\n' + url.href + '\n\nSe você não solicitou, ignore este e-mail. Sua senha permanece a mesma.' }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('O provedor recusou o envio do e-mail (HTTP ' + response.status + ').');
}
module.exports = { configuration, sendResetEmail };
