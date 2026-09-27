// ========================================
// ELEMENTOS
// ========================================

const nomeAdmin = document.querySelector('#nomeAdmin');
const totalFuncionarias = document.querySelector('#totalFuncionarias');
const totalVendas = document.querySelector('#totalVendas');
const valorVendido = document.querySelector('#valorVendido');
const listaFuncionarias = document.querySelector('#listaFuncionarias');
const btnSair = document.querySelector('#btnSair');


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
// FORMATAR DATA
// ========================================

function formatarData(data) {

    const [ano, mes, dia] = data.split('-');

    return `${dia}/${mes}/${ano}`;

}


// ========================================
// CRIAR INDICADOR
// ========================================

function criarIndicador(nome, valor) {

    return `
        <div class="bg-gray-800/70 border border-gray-700 rounded-xl p-4">

            <p class="text-xs text-gray-400 mb-2">
                ${nome}
            </p>

            <p class="text-lg font-semibold text-white">
                ${valor ?? 0}
            </p>

        </div>
    `;

}


// ========================================
// VERIFICAR ADMIN
// ========================================

async function verificarAdmin() {

    try {

        const resposta = await fetch('/api/me');

        if (!resposta.ok) {
            window.location.href = '/login/login.html';
            return;
        }

        const dados = await resposta.json();

        if (dados.usuario.tipo !== 'admin') {
            window.location.href = '/funcionaria/funcionaria.html';
            return;
        }

        nomeAdmin.textContent = dados.usuario.nome;

    } catch (erro) {

        console.error(erro);

        window.location.href = '/login/login.html';

    }

}


// ========================================
// CARREGAR FUNCIONÁRIAS
// ========================================

async function carregarFuncionarias() {

    try {

        const resposta = await fetch('/api/admin/funcionarias');

        const dados = await resposta.json();

        if (!resposta.ok) {
            console.error(dados.mensagem);
            return;
        }

        totalFuncionarias.textContent = dados.total;

    } catch (erro) {

        console.error(
            'Erro ao carregar funcionárias:',
            erro
        );

    }

}


// ========================================
// CARREGAR REGISTROS
// ========================================

async function carregarRegistros() {

    try {

        const resposta = await fetch('/api/admin/registros');

        const dados = await resposta.json();

        if (!resposta.ok) {

            listaFuncionarias.innerHTML = `
                <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-red-400">
                    ${dados.mensagem}
                </div>
            `;

            return;
        }


        const registros = dados.registros;


        // ========================================
        // CARDS DO TOPO - REGISTROS DE HOJE
        // ========================================

        const hoje = new Date()
            .toLocaleDateString('en-CA');


        const registrosHoje = registros.filter(
            registro => registro.data === hoje
        );


        const vendasHoje = registrosHoje.reduce(
            (total, registro) => {
                return total + Number(registro.numero_vendas);
            },
            0
        );


        const valorHoje = registrosHoje.reduce(
            (total, registro) => {
                return total + Number(registro.realizada);
            },
            0
        );


        totalVendas.textContent = vendasHoje;

        valorVendido.textContent =
            formatarDinheiro(valorHoje);


        // ========================================
        // SEM REGISTROS
        // ========================================

        if (registros.length === 0) {

            listaFuncionarias.innerHTML = `
                <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-400">
                    Nenhum registro encontrado.
                </div>
            `;

            return;
        }


        // LIMPA A LISTA

        listaFuncionarias.innerHTML = '';


        // ========================================
        // CRIA OS CARDS
        // ========================================

        registros.forEach(registro => {

            const card = document.createElement('article');

            card.className = `
                bg-gray-900
                border
                border-gray-800
                rounded-2xl
                p-6
                md:p-8
                shadow-xl
            `;


            card.innerHTML = `

                <!-- CABEÇALHO -->

                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">

                    <div>

                        <h4 class="text-xl font-bold text-white">
                            ${registro.nome_funcionaria}
                        </h4>

                        <p class="text-sm text-gray-400 mt-1">
                            ${registro.email_funcionaria}
                        </p>

                    </div>


                    <div class="text-sm text-gray-300 bg-gray-800 px-4 py-2 rounded-lg">

                        ${formatarData(registro.data)}

                    </div>

                </div>


                <!-- RESULTADOS -->

                <div class="mb-8">

                    <h5 class="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">
                        Resultados
                    </h5>


                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                        ${criarIndicador(
                            'Meta diária',
                            formatarDinheiro(registro.meta_diaria)
                        )}

                        ${criarIndicador(
                            'Valor realizado',
                            formatarDinheiro(registro.realizada)
                        )}

                        ${criarIndicador(
                            'Número de vendas',
                            registro.numero_vendas
                        )}

                    </div>

                </div>


                <!-- MENSAGENS -->

                <div class="mb-8">

                    <h5 class="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">
                        Mensagens
                    </h5>


                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                        ${criarIndicador(
                            'Quantidade de mensagens',
                            registro.quantidade_mensagens
                        )}

                        ${criarIndicador(
                            'Retornos',
                            registro.retornos
                        )}

                        ${criarIndicador(
                            'Vendas por mensagens',
                            registro.vendas_mensagens
                        )}

                    </div>

                </div>


                <!-- ÁUDIOS -->

                <div class="mb-8">

                    <h5 class="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">
                        Áudios
                    </h5>


                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                        ${criarIndicador(
                            'Quantidade de áudios',
                            registro.quantidade_audios
                        )}

                        ${criarIndicador(
                            'Retornos de áudio',
                            registro.retornos_audio
                        )}

                        ${criarIndicador(
                            'Vendas por áudio',
                            registro.vendas_audio
                        )}

                    </div>

                </div>


                <!-- PROSPECÇÃO -->

                <div>

                    <h5 class="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">
                        Prospecção
                    </h5>


                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        ${criarIndicador(
                            'Prospecções',
                            registro.prospeccao
                        )}

                        ${criarIndicador(
                            'Clientes novos',
                            registro.clientes_novos
                        )}

                    </div>

                </div>

            `;


            listaFuncionarias.appendChild(card);

        });


    } catch (erro) {

        console.error(
            'Erro ao carregar registros:',
            erro
        );

    }

}


// ========================================
// LOGOUT
// ========================================

btnSair.addEventListener('click', async () => {

    try {

        await fetch('/api/logout', {
            method: 'POST'
        });

        window.location.href = '/login/login.html';

    } catch (erro) {

        console.error(erro);

    }

});


// ========================================
// INICIAR PÁGINA
// ========================================

async function iniciarPagina() {

    await verificarAdmin();

    await carregarFuncionarias();

    await carregarRegistros();

}

iniciarPagina();