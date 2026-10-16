const { after, before, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
process.env.CODIGO_CADASTRO = "codigo-de-teste";

const db = require("./helpers/database.cjs")();
const app = require("../server");
const {
  normalizarEmail,
  textoValido,
  valorNumerico,
  emailValido,
  dataValida,
} = require("../lib/validation");

let servidor;
let baseUrl;

before(async () => {
  await db.initialize();
  servidor = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => servidor.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    servidor.close((erro) => (erro ? reject(erro) : resolve()));
  });
  await db.close();
});

describe("validação de entradas", () => {
  it("normaliza e valida e-mails", () => {
    assert.equal(normalizarEmail("  TESTE@EXEMPLO.COM "), "teste@exemplo.com");
    assert.equal(emailValido("teste@exemplo.com"), true);
    assert.equal(emailValido("invalido"), false);
    assert.equal(dataValida("2024-02-29"), true);
    assert.equal(dataValida("2025-02-29"), false);
  });

  it("rejeita texto vazio e valores numéricos fora da faixa", () => {
    assert.equal(textoValido("  ", { min: 1 }), false);
    assert.equal(textoValido("Maria", { min: 2, max: 120 }), true);
    assert.equal(valorNumerico(15, { min: 0, max: 20 }), true);
    assert.equal(valorNumerico("15", { min: 0, max: 20 }), false);
    assert.equal(valorNumerico(Infinity), false);
  });
});

describe("API", () => {
  it("cadastra e-mail normalizado, evita duplicidade e limita acesso admin", async () => {
    const cadastro = await fetch(`${baseUrl}/api/cadastro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: "Usuária de Teste",
        email: "  TESTE@EXEMPLO.COM ",
        senha: "senha-de-teste-segura",
        codigoAcesso: process.env.CODIGO_CADASTRO,
      }),
    });
    assert.equal(cadastro.status, 200);

    const duplicado = await fetch(`${baseUrl}/api/cadastro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: "Usuária Duplicada",
        email: "teste@exemplo.com",
        senha: "senha-de-teste-segura",
        codigoAcesso: process.env.CODIGO_CADASTRO,
      }),
    });
    assert.equal(duplicado.status, 400);

    const login = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: " TESTE@EXEMPLO.COM ",
        senha: "senha-de-teste-segura",
      }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);

    const identidade = await fetch(`${baseUrl}/api/me`, {
      headers: { Cookie: cookie },
    });
    assert.equal(identidade.status, 200);
    assert.equal((await identidade.json()).usuario.email, "teste@exemplo.com");

    const health = await fetch(`${baseUrl}/healthz`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok" });

    const acessoAdmin = await fetch(`${baseUrl}/api/admin/funcionarias`, {
      headers: { Cookie: cookie },
    });
    assert.equal(acessoAdmin.status, 403);

    const registroComContagemFracionada = await fetch(`${baseUrl}/api/registros`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        data: "2026-10-12",
        realizada: 50.5,
        numeroVendas: 1,
        contatos: 1.5,
        retornoContatos: 0,
        prospeccao: 0,
        clientesNovos: 0,
        balde: 0,
      }),
    });
    assert.equal(registroComContagemFracionada.status, 400);
  });

  it("cria admin somente com configuração explícita e de forma idempotente", async () => {
    const createAdmin = require('../lib/create-admin');
    const env = { ADMIN_NAME: 'Admin de Teste', ADMIN_EMAIL: 'ADMIN@EXEMPLO.COM', ADMIN_PASSWORD: 'senha-admin-de-teste-segura' };
    await createAdmin(db, env);
    await createAdmin(db, env);
    const admins = await db.prepare("SELECT * FROM usuarios WHERE email = ?").all('admin@exemplo.com');
    assert.equal(admins.length, 1);
    assert.equal(admins[0].tipo, 'admin');
    assert.equal(await require('bcrypt').compare(env.ADMIN_PASSWORD, admins[0].senha_hash), true);
  });

  it("recusa iniciar em produção sem segredos obrigatórios", () => {
    const processo = spawnSync(
      process.execPath,
      ["-e", "require('./server')"],
      {
        cwd: path.join(__dirname, ".."),
        env: {
          ...process.env,
          NODE_ENV: "production",
          SESSION_SECRET: "",
          CODIGO_CADASTRO: "",
          DATABASE_URL: "postgresql://test:test@localhost:5432/test",
        },
        encoding: "utf8",
      },
    );

    assert.notEqual(processo.status, 0);
    assert.match(processo.stderr, /SESSION_SECRET deve ter pelo menos 32 caracteres em produção/);
  });
});
