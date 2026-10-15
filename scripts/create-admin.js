require('dotenv').config();
const criarAdmin = require('../lib/create-admin');
async function main() {
  const db = require('../database');
  try { await criarAdmin(db); }
  finally { await db.close(); }
}
if (require.main === module) main().catch(error => {
  console.error('Não foi possível criar a conta administradora: ' + error.message);
  process.exitCode = 1;
});
