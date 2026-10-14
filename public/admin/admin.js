const $ = (selector) => document.querySelector(selector);

const nomeAdmin = $("#nomeAdmin");
const totalFuncionarias = $("#totalFuncionarias");
const totalVendas = $("#totalVendas");
const valorVendido = $("#valorVendido");
const tabelaFuncionarias = $("#tabelaFuncionarias");
const mesFiltro = $("#mesFiltro");
const anoFiltro = $("#anoFiltro");
const btnAtualizar = $("#btnAtualizar");
const btnSalvarMetas = $("#btnSalvarMetas");
const btnSair = $("#btnSair");

if (
  !nomeAdmin ||
  !totalFuncionarias ||
  !totalVendas ||
  !valorVendido ||
  !tabelaFuncionarias ||
  !mesFiltro ||
  !anoFiltro ||
  !btnAtualizar ||
  !btnSalvarMetas ||
  !btnSair
) {
  console.warn("admin.js carregado sem todos os elementos da página.");
}

// ========================================
// FORMATAR DINHEIRO
// ========================================

function formatarDinheiro(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function escaparHTML(valor) {
  return String(valor).replace(/[&<>"']/g, (caractere) => {
    const entidades = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entidades[caractere];
  });
}

// ========================================
// VERIFICAR ADMIN
// ========================================

async function verificarAdmin() {
  try {
    const resposta = await fetch("/api/me", { cache: "no-store" });

    if (resposta.status === 401 || resposta.status === 404) {
      window.location.href = "/login/login.html";
      return false;
    }

    if (!resposta.ok) {
      throw new Error("Não foi possível verificar sua sessão.");
    }

    const dados = await resposta.json();

    if (!dados?.usuario || dados.usuario.tipo !== "admin") {
      window.location.href = "/funcionaria/funcionaria.html";
      return false;
    }

    if (nomeAdmin) {
      nomeAdmin.textContent = dados.usuario.nome;
    }

    return true;
  } catch (erro) {
    console.error(erro);
    window.mostrarNotificacao("Não foi possível verificar sua sessão. Atualize a página para tentar novamente.", "error");
    return false;
  }
}

// ========================================
// DEFINIR PERÍODO ATUAL
// ========================================

function definirPeriodoAtual() {
  if (!mesFiltro || !anoFiltro) return;

  const hoje = new Date();
  mesFiltro.value = hoje.getMonth() + 1;
  anoFiltro.value = hoje.getFullYear();
}

// ========================================
// CARREGAR RESUMO MENSAL
// ========================================

async function carregarResumoMensal() {
  if (!mesFiltro || !anoFiltro || !tabelaFuncionarias) return;

  const mes = mesFiltro.value;

  const ano = anoFiltro.value;

  tabelaFuncionarias.innerHTML = `
        <tr>
            <td
                colspan="10"
                class="px-6 py-10 text-center text-gray-400"
            >
                Carregando dados...
            </td>
        </tr>
    `;

  try {
    const resposta = await fetch(
      `/api/admin/resumo-mensal?mes=${mes}&ano=${ano}`,
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      tabelaFuncionarias.innerHTML = `
                <tr>
                    <td
                        colspan="10"
                        class="px-6 py-10 text-center text-red-400"
                    >
                        ${dados.mensagem}
                    </td>
                </tr>
            `;

      return;
    }

    const funcionarias = dados.funcionarias;

    // ========================================
    // CARDS DO TOPO
    // ========================================

    if (totalFuncionarias) {
      totalFuncionarias.textContent = String(funcionarias.length);
    }

    const vendasMes = funcionarias.reduce((total, funcionaria) => {
      return total + Number(funcionaria.numero_vendas || 0);
    }, 0);

    const valorMes = funcionarias.reduce((total, funcionaria) => {
      return total + Number(funcionaria.valor_vendido || 0);
    }, 0);

    if (totalVendas) {
      totalVendas.textContent = String(vendasMes);
    }

    if (valorVendido) {
      valorVendido.textContent = formatarDinheiro(valorMes);
    }

    // ========================================
    // SEM FUNCIONÁRIAS
    // ========================================

    if (funcionarias.length === 0) {
      tabelaFuncionarias.innerHTML = `
                <tr>
                    <td
                        colspan="10"
                        class="px-6 py-10 text-center text-gray-400"
                    >
                        Nenhuma funcionária encontrada.
                    </td>
                </tr>
            `;

      return;
    }

    // ========================================
    // CRIAR TABELA
    // ========================================

    tabelaFuncionarias.innerHTML = "";

    funcionarias.forEach((funcionaria) => {
      const linha = document.createElement("tr");

      linha.className = `
                bg-white
                hover:bg-[#d5e3df]
                transition
            `;

      linha.innerHTML = `

                <!-- FUNCIONÁRIA -->

                <td class="px-4 py-4">

                    <div class="font-semibold text-white">
                        ${escaparHTML(funcionaria.nome_funcionaria)}
                    </div>

                    <div class="text-xs text-gray-500 mt-1">
                        ${escaparHTML(funcionaria.email_funcionaria)}
                    </div>

                </td>


                <!-- META MENSAL -->

                <td class="px-4 py-4">

                    <input
                        type="number"
                        min="0"
                        step="0.01"

                        value="${Number(funcionaria.meta_mensal)}"

                        data-usuario-id="${funcionaria.usuario_id}"

                        class="
                            input-meta
                            w-32
                            px-3 py-2
                            bg-[#f7f9f8]
                            text-[#202322]
                            border border-[#ccd7d3]
                            rounded-lg
                            outline-none
                            text-right
                            focus:border-[#819b94]
                            focus:ring-2
                            focus:ring-[#819b94]
                            transition
                            
                        "
                    >

                </td>


                <!-- VENDIDO -->

                <td class="px-4 py-4 text-right font-medium">

                    ${formatarDinheiro(funcionaria.valor_vendido)}

                </td>


                <!-- PORCENTAGEM -->

                <td class="px-4 py-4 text-right">

                    <span
                        class="
                            inline-flex
                            px-3
                            py-1
                            rounded-full
                            bg-blue-500/10
                            text-blue-400
                            font-semibold
                        "
                    >

                        ${Number(funcionaria.porcentagem_meta).toFixed(2)}%

                    </span>

                </td>


                <!-- VENDAS -->

                <td class="px-4 py-4 text-right">
                    ${funcionaria.numero_vendas}
                </td>


                <!-- CONTATOS -->

                <td class="px-4 py-4 text-right">
                    ${funcionaria.contatos}
                </td>


                <!-- RETORNO DE CONTATOS -->

                <td class="px-4 py-4 text-right">
                    ${funcionaria.retorno_contatos}
                </td>

                <!-- PROSPECÇÕES -->

                <td class="px-4 py-4 text-right">
                    ${funcionaria.prospeccao}
                </td>


                <!-- CLIENTES NOVOS -->

                <td class="px-4 py-4 text-right">
                    ${funcionaria.clientes_novos}
                </td>

                <!-- BALDE -->

                <td class="px-4 py-4 text-right">
                    ${funcionaria.balde ?? 0}
                </td>

            `;

      tabelaFuncionarias.appendChild(linha);
    });
  } catch (erro) {
    console.error("Erro ao carregar resumo mensal:", erro);

    tabelaFuncionarias.innerHTML = `
            <tr>
                <td
                  colspan="10"
                    class="px-6 py-10 text-center text-red-400"
                >
                    Erro ao carregar os dados.
                </td>
            </tr>
        `;
  }
}

// ========================================
// SALVAR TODAS AS METAS
// ========================================

async function salvarTodasMetas() {
  if (!btnSalvarMetas || !mesFiltro || !anoFiltro) return;

  const inputs = document.querySelectorAll(".input-meta");

  if (inputs.length === 0) {
    window.mostrarNotificacao("Não há metas para salvar neste mês.", "error");
    return;
  }

  const mes = Number(mesFiltro.value);
  const ano = Number(anoFiltro.value);

  try {
    btnSalvarMetas.disabled = true;
    btnSalvarMetas.textContent = "Salvando...";

    for (const input of inputs) {
      const usuarioId = Number(input.dataset.usuarioId);
      const meta = Number(input.value);

      if (!Number.isFinite(meta) || meta < 0) {
        window.mostrarNotificacao("Existe uma meta inválida.", "error");
        return;
      }

      const resposta = await fetch("/api/admin/metas", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          usuarioId: usuarioId,

          mes: mes,

          ano: ano,

          meta: meta,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        window.mostrarNotificacao(
          dados.mensagem || "Não foi possível salvar as metas.",
          "error",
        );
        return;
      }
    }

    btnSalvarMetas.textContent = "Salvo ✓";
    window.mostrarNotificacao("Metas salvas com sucesso.");
    await carregarResumoMensal();
  } catch (erro) {
    console.error("Erro ao salvar metas:", erro);
    window.mostrarNotificacao("Erro ao salvar as metas.", "error");
  } finally {
    btnSalvarMetas.disabled = false;
    btnSalvarMetas.textContent = "Salvar metas";
  }
}

// ========================================
// ATUALIZAR TABELA
// ========================================

if (btnAtualizar) {
  btnAtualizar.addEventListener("click", carregarResumoMensal);
}

if (btnSalvarMetas) {
  btnSalvarMetas.addEventListener("click", salvarTodasMetas);
}

if (btnSair) {
  btnSair.addEventListener("click", async () => {
    const sair = await window.confirmarAcao(
      "Deseja realmente sair do painel administrativo?",
      { titulo: "Sair da conta", confirmar: "Sair" },
    );
    if (!sair) return;

    try {
      const resposta = await fetch("/api/logout", {
        method: "POST",
      });

      if (!resposta.ok) {
        const dados = await resposta.json();
        window.mostrarNotificacao(
          dados.mensagem || "Não foi possível sair da conta.",
          "error",
        );
        return;
      }

      window.location.href = "/login/login.html";
    } catch (erro) {
      console.error(erro);
      window.mostrarNotificacao("Erro ao sair da conta.", "error");
    }
  });
}

// ========================================
// INICIAR PÁGINA
// ========================================

async function iniciarPagina() {
  const adminValido = await verificarAdmin();

  if (!adminValido) {
    return;
  }

  definirPeriodoAtual();

  await carregarResumoMensal();
}

iniciarPagina();
