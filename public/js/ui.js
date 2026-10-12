(function configurarInteracoes() {
  const container = document.createElement("div");
  container.id = "toastContainer";
  container.className =
    "fixed right-4 top-4 z-50 flex w-[min(92vw,24rem)] flex-col gap-3";
  container.setAttribute("aria-live", "polite");
  container.setAttribute("aria-relevant", "additions");
  document.body.appendChild(container);

  function animarBotao(event) {
    const alvo = event.target.closest("button:not(:disabled), a[role='button']");
    if (!alvo || alvo.classList.contains("button-tap")) return;

    alvo.classList.add("button-tap");
    alvo.addEventListener(
      "animationend",
      () => alvo.classList.remove("button-tap"),
      { once: true },
    );
  }

  document.addEventListener("pointerdown", animarBotao);
  document.addEventListener("click", animarBotao);

  window.mostrarNotificacao = function mostrarNotificacao(
    mensagem,
    tipo = "success",
  ) {
    const aviso = document.createElement("div");
    const erro = tipo === "error";
    aviso.className = [
      "app-toast flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg",
      erro
        ? "border-red-200 bg-white text-red-800"
        : "border-[#cbd7d3] bg-white text-[#46534f]",
    ].join(" ");
    aviso.setAttribute("role", erro ? "alert" : "status");

    const icone = document.createElement("span");
    icone.className = erro
      ? "mt-0.5 font-bold text-red-600"
      : "mt-0.5 font-bold text-[#647f77]";
    icone.setAttribute("aria-hidden", "true");
    icone.textContent = erro ? "!" : "✓";

    const texto = document.createElement("p");
    texto.className = "flex-1 text-sm leading-5";
    texto.textContent = mensagem;

    const fechar = document.createElement("button");
    fechar.type = "button";
    fechar.className =
      "rounded px-1 text-lg leading-5 text-[#74817d] transition hover:text-[#202322]";
    fechar.setAttribute("aria-label", "Fechar notificação");
    fechar.textContent = "×";
    fechar.addEventListener("click", () => aviso.remove());

    aviso.append(icone, texto, fechar);
    container.appendChild(aviso);
    window.setTimeout(() => aviso.remove(), 5000);
  };

  window.confirmarAcao = function confirmarAcao(
    mensagem,
    { titulo = "Confirmar ação", confirmar = "Confirmar", cancelar = "Cancelar" } = {},
  ) {
    return new Promise((resolve) => {
      const dialog = document.createElement("dialog");
      dialog.className = "app-confirm";

      const tituloElemento = document.createElement("h2");
      tituloElemento.className = "text-lg font-semibold";
      tituloElemento.textContent = titulo;

      const descricao = document.createElement("p");
      descricao.className = "mt-2 text-sm leading-6 text-[#65736f]";
      descricao.textContent = mensagem;

      const acoes = document.createElement("div");
      acoes.className = "mt-6 flex justify-end gap-3";

      const botaoCancelar = document.createElement("button");
      botaoCancelar.type = "button";
      botaoCancelar.className =
        "rounded-lg border border-[#cbd7d3] px-4 py-2 text-sm font-medium text-[#46534f] transition hover:bg-[#eef3f1]";
      botaoCancelar.textContent = cancelar;

      const botaoConfirmar = document.createElement("button");
      botaoConfirmar.type = "button";
      botaoConfirmar.className =
        "rounded-lg bg-[#819b94] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f8982]";
      botaoConfirmar.textContent = confirmar;

      let respondido = false;
      const finalizar = (resultado) => {
        if (respondido) return;
        respondido = true;
        dialog.close();
        dialog.remove();
        resolve(resultado);
      };

      botaoCancelar.addEventListener("click", () => finalizar(false));
      botaoConfirmar.addEventListener("click", () => finalizar(true));
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        finalizar(false);
      });

      acoes.append(botaoCancelar, botaoConfirmar);
      dialog.append(tituloElemento, descricao, acoes);
      document.body.appendChild(dialog);
      dialog.showModal();
      botaoCancelar.focus();
    });
  };
})();
