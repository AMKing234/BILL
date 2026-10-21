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
      SELECT c.*,
        COALESCE((SELECT SUM(grand_total) FROM invoices WHERE customer_id = c.id AND status != 'cancelled'), 0) as total_sales,
        COALESCE((SELECT SUM(grand_total) FROM invoices WHERE customer_id = c.id AND status != 'cancelled'), 0) as totalSales,
        COALESCE((SELECT SUM(paid) FROM invoices WHERE customer_id = c.id AND status != 'cancelled'), 0) as total_paid,
        COALESCE((SELECT SUM(due) FROM invoices WHERE customer_id = c.id AND status != 'cancelled'), 0) as total_due,
        COALESCE((SELECT SUM(due) FROM invoices WHERE customer_id = c.id AND status != 'cancelled'), 0) as due
      FROM customers c
    `;
    let countQuery = `SELECT COUNT(*) as total FROM customers c`;
    let params = [];

    if (search) {
      search = `%${search}%`;
      query += ` WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?`;
      countQuery += ` WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?`;
      params = [search, search, search];
    }

    query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    
    const customers = db.prepare(query).all(...params, limit, offset);
    const total = db.prepare(countQuery).get(...params).total;
    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      customers,
      data: customers,
      total,
      page,
      pages: totalPages,
      totalPages,
      pagination: { page, totalPages, total }
    });
  } catch (err) {
    console.error('[Customers] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch customers.' });
  }
});

router.post('/', requireAuth, (req, res) => {
  try {
    const { name, phone = '', email = '', address = '', notes = '' } = req.body;
    
    if (!validateRequired(name)) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const stmt = db.prepare(`
      INSERT INTO customers (name, phone, email, address, notes) 
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(sanitizeString(name), phone, email, address, notes);
    
    const logStmt = db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`);
    logStmt.run(req.session.userId || 1, 'CREATE', 'customer', info.lastInsertRowid, `Created customer: ${name}`);

    const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json(customer);
  } catch (err) {
    console.error('[Customers] Error:', err.message);
    res.status(500).json({ error: 'Failed to create customer.' });
  }
});

router.get('/:id', requireAuth, (req, res) => {
  try {
    const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    const stats = db.prepare(`
      SELECT 
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(grand_total), 0) as totalSales,
        COALESCE(SUM(paid), 0) as total_paid,
        COALESCE(SUM(due), 0) as total_due,
        COALESCE(SUM(due), 0) as due
      FROM invoices 
      WHERE customer_id = ? AND status != 'cancelled'
    `).get(req.params.id);

    const invoices = db.prepare(`
      SELECT id, invoice_number, date, grand_total, paid, due, status 
      FROM invoices 
      WHERE customer_id = ? 
      ORDER BY date DESC, id DESC LIMIT 50
    `).all(req.params.id);

    res.json({ ...customer, ...stats, invoices });
  } catch (err) {
    console.error('[Customers] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch customer details.' });
  }
});

router.put('/:id', requireAuth, (req, res) => {
  try {
    const { name, phone = '', email = '', address = '', notes = '' } = req.body;
    
    if (!validateRequired(name)) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const stmt = db.prepare(`
      UPDATE customers 
      SET name = ?, phone = ?, email = ?, address = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const info = stmt.run(sanitizeString(name), phone, email, address, notes, req.params.id);
    
    if (info.changes === 0) return res.status(404).json({ error: 'Customer not found.' });

    const logStmt = db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`);
    logStmt.run(req.session.userId || 1, 'UPDATE', 'customer', req.params.id, `Updated customer: ${name}`);

    res.json({ success: true, message: 'Customer updated successfully.' });
  } catch (err) {
    console.error('[Customers] Error:', err.message);
    res.status(500).json({ error: 'Failed to update customer.' });
  }
});

router.delete('/:id', requireAuth, (req, res) => {
  try {
    const invoiceCount = db.prepare(`SELECT COUNT(*) as count FROM invoices WHERE customer_id = ?`).get(req.params.id).count;
    if (invoiceCount > 0) {
      return res.status(400).json({ error: 'Cannot delete customer with existing invoices.' });
    }

    const stmt = db.prepare(`DELETE FROM customers WHERE id = ?`);
    const info = stmt.run(req.params.id);
    
    if (info.changes === 0) return res.status(404).json({ error: 'Customer not found.' });

    const logStmt = db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`);
    logStmt.run(req.session.userId || 1, 'DELETE', 'customer', req.params.id, `Deleted customer ID: ${req.params.id}`);

    res.json({ success: true, message: 'Customer deleted successfully.' });
  } catch (err) {
    console.error('[Customers] Error:', err.message);
    res.status(500).json({ error: 'Failed to delete customer.' });
  }
});

router.get('/:id/ledger', requireAuth, (req, res) => {
  try {
    const entries = db.prepare(`
      SELECT * FROM customer_ledger 
      WHERE customer_id = ? 
      ORDER BY date DESC, id DESC
    `).all(req.params.id);
    res.json(entries);
  } catch (err) {
    console.error('[Customers] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch customer ledger.' });
  }
});

module.exports = router;
