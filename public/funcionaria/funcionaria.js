// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const formRegistro = document.querySelector('#formRegistro');
const listaRegistros = document.querySelector('#listaRegistros');
const nomeUsuario = document.querySelector('#nomeUsuario');
const btnSalvar = document.querySelector('#btnSalvar');
const btnSair = document.querySelector('#btnSair');
const feedbackRegistro = document.querySelector('#feedbackRegistro');
let registrosCarregados = [];


// ========================================
// VERIFICAR USUÁRIO
// ========================================

async function verificarUsuario() {
    try {
        const resposta = await fetch('/api/me');

        if (!resposta.ok) {
            window.location.href = '../login/login.html';
            return;
        }

        const dados = await resposta.json();

        nomeUsuario.textContent = `Olá, ${dados.usuario.nome}!`;
    } catch (erro) {
        console.error('Erro ao verificar usuário:', erro);
    }
}


// ========================================
// DATA ATUAL
// ========================================

function colocarDataAtual() {
    const campoData = document.querySelector('#data');

    const hoje = new Date();

    const ano = hoje.getFullYear();

    const mes = String(
        hoje.getMonth() + 1
    ).padStart(2, '0');

    const dia = String(
        hoje.getDate()
    ).padStart(2, '0');

    campoData.value = `${ano}-${mes}-${dia}`;
}


// ========================================
// FORMATAR DATA
// ========================================

function formatarData(data) {
    if (!data) {
        return '-';
    }

    const [ano, mes, dia] = data.split('-');

    return `${dia}/${mes}/${ano}`;
}


// ========================================
// FORMATAR DINHEIRO
// ========================================

function formatarDinheiro(valor) {
    return Number(valor || 0).toLocaleString(
        'pt-BR',
        {
            style: 'currency',
            currency: 'BRL'
        }
    );
}


// ========================================
// CALCULAR PORCENTAGEM DA META
// ========================================

function calcularPorcentagem(meta, realizada) {
    const metaNumero = Number(meta);
    const realizadaNumero = Number(realizada);

    if (metaNumero <= 0) {
        return '0%';
    }

    const porcentagem =
        (realizadaNumero / metaNumero) * 100;

    return `${porcentagem.toFixed(1)}%`;
}


// ========================================
// MOSTRAR FEEDBACK
// ========================================

function mostrarFeedback(mensagem, erro = false) {
    feedbackRegistro.textContent = mensagem;

    feedbackRegistro.classList.remove(
        'hidden',
        'bg-green-950',
        'border-green-800',
        'text-green-300',
        'bg-red-950',
        'border-red-800',
        'text-red-300'
    );

    feedbackRegistro.classList.add('border');

    if (erro) {
        feedbackRegistro.classList.add(
            'bg-red-950',
            'border-red-800',
            'text-red-300'
        );
    } else {
        feedbackRegistro.classList.add(
            'bg-green-950',
            'border-green-800',
            'text-green-300'
        );
    }
}

function criarIndicador(nome, valor) {

    return `
        <div
            class="bg-gray-800/70 border border-gray-700 rounded-xl p-4"
        >
            <p
                class="text-xs text-gray-400 mb-2"
            >
                ${nome}
            </p>

            <p
                class="text-lg font-semibold text-white"
            >
                ${valor ?? 0}
            </p>
        </div>
    `;

}
// ========================================
// CARREGAR REGISTROS
// ========================================

