const session = require('express-session');
class PostgresSessionStore extends session.Store {
  constructor(db) {
    super(); this.db = db;
    this.timer = setInterval(() => {
      db.pool.query('DELETE FROM sessoes WHERE expire < NOW()')
        .catch(error => console.error('Erro ao limpar sessões:', error.message));
    }, 15 * 60 * 1000);
    this.timer.unref();
  }
  get(sid, callback) {
    this.db.pool.query('SELECT sess FROM sessoes WHERE sid = $1 AND expire > NOW()', [sid])
      .then(result => callback(null, result.rows[0]?.sess || null), callback);
  }
  set(sid, sess, callback = () => {}) {
    const expire = sess.cookie.expires ? new Date(sess.cookie.expires) : new Date(Date.now() + 8 * 60 * 60 * 1000);
    this.db.pool.query('INSERT INTO sessoes (sid, sess, expire) VALUES ($1, $2, $3) ON CONFLICT (sid) DO UPDATE SET sess = EXCLUDED.sess, expire = EXCLUDED.expire', [sid, JSON.stringify(sess), expire])
      .then(() => callback(null), callback);
  }
  touch(sid, sess, callback = () => {}) { this.set(sid, sess, callback); }
  destroy(sid, callback = () => {}) {
    this.db.pool.query('DELETE FROM sessoes WHERE sid = $1', [sid]).then(() => callback(null), callback);
  }
  stopInterval() { clearInterval(this.timer); }
}
module.exports = PostgresSessionStore;
