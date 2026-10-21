const express = require('express');
const router = express.Router();
const { db } = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { round2, nowDatetime, todayDate } = require('../utils/helpers');
const { validateRequired, validatePositiveNumber } = require('../utils/validators');

router.get('/', requireAuth, (req, res) => {
  try {
    const { search = '', method = '', customer_id = '', from = '', to = '', date = '', page = 1, limit = 25 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 25;
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT p.*, 'PAY-' || printf('%06d', p.id) as payment_number, c.name as customer_name, i.invoice_number,
        p.date as payment_date, p.method as payment_method
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (i.invoice_number LIKE ? OR c.name LIKE ? OR p.reference_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (method) {
      query += ` AND p.method = ?`;
      params.push(method);
    }
    if (customer_id) {
      query += ` AND p.customer_id = ?`;
      params.push(customer_id);
    }
    if (from && to) {
      query += ` AND p.date BETWEEN ? AND ?`;
      params.push(from, to);
    } else if (date) {
      query += ` AND p.date = ?`;
      params.push(date);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const total = db.prepare(countQuery).get(...params).total;

    query += ` ORDER BY p.id DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const payments = db.prepare(query).all(...params);
    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      payments,
      data: payments,
      total,
      page: pageNum,
      limit: limitNum,
      pages: totalPages,
      totalPages,
      pagination: { page: pageNum, totalPages, total }
    });
  } catch (err) {
    console.error('[Payments] Error fetching payments:', err.message);
    res.status(500).json({ error: 'Failed to fetch payments.' });
  }
});

router.post('/', requireAuth, (req, res) => {
  try {
    const customer_id = req.body.customer_id ? parseInt(req.body.customer_id, 10) : null;
    const invoice_id = req.body.invoice_id ? parseInt(req.body.invoice_id, 10) : null;
    const amount = parseFloat(req.body.amount);
    const date = req.body.date || req.body.payment_date || todayDate();
    const method = req.body.method || req.body.payment_method || 'cash';
    const reference_number = req.body.reference_number || '';
    const notes = req.body.notes || '';

    if (!validatePositiveNumber(amount)) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }
    if (!invoice_id && !customer_id) {
      return res.status(400).json({ error: 'Customer or invoice is required.' });
    }

    const recordPayment = db.transaction(() => {
      let finalCustomerId = customer_id;
      let finalInvoiceId = invoice_id;
      let invoiceDesc = '';

      if (invoice_id) {
        const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoice_id);
        if (!invoice) throw new Error('Invoice not found.');
        if (invoice.status === 'cancelled') throw new Error('Cannot add payment to a cancelled invoice.');
        
        finalCustomerId = invoice.customer_id;
        invoiceDesc = ` for invoice ${invoice.invoice_number}`;

        if (amount > invoice.due) {
          throw new Error(`Payment amount (₹${amount}) exceeds invoice due amount (₹${invoice.due}).`);
        }

        const newPaid = round2(invoice.paid + amount);
        const newDue = round2(Math.max(0, invoice.due - amount));
        const newStatus = newDue <= 0 ? 'paid' : 'partial';

        db.prepare(`UPDATE invoices SET paid = ?, due = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(newPaid, newDue, newStatus, invoice.id);
      } else {
        // Apply payment across customer's unpaid invoices
        const unpaidInvoices = db.prepare(`
          SELECT * FROM invoices 
          WHERE customer_id = ? AND status IN ('unpaid', 'partial')
          ORDER BY date ASC, id ASC
        `).all(finalCustomerId);

        let remaining = amount;
        for (const inv of unpaidInvoices) {
          if (remaining <= 0) break;
          const payToInv = Math.min(remaining, inv.due);
          const newPaid = round2(inv.paid + payToInv);
          const newDue = round2(inv.due - payToInv);
          const newStatus = newDue <= 0 ? 'paid' : 'partial';

          db.prepare(`UPDATE invoices SET paid = ?, due = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .run(newPaid, newDue, newStatus, inv.id);

          remaining = round2(remaining - payToInv);
        }
      }

      const datetime = nowDatetime();
      
      const result = db.prepare(`
        INSERT INTO payments (customer_id, invoice_id, amount, method, reference_number, date, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(finalCustomerId, finalInvoiceId, amount, method, reference_number, date, notes, datetime);
      
      const paymentId = result.lastInsertRowid;

      db.prepare(`
        INSERT INTO customer_ledger (customer_id, type, reference_id, debit, credit, balance, description, date) 
        VALUES (?, 'payment', ?, 0, ?, (SELECT COALESCE(SUM(debit)-SUM(credit),0) - ? FROM customer_ledger WHERE customer_id = ?), ?, ?)
      `).run(finalCustomerId, paymentId, amount, amount, finalCustomerId, `Payment received${invoiceDesc}`, datetime);

      db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'create', 'payment', ?, ?)`).run(req.session.userId || 1, paymentId, JSON.stringify({ amount, method, invoice_id }));

      return paymentId;
    });

    const newPaymentId = recordPayment();
    const newPayment = db.prepare(`
      SELECT p.*, 'PAY-' || printf('%06d', p.id) as payment_number, c.name as customer_name, i.invoice_number,
        p.date as payment_date, p.method as payment_method
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE p.id = ?
    `).get(newPaymentId);
    
    res.status(201).json(newPayment);
  } catch (err) {
    console.error('[Payments] Error recording payment:', err.message);
    res.status(400).json({ error: err.message || 'Failed to record payment.' });
  }
});

router.get('/:id', requireAuth, (req, res) => {
  try {
    const payment = db.prepare(`
      SELECT p.*, 'PAY-' || printf('%06d', p.id) as payment_number, c.name as customer_name, i.invoice_number,
        p.date as payment_date, p.method as payment_method
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE p.id = ?
    `).get(req.params.id);
    
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });
    
    res.json(payment);
  } catch (err) {
    console.error('[Payments] Error fetching payment:', err.message);
    res.status(500).json({ error: 'Failed to fetch payment.' });
  }
});

module.exports = router;
