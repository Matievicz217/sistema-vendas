const form = document.querySelector('#formRecuperacao');
const feedback = document.querySelector('#feedbackRecuperacao');
const button = document.querySelector('#btnRecuperacao');
const resetting = form.dataset.mode === 'reset';
let token = new URLSearchParams(window.location.hash.slice(1)).get('token');
// O fragmento não é enviado ao servidor nem mantido na barra de endereço.
if (resetting) window.history.replaceState(null, '', window.location.pathname);
function showMessage(message, error = false) {
  feedback.textContent = message;
  feedback.classList.remove('hidden', 'text-red-700', 'text-green-700');
  feedback.classList.add(error ? 'text-red-700' : 'text-green-700');
}
if (resetting && (!token || !/^[a-f0-9]{64}$/.test(token))) {
  showMessage('Link inválido ou incompleto. Solicite um novo link.', true);
  button.disabled = true;
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const label = button.textContent;
  let data;
  if (resetting) {
    const senha = document.querySelector('#senha').value;
    if (senha !== document.querySelector('#confirmacao').value) {
      showMessage('As senhas não conferem.', true); return;
    }
    data = { token, senha };
  } else { data = { email: document.querySelector('#email').value.trim().toLowerCase() }; }
  button.disabled = true;
  button.textContent = resetting ? 'Salvando...' : 'Enviando...';
  let completed = false;
  try {
    const response = await fetch(resetting ? '/api/redefinir-senha' : '/api/esqueci-senha', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const result = await response.json();
    showMessage(result.mensagem || 'Não foi possível concluir. Tente novamente.', !response.ok);
    if (response.ok && resetting) {
      completed = true; token = null; form.reset();
      document.querySelector('#senha').disabled = true;
      document.querySelector('#confirmacao').disabled = true;
    }
  } catch { showMessage('Não foi possível conectar ao servidor. Tente novamente.', true); }
  finally { button.disabled = completed; button.textContent = completed ? 'Senha atualizada' : label; }
});
