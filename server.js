require("dotenv").config();
const express = require("express");
const crypto = require("node:crypto");
const path = require("node:path");
const db = require("./database");
const bcrypt = require("bcrypt");
const session = require("express-session");
const SqliteStore = require("better-sqlite3-session-store")(session);
const verificarAdmin = require("./middleware/verificar-admin");
const {
  normalizarEmail,
  textoValido,
  valorNumerico,
  emailValido,
  dataValida,
} = require("./lib/validation");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

class SessionStore extends SqliteStore {
  startInterval() {
    this.expirationTimer = setInterval(
      this.clearExpiredSessions.bind(this),
      this.expired.intervalMs,
    );
    this.expirationTimer.unref();
  }

  stopInterval() {
    clearInterval(this.expirationTimer);
  }
}

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PORT deve ser um número entre 1 e 65535.");
}

if (
  process.env.NODE_ENV === "production" &&
  (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
) {
  throw new Error("SESSION_SECRET deve ter pelo menos 32 caracteres em produção.");
}
if (
  process.env.NODE_ENV === "production" &&
  (!process.env.CODIGO_CADASTRO || process.env.CODIGO_CADASTRO.length < 16)
) {
  throw new Error("CODIGO_CADASTRO deve ter pelo menos 16 caracteres em produção.");
}
const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

if (!process.env.SESSION_SECRET && process.env.NODE_ENV !== "production") {
  console.warn("SESSION_SECRET não definido; sessões serão invalidadas ao reiniciar.");
}

// O Render termina HTTPS no proxy antes de encaminhar a requisição ao Node.
// Uma configuração explícita continua tendo prioridade, inclusive o valor 0.
const trustProxy =
  process.env.TRUST_PROXY_HOPS || (process.env.RENDER === "true" ? "1" : "0");
if (!/^\d+$/.test(trustProxy) || Number(trustProxy) > 5) {
  throw new Error("TRUST_PROXY_HOPS deve ser um inteiro entre 0 e 5.");
}
if (Number(trustProxy) > 0) {
  app.set("trust proxy", Number(trustProxy));
}

app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// ========================================
// MIDDLEWARES
// ========================================

app.get("/healthz", (req, res) => {
  try {
    db.prepare("SELECT 1").get();
    res.json({ status: "ok" });
  } catch (erro) {
    console.error("Health check falhou:", erro);
    res.status(503).json({ status: "indisponível" });
  }
});

app.use(express.json());

const sessionStore = new SessionStore({
  client: db,
  expired: {
    clear: true,
    intervalMs: 15 * 60 * 1000,
  },
});

app.use(
  session({
    store: sessionStore,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);

app.use(express.static(path.join(__dirname, "public")));

// ========================================
// PÁGINA INICIAL
// ========================================

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/login/login.html");
});

const cadastroLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    sucesso: false,
    mensagem: "Muitas tentativas de cadastro. Aguarde 15 minutos.",
  },
});

// ========================================
// CADASTRO
// ========================================

app.post("/api/cadastro", cadastroLimiter, async (req, res) => {
  const nome = typeof req.body?.nome === "string" ? req.body.nome.trim() : "";
  const email = normalizarEmail(req.body?.email);
  const senha = typeof req.body?.senha === "string" ? req.body.senha : "";
  const codigoAcesso =
    typeof req.body?.codigoAcesso === "string"
      ? req.body.codigoAcesso.trim()
      : "";

  if (
    !process.env.CODIGO_CADASTRO ||
    codigoAcesso !== process.env.CODIGO_CADASTRO
  ) {
    return res.status(403).json({
      sucesso: false,
      mensagem: "Código de acesso inválido.",
    });
  }

  if (!textoValido(nome, { min: 2, max: 120 })) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Informe um nome válido com pelo menos 2 caracteres.",
    });
  }

  if (!emailValido(email)) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Informe um e-mail válido.",
    });
  }

  if (typeof senha !== "string" || senha.length < 8 || senha.length > 128) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "A senha deve ter entre 8 e 128 caracteres.",
    });
  }

  try {
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

    const senhaHash = await bcrypt.hash(senha, 10);

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
    if (erro.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Este e-mail já está cadastrado.",
      });
    }

    console.error(erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao cadastrar usuário.",
    });
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    sucesso: false,
    mensagem: "Muitas tentativas. Aguarde 15 minutos.",
  },
});

