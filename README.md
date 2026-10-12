# Sistema de Vendas

Aplicação web em Node.js, Express e SQLite para registrar vendas e acompanhar metas.

## Requisitos

- Node.js 20 ou superior
- npm

## Configuração local

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env` e defina `SESSION_SECRET` (pelo menos 32 caracteres) e `CODIGO_CADASTRO`.
3. Inicie o servidor com `npm start` e abra `http://localhost:3000`.
4. Para criar a primeira conta administradora, defina temporariamente `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`, então execute `npm run create-admin`. A senha precisa ter pelo menos 12 caracteres. Remova essas variáveis após a criação.

O banco local fica em `db.sqlite` por padrão. É possível definir `DATABASE_PATH` para usar outro arquivo. Não publique o `.env` nem o banco local.

## Testes

Execute `npm test`. Os testes usam um banco SQLite temporário e não alteram o banco de desenvolvimento.
