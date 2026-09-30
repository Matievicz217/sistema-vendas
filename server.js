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
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);

app.use(express.static("public"));

// ========================================
// PÁGINA INICIAL
// ========================================

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/login/login.html");
});

// ========================================
// VERIFICAR ADMIN
// ========================================

function verificarAdmin(req, res, next) {
  // Verifica se existe usuário logado
  if (!req.session.usuarioId) {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Usuário não está logado.",
    });
  }

  // Verifica se o usuário é administrador
  if (req.session.tipo !== "admin") {
    return res.status(403).json({
      sucesso: false,
      mensagem: "Acesso não autorizado.",
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
      mensagem: "Preencha todos os campos.",
    });
  }

  try {
    // VERIFICA SE O E-MAIL JÁ EXISTE

    const usuarioExistente = db
      .prepare(
        `
                SELECT id
                FROM usuarios
                WHERE email = ?
            `,
      )
      .get(email);

    if (usuarioExistente) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Este e-mail já está cadastrado.",
      });
    }

    // CRIA O HASH DA SENHA

    const senhaHash = await bcrypt.hash(senha, 10);

    // INSERE USUÁRIO

    const inserirUsuario = db.prepare(`
            INSERT INTO usuarios (
                nome,
                email,
                senha_hash
            )
            VALUES (?, ?, ?)
        `);

    inserirUsuario.run(nome, email, senhaHash);

    res.json({
      sucesso: true,
      mensagem: "Usuário cadastrado com sucesso!",
    });
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao cadastrar usuário.",
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
      mensagem: "Preencha o e-mail e a senha.",
    });
  }

  try {
    // PROCURA USUÁRIO

    const usuario = db
      .prepare(
        `
                SELECT *
                FROM usuarios
                WHERE email = ?
            `,
      )
      .get(email);

    if (!usuario) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "E-mail ou senha incorretos.",
      });
    }

    // COMPARA SENHA

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaCorreta) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "E-mail ou senha incorretos.",
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
        tipo: usuario.tipo,
      },
    });
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao realizar login.",
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
      mensagem: "Usuário não está logado.",
    });
  }

  try {
    const usuario = db
      .prepare(
        `
                SELECT
                    id,
                    nome,
                    email,
                    tipo
                FROM usuarios
                WHERE id = ?
            `,
      )
      .get(req.session.usuarioId);

    if (!usuario) {
      return res.status(404).json({
        logado: false,
        mensagem: "Usuário não encontrado.",
      });
    }

    res.json({
      logado: true,

      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
      },
    });
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      logado: false,
      mensagem: "Erro ao verificar usuário.",
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
      mensagem: "Usuário não está logado.",
    });
  }

  // RECEBE DADOS

  const {
    data,
    realizada,
    numeroVendas,

    quantidadeMensagens,
    retornos,
    vendasMensagens,

    quantidadeAudios,
    retornosAudio,
    vendasAudio,

    prospeccao,
    clientesNovos,
  } = req.body;

  // ========================================
  // VALIDAÇÃO DOS CAMPOS
  // ========================================

  if (
    !data ||
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
      mensagem: "Preencha todos os campos.",
    });
  }

  // ========================================
  // VALIDAÇÃO DOS NÚMEROS
  // ========================================

  const valores = [
    realizada,
    numeroVendas,

    quantidadeMensagens,
    retornos,
    vendasMensagens,

    quantidadeAudios,
    retornosAudio,
    vendasAudio,

    prospeccao,
    clientesNovos,
  ];

  if (valores.some((valor) => isNaN(valor))) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Os valores precisam ser números.",
    });
  }

  try {
    // ========================================
    // VERIFICA SE JÁ EXISTE REGISTRO NA DATA
    // ========================================

    const registroExistente = db
      .prepare(
        `
                SELECT id
                FROM registros
                WHERE usuario_id = ?
                AND data = ?
            `,
      )
      .get(req.session.usuarioId, data);

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
        0,
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

        registroExistente.id,
      );

      return res.json({
        sucesso: true,
        mensagem: "Registro atualizado com sucesso!",
        registroId: registroExistente.id,
        atualizado: true,
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

      0,
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
    );

    res.json({
      sucesso: true,
      mensagem: "Registro salvo com sucesso!",
      registroId: resultado.lastInsertRowid,
      atualizado: false,
    });
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao salvar registro.",
    });
  }
});

// ========================================
// RESUMO MENSAL DA FUNCIONÁRIA
// ========================================

