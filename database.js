const Database = require("better-sqlite3");

const db = new Database("db.sqlite");

// ========================================
// TABELA DE USUÁRIOS
// ========================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'funcionaria'
    )
`).run();


// ========================================
// TABELA DE REGISTROS
// ========================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS registros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        data TEXT NOT NULL,

        meta_diaria REAL NOT NULL,
        realizada REAL NOT NULL,
        numero_vendas INTEGER NOT NULL,

        contatos INTEGER NOT NULL DEFAULT 0,
        retorno_contatos INTEGER NOT NULL DEFAULT 0,

        prospeccao INTEGER NOT NULL DEFAULT 0,
        clientes_novos INTEGER NOT NULL DEFAULT 0,

        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
    )
`).run();


// ========================================
// MIGRAÇÃO DE COLUNAS
// ========================================

const colunasNovas = [
    ["contatos", "INTEGER NOT NULL DEFAULT 0"],
    ["retorno_contatos", "INTEGER NOT NULL DEFAULT 0"],
    ["prospeccao", "INTEGER NOT NULL DEFAULT 0"],
    ["clientes_novos", "INTEGER NOT NULL DEFAULT 0"]
];

for (const [nome, tipo] of colunasNovas) {

    const colunaExiste = db
        .prepare(`
            SELECT name
            FROM pragma_table_info('registros')
            WHERE name = ?
        `)
        .get(nome);

    if (!colunaExiste) {

        db.prepare(`
            ALTER TABLE registros
            ADD COLUMN ${nome} ${tipo}
        `).run();

        console.log(`Coluna ${nome} adicionada!`);
    }
}


// ========================================
// REGISTRO ÚNICO POR FUNCIONÁRIA/DIA
// ========================================

db.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    indice_registro_unico
    ON registros (usuario_id, data)
`).run();


// ========================================
// TABELA DE METAS MENSAIS
// ========================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS metas_mensais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        mes INTEGER NOT NULL,
        ano INTEGER NOT NULL,
        meta REAL NOT NULL,

        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id),

        UNIQUE(usuario_id, mes, ano)
    )
`).run();


module.exports = db;