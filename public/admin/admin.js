// ========================================
// ELEMENTOS
// ========================================

const nomeAdmin = document.querySelector('#nomeAdmin');

const totalFuncionarias =
    document.querySelector('#totalFuncionarias');

const totalVendas =
    document.querySelector('#totalVendas');

const valorVendido =
    document.querySelector('#valorVendido');

const tabelaFuncionarias =
    document.querySelector('#tabelaFuncionarias');

const mesFiltro =
    document.querySelector('#mesFiltro');

const anoFiltro =
    document.querySelector('#anoFiltro');

const btnAtualizar =
    document.querySelector('#btnAtualizar');

const btnSalvarMetas =
    document.querySelector('#btnSalvarMetas');

const btnSair =
    document.querySelector('#btnSair');


// ========================================
// FORMATAR DINHEIRO
// ========================================

function formatarDinheiro(valor) {

    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

}


// ========================================
// VERIFICAR ADMIN
// ========================================

async function verificarAdmin() {

    try {

        const resposta =
            await fetch('/api/me');

        if (!resposta.ok) {

            window.location.href =
                '/login/login.html';

            return false;
        }

        const dados =
            await resposta.json();

        if (dados.usuario.tipo !== 'admin') {

            window.location.href =
                '/funcionaria/funcionaria.html';

            return false;
        }

        nomeAdmin.textContent =
            dados.usuario.nome;

        return true;

    } catch (erro) {

        console.error(erro);

        window.location.href =
            '/login/login.html';

        return false;
    }

}


// ========================================
// DEFINIR PERÍODO ATUAL
// ========================================

function definirPeriodoAtual() {

    const hoje = new Date();

    mesFiltro.value =
        hoje.getMonth() + 1;

    anoFiltro.value =
        hoje.getFullYear();

}


// ========================================
// CARREGAR RESUMO MENSAL
// ========================================

