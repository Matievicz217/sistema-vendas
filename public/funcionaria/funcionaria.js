// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const formRegistro = document.querySelector("#formRegistro");
const nomeUsuario = document.querySelector("#nomeUsuario");
const btnSalvar = document.querySelector("#btnSalvar");
const btnSair = document.querySelector("#btnSair");
const feedbackRegistro = document.querySelector("#feedbackRegistro");

// Filtros do acompanhamento mensal
const mesFiltro = document.querySelector("#mesFiltro");
const anoFiltro = document.querySelector("#anoFiltro");
const btnAtualizarResumo = document.querySelector("#btnAtualizarResumo");

// Resumo mensal
const metaMensal = document.querySelector("#metaMensal");
const valorVendidoMes = document.querySelector("#valorVendidoMes");
const porcentagemMeta = document.querySelector("#porcentagemMeta");
const barraProgresso = document.querySelector("#barraProgresso");

const resumoVendas = document.querySelector("#resumoVendas");
const resumoMensagens = document.querySelector("#resumoMensagens");
const resumoRetornos = document.querySelector("#resumoRetornos");
const resumoVendasMensagens = document.querySelector("#resumoVendasMensagens");

const resumoAudios = document.querySelector("#resumoAudios");
const resumoRetornosAudio = document.querySelector("#resumoRetornosAudio");
const resumoVendasAudio = document.querySelector("#resumoVendasAudio");

const resumoProspeccao = document.querySelector("#resumoProspeccao");
const resumoClientesNovos = document.querySelector("#resumoClientesNovos");

// ========================================
// VERIFICAR USUÁRIO
// ========================================

async function verificarUsuario() {
  try {
    const resposta = await fetch("/api/me");

    if (!resposta.ok) {
      window.location.href = "../login/login.html";
      return;
    }

    const dados = await resposta.json();

    nomeUsuario.textContent = `Olá, ${dados.usuario.nome}!`;
  } catch (erro) {
    console.error("Erro ao verificar usuário:", erro);
  }
}

// ========================================
// DATA ATUAL NO FORMULÁRIO
// ========================================

function colocarDataAtual() {
  const campoData = document.querySelector("#data");

  const hoje = new Date();

  const ano = hoje.getFullYear();

  const mes = String(hoje.getMonth() + 1).padStart(2, "0");

  const dia = String(hoje.getDate()).padStart(2, "0");

  campoData.value = `${ano}-${mes}-${dia}`;
}

// ========================================
// DEFINIR MÊS E ANO ATUAIS
// ========================================

function definirPeriodoAtual() {
  const hoje = new Date();

  mesFiltro.value = hoje.getMonth() + 1;

  anoFiltro.value = hoje.getFullYear();
}

// ========================================
// FORMATAR DINHEIRO
// ========================================

