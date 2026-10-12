const formLogin = document.querySelector("#formLogin");
const feedbackLogin = document.querySelector("#loginFeedback");
const btnLogin = document.querySelector("#btnLogin");

function mostrarFeedback(mensagem, erro = false) {
  if (!feedbackLogin) return;

  feedbackLogin.textContent = mensagem;
  feedbackLogin.classList.remove("hidden", "text-red-700", "text-green-700");
  feedbackLogin.classList.add(erro ? "text-red-700" : "text-green-700");
}

if (formLogin) {
  formLogin.addEventListener("submit", async (event) => {
    event.preventDefault();

    const campoEmail = document.querySelector("#email");
    const campoSenha = document.querySelector("#senha");

    if (!campoEmail || !campoSenha) {
      mostrarFeedback("Formulário de login incompleto.", true);
      return;
    }

    const email = campoEmail.value.trim().toLowerCase();
    const senha = campoSenha.value;

    try {
      if (btnLogin) {
        btnLogin.disabled = true;
        btnLogin.textContent = "Entrando...";
      }

      const resposta = await fetch("/api/login", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email,
          senha,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        mostrarFeedback(dados.mensagem || "Erro ao realizar login.", true);
        return;
      }

      if (dados.usuario.tipo === "admin") {
        window.location.href = "/admin/admin.html";
      } else {
        window.location.href = "/funcionaria/funcionaria.html";
      }
    } catch (erro) {
      console.error(erro);
      mostrarFeedback("Não foi possível conectar ao servidor.", true);
    } finally {
      if (btnLogin) {
        btnLogin.disabled = false;
        btnLogin.textContent = "Entrar";
      }
    }
  });
}