async function carregarRegistros() {

    try {

        const resposta =
            await fetch('/api/registros');


        if (!resposta.ok) {

            throw new Error(
                'Erro ao buscar registros.'
            );

        }


        const dados =
            await resposta.json();


        registrosCarregados =
            dados.registros || [];


        listaRegistros.innerHTML = '';


        // ========================================
        // NENHUM REGISTRO
        // ========================================

        if (registrosCarregados.length === 0) {

            listaRegistros.innerHTML = `
                <div
                    class="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-400"
                >
                    Nenhum registro encontrado.
                </div>
            `;

            return;

        }


        // ========================================
        // CRIAR CARDS
        // ========================================

        registrosCarregados.forEach(
            (registro) => {

                const card =
                    document.createElement('article');


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

                    <div
                        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
                    >

                        <div>

                            <p
                                class="text-sm text-gray-400"
                            >
                                Registro
                            </p>

                            <h4
                                class="text-xl font-bold mt-1"
                            >
                                ${formatarData(
                                    registro.data
                                )}
                            </h4>

                        </div>


                        <button
                            type="button"
                            class="btnEditar self-start sm:self-auto px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-950 rounded-lg font-semibold cursor-pointer transition"
                            data-id="${registro.id}"
                        >
                            Editar
                        </button>

                    </div>


                    <!-- RESULTADOS -->

                    <div class="mb-8">

                        <h5
                            class="text-blue-400 font-semibold mb-4"
                        >
                            Resultados
                        </h5>


                        <div
                            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                        >

                            ${criarIndicador(
                                'Meta diária',
                                formatarDinheiro(
                                    registro.meta_diaria
                                )
                            )}

                            ${criarIndicador(
                                'Valor realizado',
                                formatarDinheiro(
                                    registro.realizada
                                )
                            )}

                            ${criarIndicador(
                                'Número de vendas',
                                registro.numero_vendas
                            )}

                            ${criarIndicador(
                                '% da meta',
                                calcularPorcentagem(
                                    registro.meta_diaria,
                                    registro.realizada
                                )
                            )}

                        </div>

                    </div>


                    <!-- MENSAGENS -->

                    <div class="mb-8">

                        <h5
                            class="text-blue-400 font-semibold mb-4"
                        >
                            Mensagens
                        </h5>


                        <div
                            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                        >

                            ${criarIndicador(
                                'Quantidade',
                                registro.quantidade_mensagens
                            )}

                            ${criarIndicador(
                                'Retornos',
                                registro.retornos
                            )}

                            ${criarIndicador(
                                'Vendas',
                                registro.vendas_mensagens
                            )}

                        </div>

                    </div>


                    <!-- ÁUDIOS -->

                    <div class="mb-8">

                        <h5
                            class="text-blue-400 font-semibold mb-4"
                        >
                            Áudios
                        </h5>


                        <div
                            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                        >

                            ${criarIndicador(
                                'Quantidade',
                                registro.quantidade_audios
                            )}

                            ${criarIndicador(
                                'Retornos',
                                registro.retornos_audio
                            )}

                            ${criarIndicador(
                                'Vendas',
                                registro.vendas_audio
                            )}

                        </div>

                    </div>


                    <!-- PROSPECÇÃO -->

                    <div>

                        <h5
                            class="text-blue-400 font-semibold mb-4"
                        >
                            Prospecção
                        </h5>


                        <div
                            class="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        >

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


                listaRegistros.appendChild(
                    card
                );

            }
        );


    } catch (erro) {

        console.error(
            'Erro ao carregar registros:',
            erro
        );


        listaRegistros.innerHTML = `
            <div
                class="bg-red-950 border border-red-800 rounded-2xl p-8 text-center text-red-300"
            >
                Erro ao carregar os registros.
            </div>
        `;

    }

}


// ========================================
// SALVAR REGISTRO
// ========================================

