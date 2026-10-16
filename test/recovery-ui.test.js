const { it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function page(mode, token = 'a'.repeat(64)) {
  let submit, request, replaced;
  const elements = {
    '#formRecuperacao': { dataset: { mode }, addEventListener: (_, fn) => { submit = fn; }, reset() {} },
    '#feedbackRecuperacao': { classList: { remove() {}, add() {} } },
    '#btnRecuperacao': { textContent: 'Enviar', disabled: false },
    '#senha': { value: 'nova-senha-segura' }, '#confirmacao': { value: 'nova-senha-segura' },
    '#email': { value: ' MARIA@EXAMPLE.COM ' },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/login/recuperacao.js'), 'utf8'), {
    document: { querySelector: selector => elements[selector] }, URLSearchParams,
    window: { location: { hash: token ? '#token=' + token : '', pathname: '/login/redefinir-senha.html' }, history: { replaceState: (...args) => { replaced = args; } } },
    fetch: async (url, options) => { request = { url, data: JSON.parse(options.body) }; return { ok: true, json: async () => ({ mensagem: 'Concluído' }) }; },
  });
  return { elements, submit: () => submit({ preventDefault() {} }), get request() { return request; }, get replaced() { return replaced; } };
}
it('envia e-mail normalizado e permite tentar novamente', async () => {
  const ui = page('request'); await ui.submit();
  assert.equal(ui.request.url, '/api/esqueci-senha'); assert.equal(ui.request.data.email, 'maria@example.com');
  assert.equal(ui.elements['#btnRecuperacao'].disabled, false);
});
it('remove token do endereço, valida confirmação e encerra formulário após sucesso', async () => {
  const ui = page('reset'); assert.ok(ui.replaced);
  ui.elements['#confirmacao'].value = 'diferente'; await ui.submit(); assert.equal(ui.request, undefined);
  ui.elements['#confirmacao'].value = 'nova-senha-segura'; await ui.submit();
  assert.equal(ui.request.url, '/api/redefinir-senha'); assert.equal(ui.request.data.token, 'a'.repeat(64));
  assert.equal(ui.elements['#btnRecuperacao'].disabled, true);
});
it('informa link ausente sem liberar troca de senha', () => {
  const ui = page('reset', ''); assert.equal(ui.elements['#btnRecuperacao'].disabled, true);
  assert.match(ui.elements['#feedbackRecuperacao'].textContent, /Link inválido/);
});
