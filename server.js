const express = require("express");
const db = require("./database");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();
const PORT = 3000;


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
// CADASTRO
// ========================================

app.post("/api/cadastro", async (req, res) => {

    const { nome, email, senha } = req.body;


    // Verificação básica

    if (!nome || !email || !senha) {

        return res.status(400).json({
            sucesso: false,
            mensagem: "Preencha todos os campos."
        });

    }


    try {

        // Verifica se o e-mail já existe

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


        // Cria o hash da senha

        const senhaHash = await bcrypt.hash(
            senha,
            10
        );


        // Insere usuário

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


    // Verificação básica

    if (!email || !senha) {

        return res.status(400).json({

            sucesso: false,

            mensagem: "Preencha o e-mail e a senha."

        });

    }


    try {

        // Procura o usuário pelo e-mail

        const usuario = db
            .prepare(`
                SELECT *
                FROM usuarios
                WHERE email = ?
            `)
            .get(email);


        // Usuário não encontrado

        if (!usuario) {

            return res.status(401).json({

                sucesso: false,

                mensagem: "E-mail ou senha incorretos."

            });

        }


        // Compara a senha

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


        // Cria sessão

        req.session.usuarioId = usuario.id;

        req.session.tipo = usuario.tipo;


        // Resposta

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


    // Verifica sessão

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
// CRIAR REGISTRO DIÁRIO
// ========================================

app.post("/api/registros", (req, res) => {


    // Verifica se está logado

    if (!req.session.usuarioId) {

        return res.status(401).json({

            sucesso: false,

            mensagem: "Usuário não está logado."

        });

    }


    const {
        data,
        metaDiaria,
        realizada,
        numeroVendas
    } = req.body;


    // ========================================
    // VALIDAÇÃO
    // ========================================

    if (
        !data ||
        metaDiaria === undefined ||
        realizada === undefined ||
        numeroVendas === undefined
    ) {

        return res.status(400).json({

            sucesso: false,

            mensagem: "Preencha todos os campos."

        });

    }


    // Verifica se os valores são números

    if (
        isNaN(metaDiaria) ||
        isNaN(realizada) ||
        isNaN(numeroVendas)
    ) {

        return res.status(400).json({

            sucesso: false,

            mensagem: "Os valores precisam ser números."

        });

    }


    try {

        // Insere o registro

        const inserirRegistro = db.prepare(`
            INSERT INTO registros (
                usuario_id,
                data,
                meta_diaria,
                realizada,
                numero_vendas
            )
            VALUES (?, ?, ?, ?, ?)
        `);


        const resultado = inserirRegistro.run(

            req.session.usuarioId,

            data,

            Number(metaDiaria),

            Number(realizada),

            Number(numeroVendas)

        );


        // Resposta

        res.json({

            sucesso: true,

            mensagem: "Registro salvo com sucesso!",

            registroId: resultado.lastInsertRowid

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


    // Verifica se está logado

    if (!req.session.usuarioId) {

        return res.status(401).json({

            sucesso: false,

            mensagem: "Usuário não está logado."

        });

    }


    try {

        // Busca somente os registros
        // da funcionária logada

        const registros = db
            .prepare(`
                SELECT
                    id,
                    data,
                    meta_diaria,
                    realizada,
                    numero_vendas
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

app.listen(PORT, () => {

    console.log(
        `Servidor rodando em http://localhost:${PORT}`
    );

});