function formatarDinheiro(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// ========================================
// MOSTRAR FEEDBACK
// ========================================

function mostrarFeedback(mensagem, erro = false) {
  feedbackRegistro.textContent = mensagem;

  feedbackRegistro.classList.remove(
    "hidden",
    "bg-green-950",
    "border-green-800",
    "text-green-300",
    "bg-red-950",
    "border-red-800",
    "text-red-300",
  );

  feedbackRegistro.classList.add("border");

  if (erro) {
    feedbackRegistro.classList.add(
      "bg-red-950",
      "border-red-800",
      "text-red-300",
    );
  } else {
    feedbackRegistro.classList.add(
      "bg-green-950",
      "border-green-800",
      "text-green-300",
    );
  }
}

// ========================================
// CARREGAR RESUMO MENSAL
// ========================================

async function carregarResumoMensal() {
  try {
    const mes = Number(mesFiltro.value);

    const ano = Number(anoFiltro.value);

    if (!mes || !ano) {
      return;
    }

    btnAtualizarResumo.disabled = true;
    btnAtualizarResumo.textContent = "Atualizando...";

    const resposta = await fetch(`/api/me/resumo-mensal?mes=${mes}&ano=${ano}`);

    if (!resposta.ok) {
      throw new Error("Erro ao buscar resumo mensal.");
    }

    const dados = await resposta.json();

    const resumo = dados.resumo;

    // ========================================
    // META E VENDAS
    // ========================================

    metaMensal.textContent = formatarDinheiro(resumo.meta_mensal);

    valorVendidoMes.textContent = formatarDinheiro(resumo.valor_vendido);

    const porcentagem = Number(resumo.porcentagem_meta || 0);

    porcentagemMeta.textContent = `${porcentagem.toFixed(1)}%`;

    // ========================================
    // BARRA DE PROGRESSO
    // ========================================

    // A barra visual para em 100%.
    // O texto pode mostrar mais de 100%
    // caso a funcionária ultrapasse a meta.

    const larguraBarra = Math.min(Math.max(porcentagem, 0), 100);

    barraProgresso.style.width = `${larguraBarra}%`;

    // ========================================
    // INDICADORES
    // ========================================

    resumoVendas.textContent = resumo.numero_vendas || 0;

    resumoMensagens.textContent = resumo.quantidade_mensagens || 0;

    resumoRetornos.textContent = resumo.retornos || 0;

    resumoVendasMensagens.textContent = resumo.vendas_mensagens || 0;

    resumoAudios.textContent = resumo.quantidade_audios || 0;

    resumoRetornosAudio.textContent = resumo.retornos_audio || 0;

    resumoVendasAudio.textContent = resumo.vendas_audio || 0;

    resumoProspeccao.textContent = resumo.prospeccao || 0;

    resumoClientesNovos.textContent = resumo.clientes_novos || 0;
  } catch (erro) {
    console.error("Erro ao carregar resumo mensal:", erro);

    mostrarFeedback("Não foi possível carregar o acompanhamento mensal.", true);
  } finally {
    btnAtualizarResumo.disabled = false;
    btnAtualizarResumo.textContent = "Atualizar";
  }
}

// ========================================
// SALVAR REGISTRO DO DIA
// ========================================

formRegistro.addEventListener("submit", async (event) => {
  event.preventDefault();

  // ========================================
  // RESULTADOS
  // ========================================

  const data = document.querySelector("#data").value;

  const realizada = document.querySelector("#realizada").value;

  const numeroVendas = document.querySelector("#numeroVendas").value;

  // ========================================
  // MENSAGENS
  // ========================================

  const quantidadeMensagens = document.querySelector(
    "#quantidadeMensagens",
  ).value;

  const retornos = document.querySelector("#retornos").value;

  const vendasMensagens = document.querySelector("#vendasMensagens").value;

  // ========================================
  // ÁUDIOS
  // ========================================

  const quantidadeAudios = document.querySelector("#quantidadeAudios").value;

  const retornosAudio = document.querySelector("#retornosAudio").value;

  const vendasAudio = document.querySelector("#vendasAudio").value;

  // ========================================
  // PROSPECÇÃO
  // ========================================

  const prospeccao = document.querySelector("#prospeccao").value;

  const clientesNovos = document.querySelector("#clientesNovos").value;

  // ========================================
  // VALIDAR CAMPOS OBRIGATÓRIOS
  // ========================================

  if (!data || realizada === "" || numeroVendas === "") {
    mostrarFeedback("Preencha os campos obrigatórios.", true);

    return;
  }

  // ========================================
  // OBJETO ENVIADO PARA O SERVIDOR
  // ========================================

  const registro = {
    data: data,

    realizada: Number(realizada),

    numeroVendas: Number(numeroVendas),

    quantidadeMensagens: Number(quantidadeMensagens || 0),

    retornos: Number(retornos || 0),

    vendasMensagens: Number(vendasMensagens || 0),

    quantidadeAudios: Number(quantidadeAudios || 0),

    retornosAudio: Number(retornosAudio || 0),

    vendasAudio: Number(vendasAudio || 0),

    prospeccao: Number(prospeccao || 0),

    clientesNovos: Number(clientesNovos || 0),
  };

  try {
    btnSalvar.disabled = true;

    btnSalvar.textContent = "Salvando...";

    const resposta = await fetch("/api/registros", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(registro),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarFeedback(dados.mensagem || "Erro ao salvar registro.", true);

      return;
    }

    mostrarFeedback(dados.mensagem || "Registro salvo com sucesso!");

    // ========================================
    // LIMPAR FORMULÁRIO
    // ========================================

    formRegistro.reset();

    colocarDataAtual();

    // ========================================
    // ATUALIZAR ACOMPANHAMENTO
    // ========================================

    /*
                Se o registro salvo pertence ao mesmo
                mês que está sendo visualizado,
                atualizamos os números automaticamente.
            */

    const [anoRegistro, mesRegistro] = data.split("-");

    if (
      Number(mesRegistro) === Number(mesFiltro.value) &&
      Number(anoRegistro) === Number(anoFiltro.value)
    ) {
      await carregarResumoMensal();
    }
  } catch (erro) {
    console.error("Erro ao salvar:", erro);

    mostrarFeedback("Não foi possível conectar ao servidor.", true);
  } finally {
    btnSalvar.disabled = false;

    btnSalvar.textContent = "Salvar registro";
  }
});

// ========================================
// BOTÃO ATUALIZAR ACOMPANHAMENTO
// ========================================

btnAtualizarResumo.addEventListener("click", async () => {
  await carregarResumoMensal();
});

// ========================================
// LOGOUT
// ========================================

btnSair.addEventListener("click", async () => {
  try {
    const resposta = await fetch("/api/logout", {
      method: "POST",
    });

    if (resposta.ok) {
      window.location.href = "../login/login.html";

      return;
    }

    const dados = await resposta.json();

    alert(dados.mensagem || "Erro ao sair.");
  } catch (erro) {
    console.error("Erro ao sair:", erro);

    alert("Erro ao sair da conta.");
  }
});

// ========================================
// INICIAR APLICAÇÃO
// ========================================

async function iniciarAplicacao() {
  await verificarUsuario();

  colocarDataAtual();

  definirPeriodoAtual();

  await carregarResumoMensal();
}

iniciarAplicacao();