app.get("/api/me/resumo-mensal", (req, res) => {
  // ========================================
  // VERIFICAR LOGIN
  // ========================================

  if (!req.session.usuarioId) {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Usuário não está logado.",
    });
  }

  // ========================================
  // RECEBER MÊS E ANO
  // ========================================

  const { mes, ano } = req.query;

  const mesNumero = Number(mes);

  const anoNumero = Number(ano);

  // ========================================
  // VALIDAR
  // ========================================

  if (
    !mes ||
    !ano ||
    isNaN(mesNumero) ||
    isNaN(anoNumero) ||
    mesNumero < 1 ||
    mesNumero > 12
  ) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Mês ou ano inválido.",
    });
  }

  try {
    // Exemplo:
    // 2026 + mês 9 = "2026-09"

    const mesFormatado = String(mesNumero).padStart(2, "0");

    const periodo = `${anoNumero}-${mesFormatado}`;

    // ========================================
    // BUSCAR META MENSAL
    // ========================================

    const metaMensal = db
      .prepare(
        `
                SELECT meta

                FROM metas_mensais

                WHERE usuario_id = ?
                AND mes = ?
                AND ano = ?
            `,
      )
      .get(req.session.usuarioId, mesNumero, anoNumero);

    // ========================================
    // SOMAR REGISTROS DO MÊS
    // ========================================

    const resumo = db
      .prepare(
        `
                SELECT

                    COALESCE(
                        SUM(realizada),
                        0
                    ) AS valor_vendido,

                    COALESCE(
                        SUM(numero_vendas),
                        0
                    ) AS numero_vendas,

                    COALESCE(
                        SUM(quantidade_mensagens),
                        0
                    ) AS quantidade_mensagens,

                    COALESCE(
                        SUM(retornos),
                        0
                    ) AS retornos,

                    COALESCE(
                        SUM(vendas_mensagens),
                        0
                    ) AS vendas_mensagens,

                    COALESCE(
                        SUM(quantidade_audios),
                        0
                    ) AS quantidade_audios,

                    COALESCE(
                        SUM(retornos_audio),
                        0
                    ) AS retornos_audio,

                    COALESCE(
                        SUM(vendas_audio),
                        0
                    ) AS vendas_audio,

                    COALESCE(
                        SUM(prospeccao),
                        0
                    ) AS prospeccao,

                    COALESCE(
                        SUM(clientes_novos),
                        0
                    ) AS clientes_novos

                FROM registros

                WHERE usuario_id = ?

                AND substr(data, 1, 7) = ?
            `,
      )
      .get(req.session.usuarioId, periodo);

    // ========================================
    // CALCULAR META
    // ========================================

    const meta = metaMensal ? Number(metaMensal.meta) : 0;

    const vendido = Number(resumo.valor_vendido);

    const porcentagem = meta > 0 ? (vendido / meta) * 100 : 0;

    // ========================================
    // RESPOSTA
    // ========================================

    res.json({
      sucesso: true,

      mes: mesNumero,

      ano: anoNumero,

      resumo: {
        meta_mensal: meta,

        valor_vendido: vendido,

        porcentagem_meta: Number(porcentagem.toFixed(2)),

        numero_vendas: Number(resumo.numero_vendas),

        quantidade_mensagens: Number(resumo.quantidade_mensagens),

        retornos: Number(resumo.retornos),

        vendas_mensagens: Number(resumo.vendas_mensagens),

        quantidade_audios: Number(resumo.quantidade_audios),

        retornos_audio: Number(resumo.retornos_audio),

        vendas_audio: Number(resumo.vendas_audio),

        prospeccao: Number(resumo.prospeccao),

        clientes_novos: Number(resumo.clientes_novos),
      },
    });
  } catch (erro) {
    console.error("Erro ao gerar resumo mensal:", erro);

    res.status(500).json({
      sucesso: false,

      mensagem: "Erro ao gerar resumo mensal.",
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
      mensagem: "Usuário não está logado.",
    });
  }

  try {
    const registros = db
      .prepare(
        `
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
            `,
      )
      .all(req.session.usuarioId);

    res.json({
      sucesso: true,
      registros: registros,
    });
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao buscar registros.",
    });
  }
});

// ========================================
// ADMIN - CRIAR / ATUALIZAR META MENSAL
// ========================================

app.post("/api/admin/metas", verificarAdmin, (req, res) => {
  const { usuarioId, mes, ano, meta } = req.body;

  // Verifica se todos os campos foram enviados
  if (
    usuarioId === undefined ||
    mes === undefined ||
    ano === undefined ||
    meta === undefined
  ) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Preencha todos os campos.",
    });
  }

  // Converte os valores
  const usuarioIdNumero = Number(usuarioId);
  const mesNumero = Number(mes);
  const anoNumero = Number(ano);
  const metaNumero = Number(meta);

  // Valida os números
  if (
    isNaN(usuarioIdNumero) ||
    isNaN(mesNumero) ||
    isNaN(anoNumero) ||
    isNaN(metaNumero)
  ) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Os valores enviados são inválidos.",
    });
  }

  // Mês precisa estar entre 1 e 12
  if (mesNumero < 1 || mesNumero > 12) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Mês inválido.",
    });
  }

  // Meta não pode ser negativa
  if (metaNumero < 0) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "A meta não pode ser negativa.",
    });
  }

  try {
    // Confirma que a funcionária existe
    const funcionaria = db
      .prepare(
        `
                SELECT id
                FROM usuarios
                WHERE id = ?
                AND tipo = 'funcionaria'
            `,
      )
      .get(usuarioIdNumero);

    if (!funcionaria) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Funcionária não encontrada.",
      });
    }

    // Cria a meta ou atualiza caso já exista
    db.prepare(
      `
            INSERT INTO metas_mensais (
                usuario_id,
                mes,
                ano,
                meta
            )
            VALUES (?, ?, ?, ?)

            ON CONFLICT(usuario_id, mes, ano)
            DO UPDATE SET
                meta = excluded.meta
        `,
    ).run(usuarioIdNumero, mesNumero, anoNumero, metaNumero);

    res.json({
      sucesso: true,
      mensagem: "Meta mensal salva com sucesso!",
    });
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao salvar meta mensal.",
    });
  }
});

