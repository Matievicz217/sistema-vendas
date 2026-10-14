const $ = (selector) => document.querySelector(selector);

const formRegistro = $("#formRegistro");
const nomeUsuario = $("#nomeUsuario");
const btnSalvar = $("#btnSalvar");
const btnSair = $("#btnSair");
const feedbackRegistro = $("#feedbackRegistro");

const mesFiltro = $("#mesFiltro");
const anoFiltro = $("#anoFiltro");
const btnAtualizarResumo = $("#btnAtualizarResumo");

const metaMensal = $("#metaMensal");
const valorVendidoMes = $("#valorVendidoMes");
const porcentagemMeta = $("#porcentagemMeta");
const barraProgresso = $("#barraProgresso");

const resumoVendas = $("#resumoVendas");
const resumoContatos = $("#resumoContatos");
const resumoRetornoContatos = $("#resumoRetornoContatos");

const resumoProspeccao = $("#resumoProspeccao");
const resumoClientesNovos = $("#resumoClientesNovos");
const resumoBalde = $("#resumoBalde");

const metaDiariaNecessaria = $("#metaDiariaNecessaria");
const diasUteisRestantes = $("#diasUteisRestantes");
const tabelaRanking = $("#tabelaRanking");

if (
  !formRegistro ||
  !nomeUsuario ||
  !btnSalvar ||
  !btnSair ||
  !feedbackRegistro ||
  !mesFiltro ||
  !anoFiltro ||
  !btnAtualizarResumo ||
  !metaMensal ||
  !valorVendidoMes ||
  !porcentagemMeta ||
  !barraProgresso ||
  !resumoVendas ||
  !resumoContatos ||
  !resumoRetornoContatos ||
  !resumoProspeccao ||
  !resumoClientesNovos ||
  !resumoBalde ||
  !metaDiariaNecessaria ||
  !diasUteisRestantes ||
  !tabelaRanking
) {
  console.warn("funcionaria.js carregado sem todos os elementos da página.");
}

// ========================================
// VERIFICAR USUÁRIO
// ========================================

