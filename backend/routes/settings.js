const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { db } = require('../database/database');
const { requireAuth } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Helper for audit logs
const logAudit = (userId, action, entityType, entityId, details) => {
  try {
    const stmt = db.prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)');
    stmt.run(userId, action, entityType, entityId, details);
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
};

router.get('/business', requireAuth, (req, res) => {
  try {
    const business = db.prepare('SELECT * FROM business WHERE id = 1').get();
    res.json(business || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch business info' });
  }
});

router.put('/business', requireAuth, (req, res) => {
  try {
    const { name = '', owner_name = '', phone = '', email = '', address = '' } = req.body;
    const stmt = db.prepare(`
      UPDATE business 
      SET name = ?, owner_name = ?, phone = ?, email = ?, address = ?, updated_at = datetime('now','localtime')
      WHERE id = 1
    `);
    stmt.run(name, owner_name, phone, email, address);
    
    logAudit(req.session.userId || 1, 'UPDATE', 'business', 1, JSON.stringify({ name, owner_name, phone, email, address }));
    
    res.json({ success: true, message: 'Business info updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update business info' });
  }
});

router.post('/business/logo', requireAuth, upload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const logo_path = req.file.filename;
    const stmt = db.prepare('UPDATE business SET logo_path = ?, updated_at = datetime("now","localtime") WHERE id = 1');
    stmt.run(logo_path);
    
    logAudit(req.session.userId || 1, 'UPDATE_LOGO', 'business', 1, JSON.stringify({ logo_path }));
    
    res.json({ success: true, logo_path, logo_url: `/uploads/${logo_path}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload logo', details: err.message });
  }
});

const getSettings = (keys) => {
  const placeholders = keys.map(() => '?').join(',');
  const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`).all(...keys);
  const result = {};
  rows.forEach(row => {
    result[row.key] = row.value;
  });
  return result;
};

const updateSettings = (settings) => {
  const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const updateMany = db.transaction((entries) => {
    for (const [key, value] of entries) {
      stmt.run(key, value !== undefined && value !== null ? String(value) : '');
    }
  });
  updateMany(Object.entries(settings));
};

router.get('/invoice', requireAuth, (req, res) => {
  try {
    const keys = ['invoice_prefix', 'invoice_start_number', 'invoice_startNumber', 'invoice_footer', 'invoice_terms', 'invoice_signature'];
    const settings = getSettings(keys);
    const startNum = settings['invoice_start_number'] || settings['invoice_startNumber'] || '1';
    
    res.json({
      prefix: settings['invoice_prefix'] || 'INV',
      startNumber: startNum,
      start_number: startNum,
      starting_number: parseInt(startNum, 10) || 1,
      footer: settings['invoice_footer'] || '',
      terms: settings['invoice_terms'] || 'Thank you for your business!',
      signature: settings['invoice_signature'] || ''
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoice settings' });
  }
});

router.put('/invoice', requireAuth, (req, res) => {
  try {
    const { prefix, startNumber, starting_number, footer, terms, signature } = req.body;
    const num = starting_number !== undefined ? starting_number : (startNumber || '1');
    
    updateSettings({
      'invoice_prefix': prefix !== undefined ? prefix : 'INV',
      'invoice_start_number': String(num),
      'invoice_startNumber': String(num),
      'invoice_footer': footer || '',
      'invoice_terms': terms || '',
      'invoice_signature': signature || ''
    });
    
    logAudit(req.session.userId || 1, 'UPDATE', 'settings', 0, JSON.stringify({ prefix, startNumber: num }));
    
    res.json({ success: true, message: 'Invoice settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update invoice settings' });
  }
});

router.get('/tax', requireAuth, (req, res) => {
  try {
    const keys = ['gst_enabled', 'tax_gstEnabled', 'gstin', 'tax_gstin', 'cgst_rate', 'tax_cgstRate', 'sgst_rate', 'tax_sgstRate', 'igst_rate', 'tax_igstRate'];
    const settings = getSettings(keys);
    const gstVal = settings['gst_enabled'] || settings['tax_gstEnabled'];
    const isEnabled = gstVal === 'true' || gstVal === '1';

    res.json({
      gst_enabled: isEnabled,
      gstEnabled: isEnabled,
      gstin: settings['gstin'] || settings['tax_gstin'] || '',
      cgst_rate: settings['cgst_rate'] || settings['tax_cgstRate'] || '9',
      cgstRate: settings['cgst_rate'] || settings['tax_cgstRate'] || '9',
      sgst_rate: settings['sgst_rate'] || settings['tax_sgstRate'] || '9',
      sgstRate: settings['sgst_rate'] || settings['tax_sgstRate'] || '9',
      igst_rate: settings['igst_rate'] || settings['tax_igstRate'] || '18',
      igstRate: settings['igst_rate'] || settings['tax_igstRate'] || '18'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tax settings' });
  }
});

router.put('/tax', requireAuth, (req, res) => {
  try {
    const { gstEnabled, gst_enabled, gstin, cgstRate, cgst_rate, sgstRate, sgst_rate, igstRate, igst_rate } = req.body;
    const enabled = gst_enabled !== undefined ? Boolean(gst_enabled) : Boolean(gstEnabled);
    const cgst = cgst_rate !== undefined ? cgst_rate : (cgstRate || '9');
    const sgst = sgst_rate !== undefined ? sgst_rate : (sgstRate || '9');
    const igst = igst_rate !== undefined ? igst_rate : (igstRate || '18');
    const gstinVal = gstin || '';

    updateSettings({
      'gst_enabled': String(enabled),
      'tax_gstEnabled': String(enabled),
      'gstin': gstinVal,
      'tax_gstin': gstinVal,
      'cgst_rate': String(cgst),
      'tax_cgstRate': String(cgst),
      'sgst_rate': String(sgst),
      'tax_sgstRate': String(sgst),
      'igst_rate': String(igst),
      'tax_igstRate': String(igst)
    });
    
    logAudit(req.session.userId || 1, 'UPDATE', 'settings', 0, JSON.stringify({ gst_enabled: enabled, gstin: gstinVal }));
    
    res.json({ success: true, message: 'Tax settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tax settings' });
  }
});

router.get('/appearance', requireAuth, (req, res) => {
  try {
    const settings = getSettings(['theme', 'appearance_theme']);
    res.json({ theme: settings['theme'] || settings['appearance_theme'] || 'system' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appearance settings' });
  }
});

router.put('/appearance', requireAuth, (req, res) => {
  try {
    const { theme = 'system' } = req.body;
    updateSettings({ 'theme': theme, 'appearance_theme': theme });
    logAudit(req.session.userId || 1, 'UPDATE', 'settings', 0, JSON.stringify({ theme }));
    res.json({ success: true, message: 'Appearance settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update appearance settings' });
  }
});

// ── UPI / Payment Settings ──
router.get('/upi', requireAuth, (req, res) => {
  try {
    const keys = [
      'upi_enabled', 'upi_id', 'upi_payee_name', 'upi_merchant_code',
      'upi_note', 'upi_show_on_invoice', 'upi_show_on_thermal',
      'upi_qr_size', 'upi_currency'
    ];
    const settings = getSettings(keys);
    const enabled = settings['upi_enabled'] === 'true' || settings['upi_enabled'] === '1';
    res.json({
      enabled,
      upi_id: settings['upi_id'] || '',
      payee_name: settings['upi_payee_name'] || '',
      merchant_code: settings['upi_merchant_code'] || '',
      note: settings['upi_note'] || '',
      show_on_invoice: settings['upi_show_on_invoice'] !== 'false',
      show_on_thermal: settings['upi_show_on_thermal'] !== 'false',
      qr_size: parseInt(settings['upi_qr_size']) || 220,
      currency: settings['upi_currency'] || 'INR'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch UPI settings' });
  }
});

router.put('/upi', requireAuth, (req, res) => {
  try {
    const {
      enabled, upi_id, payee_name, merchant_code,
      note, show_on_invoice, show_on_thermal,
      qr_size, currency
    } = req.body;

    updateSettings({
      'upi_enabled': String(!!enabled),
      'upi_id': upi_id || '',
      'upi_payee_name': payee_name || '',
      'upi_merchant_code': merchant_code || '',
      'upi_note': note || '',
      'upi_show_on_invoice': String(show_on_invoice !== false),
      'upi_show_on_thermal': String(show_on_thermal !== false),
      'upi_qr_size': String(parseInt(qr_size) || 220),
      'upi_currency': currency || 'INR'
    });

    logAudit(req.session.userId || 1, 'UPDATE', 'settings', 0,
      JSON.stringify({ upi_enabled: !!enabled, upi_id, payee_name }));

    res.json({ success: true, message: 'UPI settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update UPI settings' });
  }
});

router.get('/audit-logs', requireAuth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
    
    const logs = db.prepare(`
      SELECT a.*, COALESCE(u.username, 'admin') as username 
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    const countRow = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get();
    const totalPages = Math.ceil(countRow.count / limit) || 1;

    res.json({
      data: logs,
      logs,
      pagination: {
        total: countRow.count,
        page,
        limit,
        totalPages
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