// ========================================
// LOGIN
// ========================================

app.post("/api/login", loginLimiter, async (req, res) => {
  const email = normalizarEmail(req.body?.email);
  const senha = typeof req.body?.senha === "string" ? req.body.senha : "";

  if (!email || !senha || senha.length > 128) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Preencha o e-mail e a senha.",
    });
  }

  if (!emailValido(email)) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Informe um e-mail válido.",
    });
  }

  try {
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

    // Cookies seguros exigem HTTPS reconhecido pelo servidor/proxy.
    if (process.env.NODE_ENV === "production" && !req.secure) {
      console.error("Login sem HTTPS reconhecido. Verifique TRUST_PROXY_HOPS no provedor.");
      return res.status(503).json({
        sucesso: false,
        mensagem: "Não foi possível iniciar uma sessão segura. Acesse por HTTPS; se o erro continuar, verifique a configuração do proxy no servidor.",
      });
    }

    // CRIA SESSÃO

    req.session.regenerate((erro) => {
      if (erro) {
        console.error(erro);
        return res.status(500).json({
          sucesso: false,
          mensagem: "Erro ao iniciar sessão.",
        });
      }

      req.session.usuarioId = usuario.id;
      req.session.tipo = usuario.tipo;

      req.session.save((erroSalvar) => {
        if (erroSalvar) {
          console.error("Erro ao salvar sessão:", erroSalvar);
          return res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao salvar a sessão. Tente novamente.",
          });
        }

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
      });
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
    contatos,
    retornoContatos,
    prospeccao,
    clientesNovos,
    balde,
  } = req.body;

  const camposNumericos = [
    { nome: "realizada", valor: realizada },
    { nome: "numeroVendas", valor: numeroVendas },
    { nome: "contatos", valor: contatos },
    { nome: "retornoContatos", valor: retornoContatos },
    { nome: "prospeccao", valor: prospeccao },
    { nome: "clientesNovos", valor: clientesNovos },
    { nome: "balde", valor: balde },
  ];

  // ========================================
  // VALIDAÇÃO DOS CAMPOS
  // ========================================

  if (
    !dataValida(data) ||
    realizada === undefined ||
    numeroVendas === undefined ||
    contatos === undefined ||
    retornoContatos === undefined ||
    prospeccao === undefined ||
    clientesNovos === undefined ||
    balde === undefined
  ) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Preencha todos os campos.",
    });
  }

  // ========================================
  // VALIDAÇÃO DOS NÚMEROS
  // ========================================

  const valoresInvalidos = camposNumericos.filter(
    ({ valor }) => !valorNumerico(valor, { min: 0, max: 999999999 }),
  );
  const camposInteiros = camposNumericos.filter(
    ({ nome }) => nome !== "realizada",
  );

  if (
    valoresInvalidos.length > 0 ||
    camposInteiros.some(({ valor }) => !Number.isInteger(valor))
  ) {
    return res.status(400).json({
      sucesso: false,
      mensagem:
        "Os valores devem ser números válidos, não negativos e sem exagero de magnitude.",
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
          contatos = ?,
          retorno_contatos = ?,
          prospeccao = ?,
          clientes_novos = ?,
          balde = ?
        WHERE id = ?
      `);

      atualizarRegistro.run(
        0,
        Number(realizada),
        Number(numeroVendas),
        Number(contatos),
        Number(retornoContatos),
        Number(prospeccao),
        Number(clientesNovos),
        Number(balde),
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
        contatos,
        retorno_contatos,
        prospeccao,
        clientes_novos,
        balde
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const resultado = inserirRegistro.run(
      req.session.usuarioId,
      data,
      0,
      Number(realizada),
      Number(numeroVendas),
      Number(contatos),
      Number(retornoContatos),
      Number(prospeccao),
      Number(clientesNovos),
      Number(balde),
    );

    res.json({
      sucesso: true,
      mensagem: "Registro salvo com sucesso!",
      registroId: resultado.lastInsertRowid,
      atualizado: false,
    });
  } catch (erro) {
    console.error(erro);

    if (erro.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Este e-mail já está cadastrado.",
      });
    }

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
                        SUM(contatos),
                        0
                    ) AS contatos,

                    COALESCE(
                        SUM(retorno_contatos),
                        0
                    ) AS retorno_contatos,

                    COALESCE(
                        SUM(prospeccao),
                        0
                    ) AS prospeccao,
                    COALESCE(
                        SUM(clientes_novos),
                        0
                    ) AS clientes_novos,

                    COALESCE(
                        SUM(balde),
                        0
                    ) AS balde

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

        contatos: Number(resumo.contatos),

        retorno_contatos: Number(resumo.retorno_contatos),

        prospeccao: Number(resumo.prospeccao),

        clientes_novos: Number(resumo.clientes_novos),

        balde: Number(resumo.balde),
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

                    contatos,
                    retorno_contatos,

                    prospeccao,
                    clientes_novos,
                    balde

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

            COALESCE(SUM(registros.contatos), 0) AS contatos,

            COALESCE(SUM(registros.retorno_contatos), 0)
              AS retorno_contatos,

            COALESCE(SUM(registros.prospeccao), 0)
              AS prospeccao,

            COALESCE(SUM(registros.clientes_novos), 0)
              AS clientes_novos,

            COALESCE(SUM(registros.balde), 0)
              AS balde

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

            registros.contatos,
            registros.retorno_contatos,

            registros.prospeccao,
            registros.clientes_novos,
            registros.balde,

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
// RANKING MENSAL DE VENDAS
// ========================================

app.get("/api/ranking", (req, res) => {
  // Apenas usuários logados podem consultar
  if (!req.session.usuarioId) {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Usuário não está logado.",
    });
  }

  const mes = Number(req.query.mes);
  const ano = Number(req.query.ano);

  // Validar mês e ano
  if (
    !Number.isInteger(mes) ||
    !Number.isInteger(ano) ||
    mes < 1 ||
    mes > 12 ||
    ano < 2020 ||
    ano > 2100
  ) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Mês ou ano inválido.",
    });
  }

  try {
    const periodo = `${ano}-${String(mes).padStart(2, "0")}`;

    const ranking = db
      .prepare(
        `
      SELECT
        usuarios.id AS usuario_id,
        usuarios.nome AS nome_funcionaria,
        COALESCE(SUM(registros.realizada), 0) AS valor_vendido

      FROM usuarios

      LEFT JOIN registros
        ON registros.usuario_id = usuarios.id
        AND substr(registros.data, 1, 7) = ?

      WHERE usuarios.tipo = 'funcionaria'

      GROUP BY usuarios.id, usuarios.nome

      ORDER BY valor_vendido DESC, usuarios.nome ASC
    `,
      )
      .all(periodo);

    res.json({
      sucesso: true,
      mes,
      ano,
      ranking,
    });
  } catch (erro) {
    console.error("Erro ao buscar ranking:", erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao carregar ranking.",
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
if (require.main === module) {
  console.log(
    app.router.stack.filter((item) => item.route).map((item) => item.route.path),
  );

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });

  let encerrando = false;
  const encerrarServidor = (sinal) => {
    if (encerrando) return;
    encerrando = true;
    console.log(`Recebido ${sinal}; encerrando servidor.`);
    server.close((erro) => {
      if (erro) {
        console.error("Erro ao encerrar servidor:", erro);
        process.exitCode = 1;
      }
      sessionStore.stopInterval();
      db.close();
    });
  };

  process.once("SIGINT", () => encerrarServidor("SIGINT"));
  process.once("SIGTERM", () => encerrarServidor("SIGTERM"));
}

module.exports = app;
