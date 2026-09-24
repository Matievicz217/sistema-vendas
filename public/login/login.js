const formLogin = document.querySelector('#formLogin');

formLogin.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.querySelector('#email').value.trim();
    const senha = document.querySelector('#senha').value;

    try {
        const resposta = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                senha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.mensagem);
            return;
        }

        alert(dados.mensagem);

        console.log('Usuário logado:', dados.usuario);

    } catch (erro) {
        console.error(erro);
        alert('Não foi possível conectar ao servidor.');
    }
});