async function verificarUsuario() {
  if (!nomeUsuario) return false;

  try {
    const resposta = await fetch("/api/me", { cache: "no-store" });

    if (resposta.status === 401 || resposta.status === 404) {
      window.location.href = "../login/login.html";
      return false;
    }

    if (!resposta.ok) {
      throw new Error("Não foi possível verificar sua sessão.");
    }

    const dados = await resposta.json();

    if (dados?.usuario?.nome) {
      nomeUsuario.textContent = `Olá, ${dados.usuario.nome}!`;
    }
    return true;
  } catch (erro) {
    console.error("Erro ao verificar usuário:", erro);
    mostrarFeedback("Não foi possível verificar sua sessão. Atualize a página para tentar novamente.", true);
    return false;
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
  if (!feedbackRegistro) return;

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

function calcularDiasUteisRestantes(mes, ano) {
  const hoje = new Date();

  // Começa hoje, caso o mês selecionado seja o atual.
  // Para meses futuros, começa no primeiro dia.
  const inicio = new Date(ano, mes - 1, 1);

  if (ano === hoje.getFullYear() && mes === hoje.getMonth() + 1) {
    inicio.setDate(hoje.getDate());
  }

  const fim = new Date(ano, mes, 0);
  if (
    ano < hoje.getFullYear() ||
    (ano === hoje.getFullYear() && mes < hoje.getMonth() + 1)
  ) {
    return 0;
  }

  // Se o mês já passou, não há dias restantes.
  if (inicio > fim) {
    return 0;
  }

  let diasUteis = 0;

  for (
    let data = new Date(inicio);
    data <= fim;
    data.setDate(data.getDate() + 1)
  ) {
    const diaSemana = data.getDay();

    if (diaSemana !== 0 && diaSemana !== 6) {
      diasUteis++;
    }
  }

  return diasUteis;
}

// ========================================
// CARREGAR RESUMO MENSAL
// ========================================
// ========================================
// CARREGAR RANKING DE VENDAS
// ========================================

async function carregarRanking() {
  const mes = Number(mesFiltro.value);
  const ano = Number(anoFiltro.value);

  try {
    const resposta = await fetch(`/api/ranking?mes=${mes}&ano=${ano}`);

    if (!resposta.ok) {
      throw new Error("Erro ao carregar ranking.");
    }

    const dados = await resposta.json();

    tabelaRanking.innerHTML = "";

    if (dados.ranking.length === 0) {
      tabelaRanking.innerHTML = `
        <tr>
          <td colspan="3" class="py-5 text-center">
            Nenhuma funcionária encontrada.
          </td>
        </tr>
      `;
      return;
    }

    dados.ranking.forEach((funcionaria, index) => {
      const linha = document.createElement("tr");
      linha.className = "border-b border-[#eef3f1]";

      const posicao = document.createElement("td");
      posicao.className = "py-4";
      posicao.textContent = `${index + 1}º`;

      const nome = document.createElement("td");
      nome.className = "py-4";
      nome.textContent = funcionaria.nome_funcionaria;

      const vendido = document.createElement("td");
      vendido.className = "py-4 text-right font-semibold";
      vendido.textContent = formatarDinheiro(funcionaria.valor_vendido);

      linha.append(posicao, nome, vendido);
      tabelaRanking.appendChild(linha);
    });
  } catch (erro) {
    console.error("Erro no ranking:", erro);

    tabelaRanking.innerHTML = `
      <tr>
        <td colspan="3" class="py-5 text-center text-red-500">
          Não foi possível carregar o ranking.
        </td>
      </tr>
    `;
  }
}
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
    const meta = Number(resumo.meta_mensal || 0);
    const vendido = Number(resumo.valor_vendido || 0);

    const faltaVender = Math.max(meta - vendido, 0);

    const hoje = new Date();
    const periodoPassado =
      ano < hoje.getFullYear() ||
      (ano === hoje.getFullYear() && mes < hoje.getMonth() + 1);

    const diasRestantes = periodoPassado
      ? 0
      : calcularDiasUteisRestantes(mes, ano);

    if (meta <= 0) {
      metaDiariaNecessaria.textContent = "Sem meta definida";
      diasUteisRestantes.textContent = "Aguardando definição da meta mensal.";
    } else if (faltaVender === 0) {
      metaDiariaNecessaria.textContent = formatarDinheiro(0);
      diasUteisRestantes.textContent = "Meta mensal atingida!";
    } else if (diasRestantes === 0) {
      metaDiariaNecessaria.textContent = "Prazo encerrado";
      diasUteisRestantes.textContent = "Não há dias úteis restantes neste mês.";
    } else {
      const valorPorDia = faltaVender / diasRestantes;

      metaDiariaNecessaria.textContent = formatarDinheiro(valorPorDia);

      diasUteisRestantes.textContent = `${diasRestantes} dia(s) útil(eis) restante(s)`;
    }

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

    resumoBalde.textContent = resumo.balde || 0;
    await carregarRanking();
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

  const balde = document.querySelector("#balde").value;

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

    balde: Number(balde || 0),
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
  const sair = await window.confirmarAcao(
    "Deseja realmente sair da sua conta?",
    { titulo: "Sair da conta", confirmar: "Sair" },
  );
  if (!sair) return;

  try {
    const resposta = await fetch("/api/logout", {
      method: "POST",
    });

    if (resposta.ok) {
      window.location.href = "../login/login.html";

      return;
    }

    const dados = await resposta.json();

    window.mostrarNotificacao(
      dados.mensagem || "Erro ao sair.",
      "error",
    );
  } catch (erro) {
    console.error("Erro ao sair:", erro);

    window.mostrarNotificacao("Erro ao sair da conta.", "error");
  }
});

// ========================================
// INICIAR APLICAÇÃO
// ========================================

async function iniciarAplicacao() {
  if (!(await verificarUsuario())) return;

  colocarDataAtual();

  definirPeriodoAtual();

  await carregarResumoMensal();
}

iniciarAplicacao();