formRegistro.addEventListener('submit', async (event) => {
    event.preventDefault();


    // RESULTADOS

    const data =
        document.querySelector('#data').value;

    const metaDiaria =
        document.querySelector('#metaDiaria').value;

    const realizada =
        document.querySelector('#realizada').value;

    const numeroVendas =
        document.querySelector('#numeroVendas').value;


    // MENSAGENS

    const quantidadeMensagens =
        document.querySelector('#quantidadeMensagens').value;

    const retornos =
        document.querySelector('#retornos').value;

    const vendasMensagens =
        document.querySelector('#vendasMensagens').value;


    // ÁUDIOS

    const quantidadeAudios =
        document.querySelector('#quantidadeAudios').value;

    const retornosAudio =
        document.querySelector('#retornosAudio').value;

    const vendasAudio =
        document.querySelector('#vendasAudio').value;


    // PROSPECÇÃO

    const prospeccao =
        document.querySelector('#prospeccao').value;

    const clientesNovos =
        document.querySelector('#clientesNovos').value;


    // ========================================
    // VALIDAR
    // ========================================

    if (
        !data ||
        metaDiaria === '' ||
        realizada === '' ||
        numeroVendas === ''
    ) {
        mostrarFeedback(
            'Preencha os campos obrigatórios.',
            true
        );

        return;
    }


    // ========================================
    // DADOS QUE SERÃO ENVIADOS
    // ========================================

    const registro = {
        data: data,

        metaDiaria: Number(metaDiaria),
        realizada: Number(realizada),
        numeroVendas: Number(numeroVendas),

        quantidadeMensagens: Number(quantidadeMensagens),
        retornos: Number(retornos),
        vendasMensagens: Number(vendasMensagens),

        quantidadeAudios: Number(quantidadeAudios),
        retornosAudio: Number(retornosAudio),
        vendasAudio: Number(vendasAudio),

        prospeccao: Number(prospeccao),
        clientesNovos: Number(clientesNovos)
    };


    console.log('Registro enviado:', registro);


    try {
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';


        const resposta = await fetch(
            '/api/registros',
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify(registro)
            }
        );


        const dados = await resposta.json();


        if (!resposta.ok) {
            mostrarFeedback(
                dados.mensagem || 'Erro ao salvar registro.',
                true
            );

            return;
        }


        mostrarFeedback(
            dados.mensagem || 'Registro salvo com sucesso!'
        );


        // ========================================
        // LIMPAR FORMULÁRIO
        // ========================================

        formRegistro.reset();


        // Campos novos voltam para zero

        document.querySelector('#quantidadeMensagens').value = 0;
        document.querySelector('#retornos').value = 0;
        document.querySelector('#vendasMensagens').value = 0;

        document.querySelector('#quantidadeAudios').value = 0;
        document.querySelector('#retornosAudio').value = 0;
        document.querySelector('#vendasAudio').value = 0;

        document.querySelector('#prospeccao').value = 0;
        document.querySelector('#clientesNovos').value = 0;


        colocarDataAtual();


        // Atualiza o histórico

        await carregarRegistros();

    } catch (erro) {
        console.error('Erro ao salvar:', erro);

        mostrarFeedback(
            'Não foi possível conectar ao servidor.',
            true
        );

    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar registro';
    }
});

// ========================================
// EDITAR REGISTRO
// ========================================

function editarRegistro(id) {

    const registro = registrosCarregados.find(
        (registro) => registro.id === id
    );

    if (!registro) {
        return;
    }


    // RESULTADOS

    document.querySelector('#data').value =
        registro.data;

    document.querySelector('#metaDiaria').value =
        registro.meta_diaria;

    document.querySelector('#realizada').value =
        registro.realizada;

    document.querySelector('#numeroVendas').value =
        registro.numero_vendas;


    // MENSAGENS

    document.querySelector('#quantidadeMensagens').value =
        registro.quantidade_mensagens;

    document.querySelector('#retornos').value =
        registro.retornos;

    document.querySelector('#vendasMensagens').value =
        registro.vendas_mensagens;


    // ÁUDIOS

    document.querySelector('#quantidadeAudios').value =
        registro.quantidade_audios;

    document.querySelector('#retornosAudio').value =
        registro.retornos_audio;

    document.querySelector('#vendasAudio').value =
        registro.vendas_audio;


    // PROSPECÇÃO

    document.querySelector('#prospeccao').value =
        registro.prospeccao;

    document.querySelector('#clientesNovos').value =
        registro.clientes_novos;


    // MUDA O TEXTO DO BOTÃO

    btnSalvar.textContent = 'Salvar alterações';


    // SOBE ATÉ O FORMULÁRIO

    formRegistro.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}


// ========================================
// CLIQUE NO BOTÃO EDITAR
// ========================================

listaRegistros.addEventListener('click', (event) => {

    const botao =
        event.target.closest('.btnEditar');

    if (!botao) {
        return;
    }

    const id =
        Number(botao.dataset.id);

    editarRegistro(id);
});


// ========================================
// LOGOUT
// ========================================

btnSair.addEventListener('click', async () => {
    try {
        const resposta = await fetch(
            '/api/logout',
            {
                method: 'POST'
            }
        );


        if (resposta.ok) {
            window.location.href =
                '../login/login.html';

            return;
        }


        const dados = await resposta.json();

        alert(
            dados.mensagem || 'Erro ao sair.'
        );

    } catch (erro) {
        console.error('Erro ao sair:', erro);

        alert('Erro ao sair da conta.');
    }
});


// ========================================
// INICIAR APLICAÇÃO
// ========================================

verificarUsuario();

colocarDataAtual();

carregarRegistros();
