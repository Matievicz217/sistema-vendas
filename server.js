const express = require("express");
const db = require("./database");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

console.log("SERVER NOVO CARREGADO");


// ========================================
// MIDDLEWARES
// ========================================

app.use(express.json());

app.use(
    session({
        secret: "sistema-vendas-segredo",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 8
        }
    })
);

app.use(express.static("public"));


// ========================================
// PÁGINA INICIAL
// ========================================

app.get("/", (req, res) => {
    res.sendFile(
        __dirname + "/public/login/login.html"
    );
});

// ========================================
// VERIFICAR ADMIN
// ========================================

function verificarAdmin(req, res, next) {

    // Verifica se existe usuário logado
    if (!req.session.usuarioId) {

        return res.status(401).json({
            sucesso: false,
            mensagem: "Usuário não está logado."
        });

    }

    // Verifica se o usuário é administrador
    if (req.session.tipo !== 'admin') {

        return res.status(403).json({
            sucesso: false,
            mensagem: "Acesso não autorizado."
        });

    }

    // É admin, pode continuar
    next();
}


// ========================================
// CADASTRO
// ========================================

app.post("/api/cadastro", async (req, res) => {

    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Preencha todos os campos."
        });
    }

    try {

        // VERIFICA SE O E-MAIL JÁ EXISTE

        const usuarioExistente = db
            .prepare(`
                SELECT id
                FROM usuarios
                WHERE email = ?
            `)
            .get(email);

        if (usuarioExistente) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Este e-mail já está cadastrado."
            });
        }


        // CRIA O HASH DA SENHA

        const senhaHash = await bcrypt.hash(
            senha,
            10
        );


        // INSERE USUÁRIO

        const inserirUsuario = db.prepare(`
            INSERT INTO usuarios (
                nome,
                email,
                senha_hash
            )
            VALUES (?, ?, ?)
        `);

        inserirUsuario.run(
            nome,
            email,
            senhaHash
        );


        res.json({
            sucesso: true,
            mensagem: "Usuário cadastrado com sucesso!"
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao cadastrar usuário."
        });
    }

});


// ========================================
// LOGIN
// ========================================

app.post("/api/login", async (req, res) => {

    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Preencha o e-mail e a senha."
        });
    }

    try {

        // PROCURA USUÁRIO

        const usuario = db
            .prepare(`
                SELECT *
                FROM usuarios
                WHERE email = ?
            `)
            .get(email);


        if (!usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "E-mail ou senha incorretos."
            });
        }


        // COMPARA SENHA

        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha_hash
        );


        if (!senhaCorreta) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "E-mail ou senha incorretos."
            });
        }


        // CRIA SESSÃO

        req.session.usuarioId = usuario.id;
        req.session.tipo = usuario.tipo;


        res.json({
            sucesso: true,
            mensagem: "Login realizado com sucesso!",

            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                tipo: usuario.tipo
            }
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao realizar login."
        });
    }

});


// ========================================
// VERIFICAR USUÁRIO LOGADO
// ========================================

app.get("/api/me", (req, res) => {

    if (!req.session.usuarioId) {
        return res.status(401).json({
            logado: false,
            mensagem: "Usuário não está logado."
        });
    }

    try {

        const usuario = db
            .prepare(`
                SELECT
                    id,
                    nome,
                    email,
                    tipo
                FROM usuarios
                WHERE id = ?
            `)
            .get(req.session.usuarioId);


        if (!usuario) {
            return res.status(404).json({
                logado: false,
                mensagem: "Usuário não encontrado."
            });
        }


        res.json({
            logado: true,

            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                tipo: usuario.tipo
            }
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            logado: false,
            mensagem: "Erro ao verificar usuário."
        });
    }

});


// ========================================
// CRIAR / ATUALIZAR REGISTRO DIÁRIO
// ========================================

