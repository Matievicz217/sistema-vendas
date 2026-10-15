require("dotenv").config();

const bcrypt = require("bcrypt");
const { normalizarEmail, emailValido, textoValido } = require("../lib/validation");

async function criarAdmin() {
  const nome = process.env.ADMIN_NAME?.trim();
  const email = normalizarEmail(process.env.ADMIN_EMAIL);
  const senha = process.env.ADMIN_PASSWORD;

  if (!textoValido(nome, { min: 2, max: 120 })) {
    throw new Error("Defina ADMIN_NAME com um nome entre 2 e 120 caracteres.");
  }

  if (!emailValido(email)) {
    throw new Error("Defina ADMIN_EMAIL com um endereço válido.");
  }

  if (typeof senha !== "string" || senha.length < 12 || senha.length > 128) {
    throw new Error("Defina ADMIN_PASSWORD com uma senha entre 12 e 128 caracteres.");
  }

  const db = require("../database");
  try {
    await db.initialize();
    const existente = await db
      .prepare("SELECT id, tipo FROM usuarios WHERE email = ?")
      .get(email);

    if (existente) {
      if (existente.tipo !== "admin") {
        throw new Error("Esse e-mail já pertence a uma conta que não é administradora.");
      }

      console.log("A conta administradora já existe; nenhuma alteração foi feita.");
      return;
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    await db.prepare(
      "INSERT INTO usuarios (nome, email, senha_hash, tipo) VALUES (?, ?, ?, 'admin')",
    ).run(nome, email, senhaHash);

    console.log("Conta administradora criada.");
  } finally {
    await db.close();
  }
}

criarAdmin()
  .catch((erro) => {
    console.error(`Não foi possível criar a conta administradora: ${erro.message}`);
    process.exitCode = 1;
  })
