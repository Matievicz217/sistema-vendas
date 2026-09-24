const formCadastro = document.querySelector('#formCadastro');

formCadastro.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nome = document.querySelector('#nome').value.trim();
    const email = document.querySelector('#email').value.trim();
    const senha = document.querySelector('#senha').value;
    const confirmarSenha = document.querySelector('#confirmarSenha').value;

    if (senha !== confirmarSenha) {
        alert('As senhas não são iguais.');
        return;
    }

    if (senha.length < 6) {
        alert('A senha precisa ter pelo menos 6 caracteres.');
        return;
    }

    try {
        const resposta = await fetch('/api/cadastro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome,
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

        formCadastro.reset();

    } catch (erro) {
        console.error(erro);
        alert('Não foi possível conectar ao servidor.');
    }
});