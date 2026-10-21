const express = require('express');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Session secret - persisted so sessions survive restarts
const secretPath = path.join(__dirname, '..', 'data', '.session-secret');
let SESSION_SECRET;
if (fs.existsSync(secretPath)) {
  SESSION_SECRET = fs.readFileSync(secretPath, 'utf8').trim();
} else {
  SESSION_SECRET = crypto.randomBytes(48).toString('hex');
  fs.mkdirSync(path.dirname(secretPath), { recursive: true });
  fs.writeFileSync(secretPath, SESSION_SECRET);
}

// ── Middleware ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── API Routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/returns', require('./routes/returns'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/ledger', require('./routes/ledger'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/backup', require('./routes/backup'));

// ── SPA Fallback ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── Global Error Handler ──
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

// ── Initialize Database (async for sql.js WASM) & Start ──
async function startServer() {
  const { initialize } = require('./database/database');

  try {
    await initialize();
  } catch (err) {
    console.error('[FATAL] Database initialization failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════╗');
    console.log('  ║   BHAI BHAI COMMUNICATION - Billing System   ║');
    console.log('  ╠══════════════════════════════════════════════╣');
    console.log(`  ║   Server running: http://localhost:${PORT}       ║`);
    console.log('  ║   Press Ctrl+C to stop                       ║');
    console.log('  ╚══════════════════════════════════════════════╝');
    console.log('');
  });
}

startServer();
