const express = require('express');
const router = express.Router();
const { db } = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { round2, calculateItemTotal, generateNumber, todayDate, nowDatetime } = require('../utils/helpers');
const { validateRequired, validateInvoiceItems } = require('../utils/validators');

router.get('/', requireAuth, (req, res) => {
  try {
    const { search = '', status = '', customer_id = '', from = '', to = '', date = '', page = 1, limit = 25 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 25;
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT i.*, c.name as customer_name,
        i.paid as paid_amount, i.due as due_amount,
        i.discount as total_discount, i.tax_amount as total_tax
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (i.invoice_number LIKE ? OR c.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length > 0) {
        query += ` AND i.status IN (${statuses.map(() => '?').join(',')})`;
        params.push(...statuses);
      }
    }
    if (customer_id) {
      query += ` AND i.customer_id = ?`;
      params.push(customer_id);
    }
    if (from && to) {
      query += ` AND i.date BETWEEN ? AND ?`;
      params.push(from, to);
    } else if (date) {
      query += ` AND i.date = ?`;
      params.push(date);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const total = db.prepare(countQuery).get(...params).total;

    query += ` ORDER BY i.id DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const invoices = db.prepare(query).all(...params);
    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      invoices,
      data: invoices,
      total,
      page: pageNum,
      limit: limitNum,
      pages: totalPages,
      totalPages,
      pagination: { page: pageNum, totalPages, total }
    });
  } catch (err) {
    console.error('[Invoices] Error fetching invoices:', err.message);
    res.status(500).json({ error: 'Failed to fetch invoices.' });
  }
});

router.get('/next-number', requireAuth, (req, res) => {
  try {
    const prefix = db.prepare(`SELECT value FROM settings WHERE key = 'invoice_prefix'`).get()?.value || 'INV';
    const startNum = parseInt(db.prepare(`SELECT value FROM settings WHERE key = 'invoice_start_number'`).get()?.value || '1', 10);
    
    const cleanPrefix = prefix.replace(/-+$/, '');
    const lastInvoice = db.prepare(`
      SELECT invoice_number FROM invoices 
      WHERE invoice_number LIKE ? 
      ORDER BY id DESC LIMIT 1
    `).get(`${cleanPrefix}-%`);

    let nextNum = startNum;
    if (lastInvoice && lastInvoice.invoice_number) {
      const lastNum = parseInt(lastInvoice.invoice_number.replace(`${cleanPrefix}-`, ''), 10);
      if (!isNaN(lastNum) && lastNum >= startNum) {
        nextNum = lastNum + 1;
      }
    }

    const nextFormatted = generateNumber(cleanPrefix, nextNum);
    res.json({ next_number: nextFormatted });
  } catch (err) {
    console.error('[Invoices] Error fetching next number:', err.message);
    res.status(500).json({ error: 'Failed to generate next invoice number.' });
  }
});

router.post('/', requireAuth, (req, res) => {
  try {
    const { customer_id, date = todayDate(), discount = 0, items, notes = '', payment_method = 'cash', paid = 0, reference_number = '' } = req.body;
    
    if (!validateRequired(customer_id) || !validateRequired(date) || !validateRequired(items)) {
      return res.status(400).json({ error: 'Customer, date, and items are required.' });
    }
    
    if (!validateInvoiceItems(items)) {
      return res.status(400).json({ error: 'Invalid items format. Ensure each item has a product and valid quantity.' });
    }

    const createInvoice = db.transaction(() => {
      const prefix = db.prepare(`SELECT value FROM settings WHERE key = 'invoice_prefix'`).get()?.value || 'INV';
      const cleanPrefix = prefix.replace(/-+$/, '');
      const startNum = parseInt(db.prepare(`SELECT value FROM settings WHERE key = 'invoice_start_number'`).get()?.value || '1', 10);
      
      const lastInvoice = db.prepare(`SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1`).get(`${cleanPrefix}-%`);
      let nextNum = startNum;
      if (lastInvoice && lastInvoice.invoice_number) {
        const lastNum = parseInt(lastInvoice.invoice_number.replace(`${cleanPrefix}-`, ''), 10);
        if (!isNaN(lastNum) && lastNum >= startNum) nextNum = lastNum + 1;
      }
      const invoice_number = generateNumber(cleanPrefix, nextNum);
      
      db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('invoice_start_number', ?)`).run((nextNum + 1).toString());

      let subtotal = 0;
      let tax_amount = 0;
      const validatedItems = [];

      for (const item of items) {
        const product = db.prepare(`SELECT id, name, current_stock, selling_price FROM products WHERE id = ?`).get(item.product_id);
        if (!product) throw new Error(`Product ${item.product_id} not found.`);
        if (product.current_stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.current_stock}, Requested: ${item.quantity}`);
        }
        
        const price = item.price !== undefined ? parseFloat(item.price) : parseFloat(product.selling_price || 0);
        const qty = parseFloat(item.quantity) || 1;
        const itemDiscount = parseFloat(item.discount || 0);
        const taxRate = parseFloat(item.tax_rate || 0);

        const totals = calculateItemTotal(qty, price, itemDiscount, taxRate);
        subtotal += totals.subtotal;
        tax_amount += totals.taxAmount;

        validatedItems.push({
          product_id: item.product_id,
          product_name: product.name,
          quantity: qty,
          price,
          discount: itemDiscount,
          tax_rate: taxRate,
          tax_amount: totals.taxAmount,
          total: totals.total,
          previous_stock: product.current_stock
        });
      }

      const grand_total = round2(subtotal - parseFloat(discount || 0) + tax_amount);
      const paid_amount = parseFloat(paid || 0);
      const due = round2(grand_total - paid_amount);
      const status = due <= 0 ? 'paid' : (paid_amount > 0 ? 'partial' : 'unpaid');

      const invoiceResult = db.prepare(`
        INSERT INTO invoices (invoice_number, customer_id, date, subtotal, discount, tax_amount, grand_total, paid, due, status, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(invoice_number, customer_id, date, subtotal, parseFloat(discount || 0), tax_amount, grand_total, paid_amount, due, status, payment_method, notes);
      
      const invoice_id = invoiceResult.lastInsertRowid;

      const insertItem = db.prepare(`INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, price, discount, tax_rate, tax_amount, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      const updateStock = db.prepare(`UPDATE products SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
      const insertHistory = db.prepare(`INSERT INTO stock_history (product_id, type, quantity, previous_stock, new_stock, reference_type, reference_id, notes, date) VALUES (?, 'sale', ?, ?, ?, 'invoice', ?, ?, ?)`);

      for (const item of validatedItems) {
        insertItem.run(invoice_id, item.product_id, item.product_name, item.quantity, item.price, item.discount, item.tax_rate, item.tax_amount, item.total);
        updateStock.run(item.quantity, item.product_id);
        insertHistory.run(item.product_id, item.quantity, item.previous_stock, item.previous_stock - item.quantity, invoice_id, `Sale via Invoice ${invoice_number}`, date);
      }

      const datetime = nowDatetime();
      db.prepare(`
        INSERT INTO customer_ledger (customer_id, type, reference_id, debit, credit, balance, description, date)
        VALUES (?, 'invoice', ?, ?, 0, (SELECT COALESCE(SUM(debit)-SUM(credit),0) + ? FROM customer_ledger WHERE customer_id = ?), ?, ?)
      `).run(customer_id, invoice_id, grand_total, grand_total, customer_id, `Invoice ${invoice_number}`, datetime);

      if (paid_amount > 0) {
        const paymentResult = db.prepare(`
          INSERT INTO payments (customer_id, invoice_id, amount, method, reference_number, date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(customer_id, invoice_id, paid_amount, payment_method, reference_number || '', date, datetime);
        
        db.prepare(`
          INSERT INTO customer_ledger (customer_id, type, reference_id, debit, credit, balance, description, date)
          VALUES (?, 'payment', ?, 0, ?, (SELECT COALESCE(SUM(debit)-SUM(credit),0) - ? FROM customer_ledger WHERE customer_id = ?), ?, ?)
        `).run(customer_id, paymentResult.lastInsertRowid, paid_amount, paid_amount, customer_id, `Payment for ${invoice_number}`, datetime);
      }

      db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'create', 'invoice', ?, ?)`).run(req.session.userId || 1, invoice_id, JSON.stringify({ invoice_number, grand_total }));

      return invoice_id;
    });

    const invoiceId = createInvoice();
    const newInvoice = db.prepare(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
        i.paid as paid_amount, i.due as due_amount, i.discount as total_discount, i.tax_amount as total_tax
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `).get(invoiceId);
    newInvoice.items = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`).all(invoiceId);
    
    res.status(201).json({ ...newInvoice, invoice: newInvoice, items: newInvoice.items });
  } catch (err) {
    console.error('[Invoices] Error creating invoice:', err.message);
    res.status(400).json({ error: err.message || 'Failed to create invoice.' });
  }
});

router.get('/:id', requireAuth, (req, res) => {
  try {
    const invoice = db.prepare(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
        i.paid as paid_amount, i.due as due_amount, i.discount as total_discount, i.tax_amount as total_tax
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `).get(req.params.id);
    
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
    
    invoice.items = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`).all(req.params.id);
    res.json({ ...invoice, invoice, items: invoice.items });
  } catch (err) {
    console.error('[Invoices] Error fetching invoice:', err.message);
    res.status(500).json({ error: 'Failed to fetch invoice.' });
  }
});

router.post('/:id/cancel', requireAuth, (req, res) => {
  try {
    const cancelInvoice = db.transaction(() => {
      const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(req.params.id);
      if (!invoice) throw new Error('Invoice not found.');
      if (invoice.status === 'cancelled') throw new Error('Invoice is already cancelled.');

      db.prepare(`UPDATE invoices SET status = 'cancelled', due = 0 WHERE id = ?`).run(invoice.id);
      
      const items = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`).all(invoice.id);
      const updateStock = db.prepare(`UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
      const insertHistory = db.prepare(`INSERT INTO stock_history (product_id, type, quantity, previous_stock, new_stock, reference_type, reference_id, notes, date) VALUES (?, 'cancellation', ?, ?, ?, 'invoice', ?, ?, ?)`);
      
      for (const item of items) {
        const product = db.prepare(`SELECT current_stock FROM products WHERE id = ?`).get(item.product_id);
        if (product) {
          updateStock.run(item.quantity, item.product_id);
          insertHistory.run(item.product_id, item.quantity, product.current_stock, product.current_stock + item.quantity, invoice.id, `Cancellation of Invoice ${invoice.invoice_number}`, todayDate());
        }
      }

      const datetime = nowDatetime();
      db.prepare(`
        INSERT INTO customer_ledger (customer_id, type, reference_id, debit, credit, balance, description, date)
        VALUES (?, 'cancellation', ?, 0, ?, (SELECT COALESCE(SUM(debit)-SUM(credit),0) - ? FROM customer_ledger WHERE customer_id = ?), ?, ?)
      `).run(invoice.customer_id, invoice.id, invoice.grand_total, invoice.grand_total, invoice.customer_id, `Cancel Invoice ${invoice.invoice_number}`, datetime);

      db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'cancel', 'invoice', ?, ?)`).run(req.session.userId || 1, invoice.id, JSON.stringify({ invoice_number: invoice.invoice_number }));
    });

    cancelInvoice();
    res.json({ message: 'Invoice cancelled successfully.' });
  } catch (err) {
    console.error('[Invoices] Error cancelling invoice:', err.message);
    res.status(400).json({ error: err.message || 'Failed to cancel invoice.' });
  }
});

module.exports = router;
