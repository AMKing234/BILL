const express = require('express');
const router = express.Router();
const { db } = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { validateRequired, sanitizeString } = require('../utils/validators');

router.get('/', requireAuth, (req, res) => {
  try {
    let { search, page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 25;
    const offset = (page - 1) * limit;

    let query = `
      SELECT s.*,
        COALESCE((SELECT SUM(grand_total) FROM purchases WHERE supplier_id = s.id AND status != 'cancelled'), 0) as total_purchases,
        COALESCE((SELECT SUM(due) FROM purchases WHERE supplier_id = s.id AND status != 'cancelled'), 0) as due_amount,
        COALESCE((SELECT SUM(due) FROM purchases WHERE supplier_id = s.id AND status != 'cancelled'), 0) as due
      FROM suppliers s
    `;
    let countQuery = `SELECT COUNT(*) as total FROM suppliers s`;
    let params = [];

    if (search) {
      search = `%${search}%`;
      query += ` WHERE s.name LIKE ? OR s.phone LIKE ? OR s.email LIKE ? OR s.gstin LIKE ?`;
      countQuery += ` WHERE s.name LIKE ? OR s.phone LIKE ? OR s.email LIKE ? OR s.gstin LIKE ?`;
      params = [search, search, search, search];
    }

    query += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
    
    const suppliers = db.prepare(query).all(...params, limit, offset);
    const total = db.prepare(countQuery).get(...params).total;
    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      suppliers,
      data: suppliers,
      total,
      page,
      pages: totalPages,
      totalPages,
      pagination: { page, totalPages, total }
    });
  } catch (err) {
    console.error('[Suppliers] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch suppliers.' });
  }
});

router.post('/', requireAuth, (req, res) => {
  try {
    const { name, phone = '', email = '', address = '', gstin = '', notes = '' } = req.body;
    
    if (!validateRequired(name)) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const stmt = db.prepare(`
      INSERT INTO suppliers (name, phone, email, address, gstin, notes) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(sanitizeString(name), phone, email, address, gstin, notes);
    
    const logStmt = db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`);
    logStmt.run(req.session.userId || 1, 'CREATE', 'supplier', info.lastInsertRowid, `Created supplier: ${name}`);

    const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json(supplier);
  } catch (err) {
    console.error('[Suppliers] Error:', err.message);
    res.status(500).json({ error: 'Failed to create supplier.' });
  }
});

router.get('/:id', requireAuth, (req, res) => {
  try {
    const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });

    const stats = db.prepare(`
      SELECT 
        COALESCE(SUM(grand_total), 0) as total_purchases,
        COALESCE(SUM(paid), 0) as total_paid,
        COALESCE(SUM(due), 0) as total_due,
        COALESCE(SUM(due), 0) as due_amount
      FROM purchases 
      WHERE supplier_id = ? AND status != 'cancelled'
    `).get(req.params.id);

    const purchases = db.prepare(`
      SELECT id, purchase_number, date, grand_total, paid, due, status 
      FROM purchases 
      WHERE supplier_id = ? 
      ORDER BY date DESC, id DESC LIMIT 50
    `).all(req.params.id);

    res.json({ ...supplier, ...stats, purchases });
  } catch (err) {
    console.error('[Suppliers] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch supplier details.' });
  }
});

router.put('/:id', requireAuth, (req, res) => {
  try {
    const { name, phone = '', email = '', address = '', gstin = '', notes = '' } = req.body;
    
    if (!validateRequired(name)) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const stmt = db.prepare(`
      UPDATE suppliers 
      SET name = ?, phone = ?, email = ?, address = ?, gstin = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const info = stmt.run(sanitizeString(name), phone, email, address, gstin, notes, req.params.id);
    
    if (info.changes === 0) return res.status(404).json({ error: 'Supplier not found.' });

    const logStmt = db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`);
    logStmt.run(req.session.userId || 1, 'UPDATE', 'supplier', req.params.id, `Updated supplier: ${name}`);

    res.json({ success: true, message: 'Supplier updated successfully.' });
  } catch (err) {
    console.error('[Suppliers] Error:', err.message);
    res.status(500).json({ error: 'Failed to update supplier.' });
  }
});

router.delete('/:id', requireAuth, (req, res) => {
  try {
    const purchaseCount = db.prepare(`SELECT COUNT(*) as count FROM purchases WHERE supplier_id = ?`).get(req.params.id).count;
    if (purchaseCount > 0) {
      return res.status(400).json({ error: 'Cannot delete supplier with existing purchases.' });
    }

    const stmt = db.prepare(`DELETE FROM suppliers WHERE id = ?`);
    const info = stmt.run(req.params.id);
    
    if (info.changes === 0) return res.status(404).json({ error: 'Supplier not found.' });

    const logStmt = db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`);
    logStmt.run(req.session.userId || 1, 'DELETE', 'supplier', req.params.id, `Deleted supplier ID: ${req.params.id}`);

    res.json({ success: true, message: 'Supplier deleted successfully.' });
  } catch (err) {
    console.error('[Suppliers] Error:', err.message);
    res.status(500).json({ error: 'Failed to delete supplier.' });
  }
});

router.get('/:id/ledger', requireAuth, (req, res) => {
  try {
    const entries = db.prepare(`
      SELECT * FROM supplier_ledger 
      WHERE supplier_id = ? 
      ORDER BY date DESC, id DESC
    `).all(req.params.id);
    res.json(entries);
  } catch (err) {
    console.error('[Suppliers] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch supplier ledger.' });
  }
});

module.exports = router;
