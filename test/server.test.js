const { after, before, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const pastaTemporaria = fs.mkdtempSync(path.join(os.tmpdir(), "sistema-vendas-"));
process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
process.env.CODIGO_CADASTRO = "codigo-de-teste";
process.env.DATABASE_PATH = path.join(pastaTemporaria, "api.sqlite");

const setIntervalOriginal = global.setInterval;
global.setInterval = (...args) => {
  const timer = setIntervalOriginal(...args);
  // The session-store package's expiry interval otherwise keeps tests alive.
  timer.unref();
  return timer;
};
const app = require("../server");
global.setInterval = setIntervalOriginal;
const db = require("../database");
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
  servidor = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => servidor.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    servidor.close((erro) => (erro ? reject(erro) : resolve()));
  });
  db.close();
  fs.rmSync(pastaTemporaria, { recursive: true, force: true });
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

  it("cria admin somente com configuração explícita e de forma idempotente", () => {
    const dbAdmin = path.join(pastaTemporaria, "admin.sqlite");
    const env = {
      ...process.env,
      DATABASE_PATH: dbAdmin,
      ADMIN_NAME: "Admin de Teste",
      ADMIN_EMAIL: "ADMIN@EXEMPLO.COM",
      ADMIN_PASSWORD: "senha-admin-de-teste-segura",
    };
    const script = path.join(__dirname, "..", "scripts", "create-admin.js");
    const umaExecucao = execFileSync(process.execPath, [script], { env, encoding: "utf8" });
    const segundaExecucao = execFileSync(process.execPath, [script], { env, encoding: "utf8" });

    assert.match(umaExecucao, /criada/);
    assert.match(segundaExecucao, /já existe/);

    const adminDb = require("better-sqlite3")(dbAdmin);
    const admin = adminDb.prepare("SELECT nome, email, tipo, senha_hash FROM usuarios").get();
    assert.equal(admin.email, "admin@exemplo.com");
    assert.equal(admin.tipo, "admin");
    assert.match(admin.senha_hash, /^\$2[aby]\$/);
    adminDb.close();
  });
});