// ========================================
// ADMIN - BUSCAR FUNCIONÁRIAS
// ========================================

app.get("/api/admin/funcionarias", verificarAdmin, (req, res) => {
  try {
    const funcionarias = db
      .prepare(
        `
                SELECT
                    id,
                    nome,
                    email
                FROM usuarios
                WHERE tipo = 'funcionaria'
                ORDER BY nome ASC
            `,
      )
      .all();

    res.json({
      sucesso: true,
      total: funcionarias.length,
      funcionarias: funcionarias,
    });
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao buscar funcionárias.",
    });
  }
});

// ========================================
// ADMIN - RESUMO MENSAL DAS FUNCIONÁRIAS
// ========================================

app.get("/api/admin/resumo-mensal", verificarAdmin, (req, res) => {
  const { mes, ano } = req.query;

  const mesNumero = Number(mes);
  const anoNumero = Number(ano);

  if (
    !mes ||
    !ano ||
    isNaN(mesNumero) ||
    isNaN(anoNumero) ||
    mesNumero < 1 ||
    mesNumero > 12
  ) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Mês ou ano inválido.",
    });
  }

  try {
    // Transforma 9 em "09"
    const mesFormatado = String(mesNumero).padStart(2, "0");

    // Exemplo: "2026-09"
    const periodo = `${anoNumero}-${mesFormatado}`;

    const resumo = db
      .prepare(
        `
                SELECT
                    usuarios.id AS usuario_id,
                    usuarios.nome AS nome_funcionaria,
                    usuarios.email AS email_funcionaria,

                    COALESCE(metas_mensais.meta, 0) AS meta_mensal,

                    COALESCE(SUM(registros.realizada), 0) AS valor_vendido,
                    COALESCE(SUM(registros.numero_vendas), 0) AS numero_vendas,

                    COALESCE(SUM(registros.quantidade_mensagens), 0)
                        AS quantidade_mensagens,

                    COALESCE(SUM(registros.retornos), 0)
                        AS retornos,

                    COALESCE(SUM(registros.vendas_mensagens), 0)
                        AS vendas_mensagens,

                    COALESCE(SUM(registros.quantidade_audios), 0)
                        AS quantidade_audios,

                    COALESCE(SUM(registros.retornos_audio), 0)
                        AS retornos_audio,

                    COALESCE(SUM(registros.vendas_audio), 0)
                        AS vendas_audio,

                    COALESCE(SUM(registros.prospeccao), 0)
                        AS prospeccao,

                    COALESCE(SUM(registros.clientes_novos), 0)
                        AS clientes_novos

                FROM usuarios

                LEFT JOIN registros
                    ON registros.usuario_id = usuarios.id
                    AND substr(registros.data, 1, 7) = ?

                LEFT JOIN metas_mensais
                    ON metas_mensais.usuario_id = usuarios.id
                    AND metas_mensais.mes = ?
                    AND metas_mensais.ano = ?

                WHERE usuarios.tipo = 'funcionaria'

                GROUP BY
                    usuarios.id,
                    usuarios.nome,
                    usuarios.email,
                    metas_mensais.meta

                ORDER BY usuarios.nome ASC
            `,
      )
      .all(periodo, mesNumero, anoNumero);

    // Calcula a porcentagem da meta
    const resultado = resumo.map((funcionaria) => {
      const meta = Number(funcionaria.meta_mensal);
      const vendido = Number(funcionaria.valor_vendido);

      const porcentagem = meta > 0 ? (vendido / meta) * 100 : 0;

      return {
        ...funcionaria,
        porcentagem_meta: Number(porcentagem.toFixed(2)),
      };
    });

    res.json({
      sucesso: true,
      mes: mesNumero,
      ano: anoNumero,
      funcionarias: resultado,
    });
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao gerar resumo mensal.",
    });
  }
});

// ========================================
// ADMIN - BUSCAR TODOS OS REGISTROS
// ========================================

app.get("/api/admin/registros", verificarAdmin, (req, res) => {
  try {
    const registros = db
      .prepare(
        `
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
            `,
      )
      .all();

    res.json({
      sucesso: true,
      registros: registros,
    });
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao buscar registros.",
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
        mensagem: "Erro ao sair da conta.",
      });
    }

    res.json({
      sucesso: true,
      mensagem: "Logout realizado com sucesso!",
    });
  });
});

// ========================================
// INICIAR SERVIDOR
// ========================================
console.log(
  app.router.stack.filter((item) => item.route).map((item) => item.route.path),
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
