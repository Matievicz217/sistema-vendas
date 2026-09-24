console.log("1 - FUNCIONARIA.JS CARREGADO");


// ========================================
// VERIFICAR USUÁRIO LOGADO
// ========================================

async function verificarUsuario() {

    console.log("2 - verificando usuário");

    try {

        const resposta = await fetch('/api/me');

        console.log(
            "3 - resposta /api/me:",
            resposta.status
        );


        if (!resposta.ok) {

            console.log("Usuário não está logado.");

            window.location.href = '../login/login.html';

            return;

        }


        const dados = await resposta.json();

        console.log(
            "4 - usuário recebido:",
            dados
        );


        document.querySelector('#nomeUsuario').textContent =
            `Olá, ${dados.usuario.nome}!`;


    } catch (erro) {

        console.error(
            "ERRO em verificarUsuario:",
            erro
        );

    }

}


// ========================================
// COLOCAR DATA ATUAL
// ========================================

function colocarDataAtual() {

    console.log("5 - colocando data atual");

    const campoData =
        document.querySelector('#data');


    const hoje = new Date();

    const ano =
        hoje.getFullYear();

    const mes =
        String(
            hoje.getMonth() + 1
        ).padStart(2, '0');

    const dia =
        String(
            hoje.getDate()
        ).padStart(2, '0');


    campoData.value =
        `${ano}-${mes}-${dia}`;


    console.log(
        "6 - data definida:",
        campoData.value
    );

}


// ========================================
// BUSCAR REGISTROS
// ========================================

async function carregarRegistros() {

    console.log(
        "7 - iniciando carregamento dos registros"
    );


    try {

        const resposta =
            await fetch('/api/registros');


        console.log(
            "8 - resposta /api/registros:",
            resposta.status
        );


        const dados =
            await resposta.json();


        console.log(
            "9 - registros recebidos:",
            dados
        );


        const listaRegistros =
            document.querySelector(
                '#listaRegistros'
            );


        console.log(
            "10 - elemento da tabela:",
            listaRegistros
        );


        if (dados.registros.length === 0) {

            listaRegistros.innerHTML = `
                <tr>

                    <td
                        colspan="4"
                        class="px-6 py-6 text-center text-gray-500"
                    >

                        Nenhum registro encontrado.

                    </td>

                </tr>
            `;

            return;

        }


        listaRegistros.innerHTML = '';


        dados.registros.forEach(
            (registro) => {

                console.log(
                    "11 - adicionando registro:",
                    registro
                );


                const linha =
                    document.createElement('tr');


                linha.classList.add(
                    'border-t',
                    'border-gray-800'
                );


                linha.innerHTML = `

                    <td class="px-6 py-4">
                        ${registro.data}
                    </td>

                    <td class="px-6 py-4">
                        R$ ${Number(
                            registro.meta_diaria
                        ).toFixed(2)}
                    </td>

                    <td class="px-6 py-4">
                        R$ ${Number(
                            registro.realizada
                        ).toFixed(2)}
                    </td>

                    <td class="px-6 py-4">
                        ${registro.numero_vendas}
                    </td>

                `;


                listaRegistros.appendChild(
                    linha
                );

            }
        );


        console.log(
            "12 - registros colocados na tabela"
        );


    } catch (erro) {

        console.error(
            "ERRO em carregarRegistros:",
            erro
        );

    }

}


// ========================================
// SALVAR REGISTRO
// ========================================

const formRegistro =
    document.querySelector(
        '#formRegistro'
    );


console.log(
    "13 - formulário encontrado:",
    formRegistro
);


formRegistro.addEventListener(
    'submit',
    async (event) => {

        event.preventDefault();


        console.log(
            "14 - formulário enviado"
        );


        const data =
            document.querySelector(
                '#data'
            ).value;


        const metaDiaria =
            document.querySelector(
                '#metaDiaria'
            ).value;


        const realizada =
            document.querySelector(
                '#realizada'
            ).value;


        const numeroVendas =
            document.querySelector(
                '#numeroVendas'
            ).value;


        console.log(
            "15 - dados:",
            {
                data,
                metaDiaria,
                realizada,
                numeroVendas
            }
        );


        try {

            const resposta =
                await fetch(
                    '/api/registros',
                    {

                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({

                            data,

                            metaDiaria,

                            realizada,

                            numeroVendas

                        })

                    }
                );


            const dados =
                await resposta.json();


            console.log(
                "16 - resposta ao salvar:",
                dados
            );


            if (!resposta.ok) {

                alert(
                    dados.mensagem
                );

                return;

            }


            alert(
                dados.mensagem
            );


            document.querySelector(
                '#metaDiaria'
            ).value = '';


            document.querySelector(
                '#realizada'
            ).value = '';


            document.querySelector(
                '#numeroVendas'
            ).value = '';


            colocarDataAtual();


            carregarRegistros();

        } catch (erro) {

            console.error(
                "ERRO ao salvar:",
                erro
            );

            alert(
                'Não foi possível conectar ao servidor.'
            );

        }

    }
);


// ========================================
// LOGOUT
// ========================================

const btnSair =
    document.querySelector(
        '#btnSair'
    );


console.log(
    "17 - botão sair encontrado:",
    btnSair
);


btnSair.addEventListener(
    'click',
    async () => {

        console.log(
            "18 - botão sair clicado"
        );


        try {

            const resposta =
                await fetch(
                    '/api/logout',
                    {
                        method: 'POST'
                    }
                );


            const dados =
                await resposta.json();


            if (resposta.ok) {

                window.location.href =
                    '../login/login.html';

            } else {

                alert(
                    dados.mensagem
                );

            }

        } catch (erro) {

            console.error(
                "ERRO ao sair:",
                erro
            );

            alert(
                'Erro ao sair da conta.'
            );

        }

    }
);


// ========================================
// INICIALIZAÇÃO
// ========================================

console.log(
    "19 - iniciando aplicação"
);


verificarUsuario();

colocarDataAtual();

carregarRegistros();


console.log(
    "20 - aplicação iniciada"
);