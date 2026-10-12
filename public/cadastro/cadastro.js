const formCadastro = document.querySelector("#formCadastro");
const feedbackCadastro = document.querySelector("#cadastroFeedback");
const btnCadastro = document.querySelector("#btnCadastro");

function mostrarFeedback(mensagem, erro = false) {
  if (!feedbackCadastro) return;

  feedbackCadastro.textContent = mensagem;
  feedbackCadastro.classList.remove("hidden", "text-red-700", "text-green-700");
  feedbackCadastro.classList.add(erro ? "text-red-700" : "text-green-700");
}

if (formCadastro) {
  formCadastro.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = document.querySelector("#nome")?.value.trim() || "";
    const email = document.querySelector("#email")?.value.trim().toLowerCase() || "";
    const senha = document.querySelector("#senha")?.value || "";
    const confirmarSenha = document.querySelector("#confirmarSenha")?.value || "";
    const codigoAcesso = document.querySelector("#codigoAcesso")?.value.trim() || "";

    if (senha !== confirmarSenha) {
      mostrarFeedback("As senhas não são iguais.", true);
      return;
    }

    if (senha.length < 8 || senha.length > 128) {
      mostrarFeedback("A senha deve ter entre 8 e 128 caracteres.", true);
      return;
    }

    try {
      if (btnCadastro) {
        btnCadastro.disabled = true;
        btnCadastro.textContent = "Criando conta...";
      }

      const resposta = await fetch("/api/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha, codigoAcesso }),
      });

      const dados = await resposta.json();
      if (!resposta.ok) {
        mostrarFeedback(dados.mensagem || "Erro ao criar a conta.", true);
        return;
      }

      mostrarFeedback(dados.mensagem || "Conta criada com sucesso!");
      window.setTimeout(() => {
        window.location.href = "/login/login.html";
      }, 900);
    } catch (erro) {
      console.error(erro);
      mostrarFeedback("Não foi possível conectar ao servidor.", true);
    } finally {
      if (btnCadastro) {
        btnCadastro.disabled = false;
        btnCadastro.textContent = "Criar conta";
      }
    }
  });
}