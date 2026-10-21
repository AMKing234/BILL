const express = require('express');
const router = express.Router();
const { db } = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { round2, nowDatetime, todayDate } = require('../utils/helpers');
const { validateRequired } = require('../utils/validators');

router.post('/sales', requireAuth, (req, res) => {
  try {
    const { invoice_id, items, date = todayDate(), reason = '' } = req.body;
    if (!validateRequired(invoice_id) || !validateRequired(items)) {
      return res.status(400).json({ error: 'Invoice ID and items are required.' });
    }

    const createSalesReturn = db.transaction(() => {
      const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoice_id);
      if (!invoice) throw new Error('Invoice not found.');

      const lastSR = db.prepare(`SELECT return_number FROM sales_returns ORDER BY id DESC LIMIT 1`).get();
      let nextNum = 1;
      if (lastSR && lastSR.return_number) {
        const last = parseInt(lastSR.return_number.replace('SR-', ''), 10);
        if (!isNaN(last)) nextNum = last + 1;
      }
      const return_number = `SR-${String(nextNum).padStart(6, '0')}`;

      let total_return_amount = 0;
      const validatedItems = [];

      for (const item of items) {
        const qty = parseFloat(item.quantity);
        if (isNaN(qty) || qty <= 0) continue;
        const invItem = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ? AND product_id = ?`).get(invoice_id, item.product_id);
        if (!invItem) throw new Error(`Product ${item.product_id} not found on this invoice.`);
        
        const unitPrice = invItem.quantity > 0 ? (invItem.total / invItem.quantity) : invItem.price;
        const returnVal = round2(unitPrice * qty);
        total_return_amount += returnVal;

        const product = db.prepare(`SELECT name, current_stock FROM products WHERE id = ?`).get(item.product_id);
        
        validatedItems.push({
          product_id: item.product_id,
          product_name: invItem.product_name || (product ? product.name : 'Unknown Product'),
          quantity: qty,
          price: invItem.price,
          total: returnVal,
          previous_stock: product ? product.current_stock : 0
        });
      }

      if (validatedItems.length === 0) throw new Error('No valid items to return.');

      const srResult = db.prepare(`
        INSERT INTO sales_returns (return_number, invoice_id, customer_id, date, total, reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(return_number, invoice_id, invoice.customer_id, date || todayDate(), total_return_amount, reason);
      const return_id = srResult.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO sales_return_items (return_id, product_id, product_name, quantity, price, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const updateStock = db.prepare(`UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
      const insertHistory = db.prepare(`
        INSERT INTO stock_history (product_id, type, quantity, previous_stock, new_stock, reference_type, reference_id, notes, date)
        VALUES (?, 'sales_return', ?, ?, ?, 'sales_return', ?, ?, ?)
      `);

      for (const item of validatedItems) {
        insertItem.run(return_id, item.product_id, item.product_name, item.quantity, item.price, item.total);
        updateStock.run(item.quantity, item.product_id);
        insertHistory.run(item.product_id, item.quantity, item.previous_stock, item.previous_stock + item.quantity, return_id, `Sales Return ${return_number}`, date || todayDate());
      }

      const datetime = nowDatetime();
      db.prepare(`
        INSERT INTO customer_ledger (customer_id, type, reference_id, debit, credit, balance, description, date)
        VALUES (?, 'sales_return', ?, 0, ?, (SELECT COALESCE(SUM(debit)-SUM(credit),0) - ? FROM customer_ledger WHERE customer_id = ?), ?, ?)
      `).run(invoice.customer_id, return_id, total_return_amount, total_return_amount, invoice.customer_id, `Sales Return ${return_number}`, datetime);
      
      const newDue = Math.max(0, round2(invoice.due - total_return_amount));
      const newStatus = newDue <= 0 ? 'paid' : (invoice.paid > 0 ? 'partial' : 'unpaid');
      db.prepare(`UPDATE invoices SET due = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(newDue, newStatus, invoice_id);

      db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'create', 'sales_return', ?, ?)`).run(req.session.userId || 1, return_id, JSON.stringify({ return_number, total: total_return_amount }));
      
      return return_id;
    });

    const srId = createSalesReturn();
    const createdSR = db.prepare(`SELECT * FROM sales_returns WHERE id = ?`).get(srId);
    res.status(201).json({ ...createdSR, message: 'Sales return created successfully.' });
  } catch (err) {
    console.error('[Returns] Error creating sales return:', err.message);
    res.status(400).json({ error: err.message || 'Failed to create sales return.' });
  }
});

router.get('/sales', requireAuth, (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 25;
    const offset = (pageNum - 1) * limitNum;

    const countQuery = `SELECT COUNT(*) as total FROM sales_returns`;
    const total = db.prepare(countQuery).get().total;

    const returns = db.prepare(`
      SELECT sr.*, i.invoice_number, c.name as customer_name,
        c.name as party_name, i.invoice_number as parent_number, sr.invoice_id as parent_id
      FROM sales_returns sr
      LEFT JOIN invoices i ON sr.invoice_id = i.id
      LEFT JOIN customers c ON sr.customer_id = c.id
      ORDER BY sr.id DESC LIMIT ? OFFSET ?
    `).all(limitNum, offset);

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      returns,
      data: returns,
      total,
      page: pageNum,
      limit: limitNum,
      pages: totalPages,
      totalPages,
      pagination: { page: pageNum, totalPages, total }
    });
  } catch (err) {
    console.error('[Returns] Error fetching sales returns:', err.message);
    res.status(500).json({ error: 'Failed to fetch sales returns.' });
  }
});

router.post('/purchases', requireAuth, (req, res) => {
  try {
    const { purchase_id, items, date = todayDate(), reason = '' } = req.body;
    if (!validateRequired(purchase_id) || !validateRequired(items)) {
      return res.status(400).json({ error: 'Purchase ID and items are required.' });
    }

    const createPurchaseReturn = db.transaction(() => {
      const purchase = db.prepare(`SELECT * FROM purchases WHERE id = ?`).get(purchase_id);
      if (!purchase) throw new Error('Purchase not found.');

      const lastPR = db.prepare(`SELECT return_number FROM purchase_returns ORDER BY id DESC LIMIT 1`).get();
      let nextNum = 1;
      if (lastPR && lastPR.return_number) {
        const last = parseInt(lastPR.return_number.replace('PR-', ''), 10);
        if (!isNaN(last)) nextNum = last + 1;
      }
      const return_number = `PR-${String(nextNum).padStart(6, '0')}`;

      let total_return_amount = 0;
      const validatedItems = [];

      for (const item of items) {
        const qty = parseFloat(item.quantity);
        if (isNaN(qty) || qty <= 0) continue;
        const purItem = db.prepare(`SELECT * FROM purchase_items WHERE purchase_id = ? AND product_id = ?`).get(purchase_id, item.product_id);
        if (!purItem) throw new Error(`Product ${item.product_id} not found on this purchase.`);
        
        const unitPrice = purItem.quantity > 0 ? (purItem.total / purItem.quantity) : purItem.price;
        const returnVal = round2(unitPrice * qty);
        total_return_amount += returnVal;

        const product = db.prepare(`SELECT name, current_stock FROM products WHERE id = ?`).get(item.product_id);
        if (product && product.current_stock < qty) {
          throw new Error(`Insufficient stock for product ${product.name} to return.`);
        }

        validatedItems.push({
          product_id: item.product_id,
          product_name: purItem.product_name || (product ? product.name : 'Unknown Product'),
          quantity: qty,
          price: purItem.price,
          total: returnVal,
          previous_stock: product ? product.current_stock : 0
        });
      }

      if (validatedItems.length === 0) throw new Error('No valid items to return.');

      const prResult = db.prepare(`
        INSERT INTO purchase_returns (return_number, purchase_id, supplier_id, date, total, reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(return_number, purchase_id, purchase.supplier_id, date || todayDate(), total_return_amount, reason);
      const return_id = prResult.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO purchase_return_items (return_id, product_id, product_name, quantity, price, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const updateStock = db.prepare(`UPDATE products SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
      const insertHistory = db.prepare(`
        INSERT INTO stock_history (product_id, type, quantity, previous_stock, new_stock, reference_type, reference_id, notes, date)
        VALUES (?, 'purchase_return', ?, ?, ?, 'purchase_return', ?, ?, ?)
      `);

      for (const item of validatedItems) {
        insertItem.run(return_id, item.product_id, item.product_name, item.quantity, item.price, item.total);
        updateStock.run(item.quantity, item.product_id);
        insertHistory.run(item.product_id, item.quantity, item.previous_stock, item.previous_stock - item.quantity, return_id, `Purchase Return ${return_number}`, date || todayDate());
      }

      const datetime = nowDatetime();
      db.prepare(`
        INSERT INTO supplier_ledger (supplier_id, type, reference_id, debit, credit, balance, description, date)
        VALUES (?, 'purchase_return', ?, 0, ?, (SELECT COALESCE(SUM(debit)-SUM(credit),0) - ? FROM supplier_ledger WHERE supplier_id = ?), ?, ?)
      `).run(purchase.supplier_id, return_id, total_return_amount, total_return_amount, purchase.supplier_id, `Purchase Return ${return_number}`, datetime);
      
      const newDue = Math.max(0, round2(purchase.due - total_return_amount));
      const newStatus = newDue <= 0 ? 'paid' : (purchase.paid > 0 ? 'partial' : 'unpaid');
      db.prepare(`UPDATE purchases SET due = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(newDue, newStatus, purchase_id);

      db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'create', 'purchase_return', ?, ?)`).run(req.session.userId || 1, return_id, JSON.stringify({ return_number, total: total_return_amount }));
      
      return return_id;
    });

    const prId = createPurchaseReturn();
    const createdPR = db.prepare(`SELECT * FROM purchase_returns WHERE id = ?`).get(prId);
    res.status(201).json({ ...createdPR, message: 'Purchase return created successfully.' });
  } catch (err) {
    console.error('[Returns] Error creating purchase return:', err.message);
    res.status(400).json({ error: err.message || 'Failed to create purchase return.' });
  }
});

router.get('/purchases', requireAuth, (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 25;
    const offset = (pageNum - 1) * limitNum;

    const countQuery = `SELECT COUNT(*) as total FROM purchase_returns`;
    const total = db.prepare(countQuery).get().total;

    const returns = db.prepare(`
      SELECT pr.*, p.purchase_number, s.name as supplier_name,
        s.name as party_name, p.purchase_number as parent_number, pr.purchase_id as parent_id
      FROM purchase_returns pr
      LEFT JOIN purchases p ON pr.purchase_id = p.id
      LEFT JOIN suppliers s ON pr.supplier_id = s.id
      ORDER BY pr.id DESC LIMIT ? OFFSET ?
    `).all(limitNum, offset);

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      returns,
      data: returns,
      total,
      page: pageNum,
      limit: limitNum,
      pages: totalPages,
      totalPages,
      pagination: { page: pageNum, totalPages, total }
    });
  } catch (err) {
    console.error('[Returns] Error fetching purchase returns:', err.message);
    res.status(500).json({ error: 'Failed to fetch purchase returns.' });
  }
});

module.exports = router;
