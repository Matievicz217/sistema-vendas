const { it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

for (const url of ['', '   ', 'mysql://user:password@localhost/test', 'invalid']) {
  it('recusa DATABASE_URL ausente ou inválida: ' + JSON.stringify(url), () => {
    const result = spawnSync(process.execPath, ['-e', "require('./database')"], {
      cwd: path.join(__dirname, '..'), env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', timeout: 5000,
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /DATABASE_URL/);
  });
}
for (const protocol of ['postgres', 'postgresql']) {
  it('configura somente PostgreSQL com o protocolo ' + protocol, () => {
    const result = spawnSync(process.execPath, ['-e', "const db = require('./database'); require('node:assert/strict').equal(db.dialect, 'postgres'); db.close();"], {
      cwd: path.join(__dirname, '..'), env: { ...process.env, DATABASE_URL: protocol + '://user:password@localhost:5432/test' }, encoding: 'utf8', timeout: 5000,
    });
    assert.equal(result.status, 0, result.stderr);
  });
}
