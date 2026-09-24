const Database = require('better-sqlite3');

const db = new Database('db.sqlite');


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

        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
    )
`).run();


console.log('Banco de dados conectado!');
console.log('Tabela usuarios pronta!');
console.log('Tabela registros pronta!');


module.exports = db;