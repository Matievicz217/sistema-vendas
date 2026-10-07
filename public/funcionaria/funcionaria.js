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
const resumoContatos = document.querySelector("#resumoContatos");
const resumoRetornoContatos = document.querySelector("#resumoRetornoContatos");

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

    resumoContatos.textContent = resumo.contatos || 0;
    resumoRetornoContatos.textContent = resumo.retorno_contatos || 0;

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
  // ========================================
  // CONTATOS
  // ========================================

  const contatos = document.querySelector("#contatos").value;

  const retornoContatos = document.querySelector("#retornoContatos").value;
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

    contatos: Number(contatos || 0),

    retornoContatos: Number(retornoContatos || 0),

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
