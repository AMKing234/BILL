const express = require('express');
const router = express.Router();
const { db } = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { round2, calculateItemTotal, generateNumber, todayDate, nowDatetime } = require('../utils/helpers');
const { validateRequired, validateInvoiceItems } = require('../utils/validators');

router.get('/', requireAuth, (req, res) => {
  try {
    const { search = '', supplier_id = '', from = '', to = '', date = '', page = 1, limit = 25 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 25;
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT p.*, s.name as supplier_name,
        p.paid as paid_amount, p.due as due_amount,
        p.discount as total_discount, p.tax_amount as total_tax
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (p.purchase_number LIKE ? OR s.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (supplier_id) {
      query += ` AND p.supplier_id = ?`;
      params.push(supplier_id);
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

    const purchases = db.prepare(query).all(...params);
    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      purchases,
      data: purchases,
      total,
      page: pageNum,
      limit: limitNum,
      pages: totalPages,
      totalPages,
      pagination: { page: pageNum, totalPages, total }
    });
  } catch (err) {
    console.error('[Purchases] Error fetching purchases:', err.message);
    res.status(500).json({ error: 'Failed to fetch purchases.' });
  }
});

router.get('/next-number', requireAuth, (req, res) => {
  try {
    const prefix = db.prepare(`SELECT value FROM settings WHERE key = 'purchase_prefix'`).get()?.value || 'PUR';
    const cleanPrefix = prefix.replace(/-+$/, '');
    const startNum = parseInt(db.prepare(`SELECT value FROM settings WHERE key = 'purchase_start_number'`).get()?.value || '1', 10);
    
    const lastPurchase = db.prepare(`
      SELECT purchase_number FROM purchases 
      WHERE purchase_number LIKE ? 
      ORDER BY id DESC LIMIT 1
    `).get(`${cleanPrefix}-%`);

    let nextNum = startNum;
    if (lastPurchase && lastPurchase.purchase_number) {
      const lastNum = parseInt(lastPurchase.purchase_number.replace(`${cleanPrefix}-`, ''), 10);
      if (!isNaN(lastNum) && lastNum >= startNum) {
        nextNum = lastNum + 1;
      }
    }

    const nextFormatted = generateNumber(cleanPrefix, nextNum);
    res.json({ next_number: nextFormatted });
  } catch (err) {
    console.error('[Purchases] Error fetching next number:', err.message);
    res.status(500).json({ error: 'Failed to generate next purchase number.' });
  }
});

router.post('/', requireAuth, (req, res) => {
  try {
    const { supplier_id, date = todayDate(), discount = 0, items, notes = '', payment_method = 'cash', paid = 0, reference_number = '' } = req.body;
    
    if (!validateRequired(supplier_id) || !validateRequired(date) || !validateRequired(items)) {
      return res.status(400).json({ error: 'Supplier, date, and items are required.' });
    }
    
    if (!validateInvoiceItems(items)) {
      return res.status(400).json({ error: 'Invalid items format. Ensure each item has a product and valid quantity.' });
    }

    const createPurchase = db.transaction(() => {
      const prefix = db.prepare(`SELECT value FROM settings WHERE key = 'purchase_prefix'`).get()?.value || 'PUR';
      const cleanPrefix = prefix.replace(/-+$/, '');
      const startNum = parseInt(db.prepare(`SELECT value FROM settings WHERE key = 'purchase_start_number'`).get()?.value || '1', 10);
      
      const lastPurchase = db.prepare(`SELECT purchase_number FROM purchases WHERE purchase_number LIKE ? ORDER BY id DESC LIMIT 1`).get(`${cleanPrefix}-%`);
      let nextNum = startNum;
      if (lastPurchase && lastPurchase.purchase_number) {
        const lastNum = parseInt(lastPurchase.purchase_number.replace(`${cleanPrefix}-`, ''), 10);
        if (!isNaN(lastNum) && lastNum >= startNum) nextNum = lastNum + 1;
      }
      const purchase_number = generateNumber(cleanPrefix, nextNum);
      
      db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('purchase_start_number', ?)`).run((nextNum + 1).toString());

      let subtotal = 0;
      let tax_amount = 0;
      const validatedItems = [];

      for (const item of items) {
        const product = db.prepare(`SELECT id, name, current_stock, purchase_price FROM products WHERE id = ?`).get(item.product_id);
        if (!product) throw new Error(`Product ${item.product_id} not found.`);
        
        const price = item.purchase_price !== undefined ? parseFloat(item.purchase_price) : parseFloat(item.price !== undefined ? item.price : (product.purchase_price || 0));
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

      const purchaseResult = db.prepare(`
        INSERT INTO purchases (purchase_number, supplier_id, date, subtotal, discount, tax_amount, grand_total, paid, due, status, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(purchase_number, supplier_id, date, subtotal, parseFloat(discount || 0), tax_amount, grand_total, paid_amount, due, status, payment_method, notes);
      
      const purchase_id = purchaseResult.lastInsertRowid;

      const insertItem = db.prepare(`INSERT INTO purchase_items (purchase_id, product_id, product_name, quantity, price, discount, tax_rate, tax_amount, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      const updateStock = db.prepare(`UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
      const insertHistory = db.prepare(`INSERT INTO stock_history (product_id, type, quantity, previous_stock, new_stock, reference_type, reference_id, notes, date) VALUES (?, 'purchase', ?, ?, ?, 'purchase', ?, ?, ?)`);

      for (const item of validatedItems) {
        insertItem.run(purchase_id, item.product_id, item.product_name, item.quantity, item.price, item.discount, item.tax_rate, item.tax_amount, item.total);
        updateStock.run(item.quantity, item.product_id);
        insertHistory.run(item.product_id, item.quantity, item.previous_stock, item.previous_stock + item.quantity, purchase_id, `Purchase #${purchase_number}`, date);
      }

      const datetime = nowDatetime();
      db.prepare(`
        INSERT INTO supplier_ledger (supplier_id, type, reference_id, debit, credit, balance, description, date)
        VALUES (?, 'purchase', ?, ?, 0, (SELECT COALESCE(SUM(debit)-SUM(credit),0) + ? FROM supplier_ledger WHERE supplier_id = ?), ?, ?)
      `).run(supplier_id, purchase_id, grand_total, grand_total, supplier_id, `Purchase ${purchase_number}`, datetime);

      if (paid_amount > 0) {
        db.prepare(`
          INSERT INTO supplier_ledger (supplier_id, type, reference_id, debit, credit, balance, description, date)
          VALUES (?, 'payment', ?, 0, ?, (SELECT COALESCE(SUM(debit)-SUM(credit),0) - ? FROM supplier_ledger WHERE supplier_id = ?), ?, ?)
        `).run(supplier_id, purchase_id, paid_amount, paid_amount, supplier_id, `Payment for ${purchase_number}`, datetime);
      }

      db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'create', 'purchase', ?, ?)`).run(req.session.userId || 1, purchase_id, JSON.stringify({ purchase_number, grand_total }));

      return purchase_id;
    });

    const purchaseId = createPurchase();
    const newPurchase = db.prepare(`
      SELECT p.*, s.name as supplier_name, s.phone as supplier_phone, s.address as supplier_address,
        p.paid as paid_amount, p.due as due_amount, p.discount as total_discount, p.tax_amount as total_tax
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `).get(purchaseId);
    newPurchase.items = db.prepare(`SELECT *, price as purchase_price FROM purchase_items WHERE purchase_id = ?`).all(purchaseId);
    
    res.status(201).json({ ...newPurchase, purchase: newPurchase, items: newPurchase.items });
  } catch (err) {
    console.error('[Purchases] Error creating purchase:', err.message);
    res.status(400).json({ error: err.message || 'Failed to create purchase.' });
  }
});

router.get('/:id', requireAuth, (req, res) => {
  try {
    const purchase = db.prepare(`
      SELECT p.*, s.name as supplier_name, s.phone as supplier_phone, s.address as supplier_address,
        p.paid as paid_amount, p.due as due_amount, p.discount as total_discount, p.tax_amount as total_tax
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `).get(req.params.id);
    
    if (!purchase) return res.status(404).json({ error: 'Purchase not found.' });
    
    purchase.items = db.prepare(`SELECT *, price as purchase_price FROM purchase_items WHERE purchase_id = ?`).all(req.params.id);
    res.json({ ...purchase, purchase, items: purchase.items });
  } catch (err) {
    console.error('[Purchases] Error fetching purchase:', err.message);
    res.status(500).json({ error: 'Failed to fetch purchase.' });
  }
});

module.exports = router;
