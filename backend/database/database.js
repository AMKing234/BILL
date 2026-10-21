const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'database.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Ensure directories exist
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const backupsDir = path.join(dataDir, 'backups');
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

let _db = null;

// ── sql.js Wrapper (better-sqlite3 compatible API) ──
class SqliteWrapper {
  constructor(sqlJsDb, filePath) {
    this._raw = sqlJsDb;
    this._filePath = filePath;
    this._saveTimer = null;
  }

  prepare(sql) {
    const self = this;
    return {
      get(...params) {
        const stmt = self._raw.prepare(sql);
        try {
          const p = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
          if (p.length > 0) stmt.bind(p);
          if (stmt.step()) return stmt.getAsObject();
          return undefined;
        } finally {
          stmt.free();
        }
      },
      all(...params) {
        const stmt = self._raw.prepare(sql);
        try {
          const p = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
          if (p.length > 0) stmt.bind(p);
          const rows = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          return rows;
        } finally {
          stmt.free();
        }
      },
      run(...params) {
        const p = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
        self._raw.run(sql, p.length > 0 ? p : undefined);
        self._deferSave();
        return {
          changes: self._raw.getRowsModified(),
          lastInsertRowid: self._lastId()
        };
      }
    };
  }

  exec(sql) {
    this._raw.exec(sql);
    this._deferSave();
  }

  pragma(str) {
    try { this._raw.exec('PRAGMA ' + str); } catch (_) { /* sql.js may not support all pragmas */ }
  }

  transaction(fn) {
    const self = this;
    return function (...args) {
      self._raw.exec('BEGIN');
      try {
        const result = fn(...args);
        self._raw.exec('COMMIT');
        self.saveToDisk();
        return result;
      } catch (err) {
        try { self._raw.exec('ROLLBACK'); } catch (_) {}
        throw err;
      }
    };
  }

  _lastId() {
    const stmt = this._raw.prepare('SELECT last_insert_rowid() as id');
    try {
      stmt.step();
      return stmt.getAsObject().id;
    } finally {
      stmt.free();
    }
  }

  _deferSave() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this.saveToDisk();
      this._saveTimer = null;
    }, 100);
  }

  saveToDisk() {
    if (this._saveTimer) { clearTimeout(this._saveTimer); this._saveTimer = null; }
    const data = this._raw.export();
    fs.writeFileSync(this._filePath, Buffer.from(data));
  }

  close() {
    this.saveToDisk();
    this._raw.close();
  }
}

// Proxy allows routes to destructure { db } and have calls forwarded
// to the real wrapper once initialized
const dbProxy = new Proxy({}, {
  get(_, prop) {
    if (!_db) throw new Error('Database not initialized');
    const val = _db[prop];
    return typeof val === 'function' ? val.bind(_db) : val;
  }
});

async function initialize() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  let sqlJsDb;
  if (fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 0) {
    const buffer = fs.readFileSync(DB_PATH);
    sqlJsDb = new SQL.Database(new Uint8Array(buffer));
  } else {
    sqlJsDb = new SQL.Database();
  }

  _db = new SqliteWrapper(sqlJsDb, DB_PATH);
  _db.pragma('foreign_keys = ON');

  // Run schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  _db.exec(schema);

  // Seed admin user
  const bcrypt = require('bcryptjs');
  const adminExists = _db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    _db.prepare(
      'INSERT INTO users (username, password_hash, name, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('admin', hash, 'Administrator', 'admin', '', '');
    console.log('[DB] Default admin user created (admin / admin123)');
  }

  // Seed business info
  const bizExists = _db.prepare('SELECT id FROM business WHERE id = 1').get();
  if (!bizExists) {
    _db.prepare(
      'INSERT INTO business (id, name, owner_name, phone, email, address) VALUES (1, ?, ?, ?, ?, ?)'
    ).run('BHAI BHAI COMMUNICATION', '', '+91 6000387355', 'bbc.tapattari@gmail.com', 'Tapattary Block Bazar');
  }

  // Seed default settings
  const seedSetting = _db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const defaults = {
    invoice_prefix: 'INV', invoice_start_number: '1',
    invoice_footer: '', invoice_terms: 'Thank you for your business!',
    invoice_signature: '', gst_enabled: 'false', gstin: '',
    cgst_rate: '9', sgst_rate: '9', igst_rate: '18',
    theme: 'system', currency: '₹',
    purchase_prefix: 'PUR', purchase_start_number: '1',
  };
  for (const [key, value] of Object.entries(defaults)) {
    seedSetting.run(key, value);
  }

  _db.saveToDisk();
  console.log('[DB] Database initialized successfully');
}

function saveToDisk() {
  if (_db) _db.saveToDisk();
}

async function reload() {
  saveToDisk();
  await initialize();
}

// Save on exit
process.on('exit', () => { try { if (_db) _db.saveToDisk(); } catch (_) {} });
process.on('SIGINT', () => { try { if (_db) _db.close(); } catch (_) {} process.exit(); });
process.on('SIGTERM', () => { try { if (_db) _db.close(); } catch (_) {} process.exit(); });

module.exports = { db: dbProxy, initialize, saveToDisk, reload, DB_PATH };