async function carregarResumoMensal() {

    const mes =
        mesFiltro.value;

    const ano =
        anoFiltro.value;


    tabelaFuncionarias.innerHTML = `
        <tr>
            <td
                colspan="13"
                class="px-6 py-10 text-center text-gray-400"
            >
                Carregando dados...
            </td>
        </tr>
    `;


    try {

        const resposta = await fetch(
            `/api/admin/resumo-mensal?mes=${mes}&ano=${ano}`
        );

        const dados =
            await resposta.json();


        if (!resposta.ok) {

            tabelaFuncionarias.innerHTML = `
                <tr>
                    <td
                        colspan="13"
                        class="px-6 py-10 text-center text-red-400"
                    >
                        ${dados.mensagem}
                    </td>
                </tr>
            `;

            return;
        }


        const funcionarias =
            dados.funcionarias;


        // ========================================
        // CARDS DO TOPO
        // ========================================

        totalFuncionarias.textContent =
            funcionarias.length;


        const vendasMes =
            funcionarias.reduce(
                (total, funcionaria) => {

                    return total +
                        Number(
                            funcionaria.numero_vendas
                        );

                },
                0
            );


        const valorMes =
            funcionarias.reduce(
                (total, funcionaria) => {

                    return total +
                        Number(
                            funcionaria.valor_vendido
                        );

                },
                0
            );


        totalVendas.textContent =
            vendasMes;

        valorVendido.textContent =
            formatarDinheiro(valorMes);


        // ========================================
        // SEM FUNCIONÁRIAS
        // ========================================

        if (funcionarias.length === 0) {

            tabelaFuncionarias.innerHTML = `
                <tr>
                    <td
                        colspan="13"
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

        tabelaFuncionarias.innerHTML = '';


        funcionarias.forEach(funcionaria => {

            const linha =
                document.createElement('tr');


            linha.className = `
                bg-white
                hover:bg-[#d5e3df]
                transition
            `;


            linha.innerHTML = `

                <!-- FUNCIONÁRIA -->

                <td class="px-4 py-4">

                    <div class="font-semibold text-white">
                        ${funcionaria.nome_funcionaria}
                    </div>

                    <div class="text-xs text-gray-500 mt-1">
                        ${funcionaria.email_funcionaria}
                    </div>

                </td>


                <!-- META MENSAL -->

                <td class="px-4 py-4">

                    <input
                        type="number"
                        min="0"
                        step="0.01"

                        value="${Number(
                            funcionaria.meta_mensal
                        )}"

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

                    ${formatarDinheiro(
                        funcionaria.valor_vendido
                    )}

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

                        ${Number(
                            funcionaria.porcentagem_meta
                        ).toFixed(2)}%

                    </span>

                </td>


                <!-- VENDAS -->

                <td class="px-4 py-4 text-right">
                    ${funcionaria.numero_vendas}
                </td>


                <!-- MENSAGENS -->

                <td class="px-4 py-4 text-right">
                    ${funcionaria.quantidade_mensagens}
                </td>


                <!-- RETORNOS -->

                <td class="px-4 py-4 text-right">
                    ${funcionaria.retornos}
                </td>


                <!-- VENDAS POR MENSAGEM -->

                <td class="px-4 py-4 text-right">
                    ${funcionaria.vendas_mensagens}
                </td>


                <!-- ÁUDIOS -->

                <td class="px-4 py-4 text-right">
                    ${funcionaria.quantidade_audios}
                </td>


                <!-- RETORNOS DE ÁUDIO -->

                <td class="px-4 py-4 text-right">
                    ${funcionaria.retornos_audio}
                </td>


                <!-- VENDAS POR ÁUDIO -->

                <td class="px-4 py-4 text-right">
                    ${funcionaria.vendas_audio}
                </td>


                <!-- PROSPECÇÕES -->

                <td class="px-4 py-4 text-right">
                    ${funcionaria.prospeccao}
                </td>


                <!-- CLIENTES NOVOS -->

                <td class="px-4 py-4 text-right">
                    ${funcionaria.clientes_novos}
                </td>

            `;


            tabelaFuncionarias.appendChild(
                linha
            );

        });


    } catch (erro) {

        console.error(
            'Erro ao carregar resumo mensal:',
            erro
        );


        tabelaFuncionarias.innerHTML = `
            <tr>
                <td
                    colspan="13"
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

    const inputs =
        document.querySelectorAll(
            '.input-meta'
        );


    if (inputs.length === 0) {
        return;
    }


    const mes =
        Number(mesFiltro.value);

    const ano =
        Number(anoFiltro.value);


    try {

        // Feedback no botão
        btnSalvarMetas.disabled = true;

        btnSalvarMetas.textContent =
            'Salvando...';


        // ========================================
        // PERCORRER TODOS OS INPUTS
        // ========================================

        for (const input of inputs) {

            const usuarioId =
                Number(
                    input.dataset.usuarioId
                );


            const meta =
                Number(
                    input.value
                );


            // Validação
            if (
                isNaN(meta) ||
                meta < 0
            ) {

                alert(
                    'Existe uma meta inválida.'
                );


                btnSalvarMetas.disabled =
                    false;


                btnSalvarMetas.textContent =
                    'Salvar metas';


                return;
            }


            // ========================================
            // SALVAR META
            // ========================================

            const resposta =
                await fetch(
                    '/api/admin/metas',
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({

                            usuarioId:
                                usuarioId,

                            mes:
                                mes,

                            ano:
                                ano,

                            meta:
                                meta

                        })

                    }
                );


            const dados =
                await resposta.json();


            if (!resposta.ok) {

                alert(
                    dados.mensagem
                );


                btnSalvarMetas.disabled =
                    false;


                btnSalvarMetas.textContent =
                    'Salvar metas';


                return;
            }

        }


        // ========================================
        // TERMINOU DE SALVAR
        // ========================================

        btnSalvarMetas.textContent =
            'Salvo ✓';


        // Recarrega para atualizar
        // as porcentagens
        await carregarResumoMensal();


        setTimeout(() => {

            btnSalvarMetas.disabled =
                false;

            btnSalvarMetas.textContent =
                'Salvar metas';

        }, 1200);


    } catch (erro) {

        console.error(
            'Erro ao salvar metas:',
            erro
        );


        alert(
            'Erro ao salvar as metas.'
        );


        btnSalvarMetas.disabled =
            false;


        btnSalvarMetas.textContent =
            'Salvar metas';

    }

}


// ========================================
// ATUALIZAR TABELA
// ========================================

btnAtualizar.addEventListener(
    'click',
    carregarResumoMensal
);


// ========================================
// SALVAR METAS
// ========================================

btnSalvarMetas.addEventListener(
    'click',
    salvarTodasMetas
);


// ========================================
// LOGOUT
// ========================================

btnSair.addEventListener(
    'click',
    async () => {

        try {

            await fetch(
                '/api/logout',
                {
                    method: 'POST'
                }
            );


            window.location.href =
                '/login/login.html';


        } catch (erro) {

            console.error(erro);

        }

    }
);


// ========================================
// INICIAR PÁGINA
// ========================================

async function iniciarPagina() {

    const adminValido =
        await verificarAdmin();


    if (!adminValido) {
        return;
    }


    definirPeriodoAtual();


    await carregarResumoMensal();

}


iniciarPagina();