app.post("/api/registros", (req, res) => {

    // VERIFICA LOGIN

    if (!req.session.usuarioId) {
        return res.status(401).json({
            sucesso: false,
            mensagem: "Usuário não está logado."
        });
    }


    // RECEBE DADOS

    const {
        data,
        metaDiaria,
        realizada,
        numeroVendas,

        quantidadeMensagens,
        retornos,
        vendasMensagens,

        quantidadeAudios,
        retornosAudio,
        vendasAudio,

        prospeccao,
        clientesNovos
    } = req.body;


    // ========================================
    // VALIDAÇÃO DOS CAMPOS
    // ========================================

    if (
        !data ||
        metaDiaria === undefined ||
        realizada === undefined ||
        numeroVendas === undefined ||
        quantidadeMensagens === undefined ||
        retornos === undefined ||
        vendasMensagens === undefined ||
        quantidadeAudios === undefined ||
        retornosAudio === undefined ||
        vendasAudio === undefined ||
        prospeccao === undefined ||
        clientesNovos === undefined
    ) {

        return res.status(400).json({
            sucesso: false,
            mensagem: "Preencha todos os campos."
        });
    }


    // ========================================
    // VALIDAÇÃO DOS NÚMEROS
    // ========================================

    const valores = [
        metaDiaria,
        realizada,
        numeroVendas,

        quantidadeMensagens,
        retornos,
        vendasMensagens,

        quantidadeAudios,
        retornosAudio,
        vendasAudio,

        prospeccao,
        clientesNovos
    ];


    if (valores.some(valor => isNaN(valor))) {

        return res.status(400).json({
            sucesso: false,
            mensagem: "Os valores precisam ser números."
        });
    }


    try {

        // ========================================
        // VERIFICA SE JÁ EXISTE REGISTRO NA DATA
        // ========================================

        const registroExistente = db
            .prepare(`
                SELECT id
                FROM registros
                WHERE usuario_id = ?
                AND data = ?
            `)
            .get(
                req.session.usuarioId,
                data
            );


        // ========================================
        // SE EXISTE → ATUALIZA
        // ========================================

        if (registroExistente) {

            const atualizarRegistro = db.prepare(`
                UPDATE registros
                SET
                    meta_diaria = ?,
                    realizada = ?,
                    numero_vendas = ?,

                    quantidade_mensagens = ?,
                    retornos = ?,
                    vendas_mensagens = ?,

                    quantidade_audios = ?,
                    retornos_audio = ?,
                    vendas_audio = ?,

                    prospeccao = ?,
                    clientes_novos = ?

                WHERE id = ?
            `);


            atualizarRegistro.run(
                Number(metaDiaria),
                Number(realizada),
                Number(numeroVendas),

                Number(quantidadeMensagens),
                Number(retornos),
                Number(vendasMensagens),

                Number(quantidadeAudios),
                Number(retornosAudio),
                Number(vendasAudio),

                Number(prospeccao),
                Number(clientesNovos),

                registroExistente.id
            );


            return res.json({
                sucesso: true,
                mensagem: "Registro atualizado com sucesso!",
                registroId: registroExistente.id,
                atualizado: true
            });
        }


        // ========================================
        // SE NÃO EXISTE → CRIA
        // ========================================

        const inserirRegistro = db.prepare(`
            INSERT INTO registros (
                usuario_id,
                data,

                meta_diaria,
                realizada,
                numero_vendas,

                quantidade_mensagens,
                retornos,
                vendas_mensagens,

                quantidade_audios,
                retornos_audio,
                vendas_audio,

                prospeccao,
                clientes_novos
            )

            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);


        const resultado = inserirRegistro.run(
            req.session.usuarioId,
            data,

            Number(metaDiaria),
            Number(realizada),
            Number(numeroVendas),

            Number(quantidadeMensagens),
            Number(retornos),
            Number(vendasMensagens),

            Number(quantidadeAudios),
            Number(retornosAudio),
            Number(vendasAudio),

            Number(prospeccao),
            Number(clientesNovos)
        );


        res.json({
            sucesso: true,
            mensagem: "Registro salvo com sucesso!",
            registroId: resultado.lastInsertRowid,
            atualizado: false
        });


    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao salvar registro."
        });
    }

});


// ========================================
// BUSCAR REGISTROS DA FUNCIONÁRIA
// ========================================

app.get("/api/registros", (req, res) => {

    if (!req.session.usuarioId) {
        return res.status(401).json({
            sucesso: false,
            mensagem: "Usuário não está logado."
        });
    }


    try {

        const registros = db
            .prepare(`
                SELECT
                    id,
                    data,

                    meta_diaria,
                    realizada,
                    numero_vendas,

                    quantidade_mensagens,
                    retornos,
                    vendas_mensagens,

                    quantidade_audios,
                    retornos_audio,
                    vendas_audio,

                    prospeccao,
                    clientes_novos

                FROM registros

                WHERE usuario_id = ?

                ORDER BY data DESC
            `)
            .all(req.session.usuarioId);


        res.json({
            sucesso: true,
            registros: registros
        });


    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao buscar registros."
        });
    }

});

// ========================================
// ADMIN - BUSCAR FUNCIONÁRIAS
// ========================================

app.get("/api/admin/funcionarias", verificarAdmin, (req, res) => {

    try {

        const funcionarias = db
            .prepare(`
                SELECT
                    id,
                    nome,
                    email
                FROM usuarios
                WHERE tipo = 'funcionaria'
                ORDER BY nome ASC
            `)
            .all();

        res.json({
            sucesso: true,
            total: funcionarias.length,
            funcionarias: funcionarias
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao buscar funcionárias."
        });

    }

});

// ========================================
// ADMIN - BUSCAR TODOS OS REGISTROS
// ========================================

app.get("/api/admin/registros", verificarAdmin, (req, res) => {

    try {

        const registros = db
            .prepare(`
                SELECT
                    registros.id,
                    registros.data,

                    registros.meta_diaria,
                    registros.realizada,
                    registros.numero_vendas,

                    registros.quantidade_mensagens,
                    registros.retornos,
                    registros.vendas_mensagens,

                    registros.quantidade_audios,
                    registros.retornos_audio,
                    registros.vendas_audio,

                    registros.prospeccao,
                    registros.clientes_novos,

                    usuarios.id AS usuario_id,
                    usuarios.nome AS nome_funcionaria,
                    usuarios.email AS email_funcionaria

                FROM registros

                INNER JOIN usuarios
                    ON registros.usuario_id = usuarios.id

                WHERE usuarios.tipo = 'funcionaria'

                ORDER BY registros.data DESC
            `)
            .all();


        res.json({
            sucesso: true,
            registros: registros
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao buscar registros."
        });

    }

});


// ========================================
// LOGOUT
// ========================================

app.post("/api/logout", (req, res) => {

    req.session.destroy((erro) => {

        if (erro) {

            console.error(erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao sair da conta."
            });
        }


        res.json({
            sucesso: true,
            mensagem: "Logout realizado com sucesso!"
        });

    });

});


// ========================================
// INICIAR SERVIDOR
// ========================================
console.log(
    app.router.stack
        .filter(item => item.route)
        .map(item => item.route.path)
);


app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Servidor rodando na porta ${PORT}`
    );

});