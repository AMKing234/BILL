const express = require('express');
const router = express.Router();
const { db } = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { todayDate } = require('../utils/helpers');
const { validateRequired } = require('../utils/validators');

router.get('/', requireAuth, (req, res) => {
  try {
    let { search, category, category_id, page, limit, stock } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 25;
    const offset = (page - 1) * limit;
    const selectedCategory = category || category_id;

    let query = `
      SELECT p.*, c.name as category_name, p.selling_price as price
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM products p WHERE p.active = 1`;
    let params = [];

    if (search) {
      const searchStr = `%${search}%`;
      query += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`;
      countQuery += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`;
      params.push(searchStr, searchStr, searchStr);
    }

    if (selectedCategory) {
      query += ` AND p.category_id = ?`;
      countQuery += ` AND p.category_id = ?`;
      params.push(selectedCategory);
    }

    if (stock === 'low') {
      query += ` AND p.current_stock <= p.min_stock`;
      countQuery += ` AND p.current_stock <= p.min_stock`;
    }

    query += ` ORDER BY p.name ASC LIMIT ? OFFSET ?`;
    
    const products = db.prepare(query).all(...params, limit, offset);
    const total = db.prepare(countQuery).get(...params).total;
    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      products,
      data: products,
      total,
      page,
      pages: totalPages,
      totalPages,
      pagination: { page, totalPages, total }
    });
  } catch (err) {
    console.error('[Products] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

router.post('/', requireAuth, (req, res) => {
  const transaction = db.transaction(() => {
    let { 
      name, sku, barcode = '', category_id = null, purchase_price = 0, selling_price = 0, 
      tax_rate = 0, opening_stock = 0, min_stock = 0, unit = 'pcs', description = '' 
    } = req.body;

    if (!validateRequired(name)) throw new Error('Product name is required.');
    
    if (!sku || sku.trim() === '') {
      const lastIdStmt = db.prepare("SELECT MAX(id) as max_id FROM products");
      const lastIdRes = lastIdStmt.get();
      const nextId = (lastIdRes ? lastIdRes.max_id || 0 : 0) + 1;
      sku = `SKU-${nextId.toString().padStart(6, '0')}`;
    }

    opening_stock = parseFloat(opening_stock) || 0;
    const current_stock = opening_stock;
    purchase_price = parseFloat(purchase_price) || 0;
    selling_price = parseFloat(selling_price) || 0;
    tax_rate = parseFloat(tax_rate) || 0;
    min_stock = parseFloat(min_stock) || 0;
    const catId = category_id ? parseInt(category_id, 10) : null;

    const stmt = db.prepare(`
      INSERT INTO products (
        name, sku, barcode, category_id, purchase_price, selling_price, 
        tax_rate, opening_stock, current_stock, min_stock, unit, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      name.trim(), sku.trim(), barcode, catId, purchase_price, selling_price,
      tax_rate, opening_stock, current_stock, min_stock, unit || 'pcs', description
    );

    const productId = info.lastInsertRowid;

    if (opening_stock > 0) {
      db.prepare(`
        INSERT INTO stock_history (product_id, type, quantity, previous_stock, new_stock, reference_type, reference_id, notes, date)
        VALUES (?, 'opening', ?, 0, ?, 'system', NULL, 'Opening Stock', ?)
      `).run(productId, opening_stock, opening_stock, todayDate());
    }

    db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`)
      .run(req.session.userId || 1, 'CREATE', 'product', productId, `Created product: ${name} (${sku})`);

    return productId;
  });

  try {
    const newId = transaction();
    const product = db.prepare(`SELECT p.*, c.name as category_name, p.selling_price as price FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`).get(newId);
    res.status(201).json(product);
  } catch (err) {
    console.error('[Products] Error:', err.message);
    if (err.message.includes('UNIQUE constraint failed: products.sku')) {
      res.status(400).json({ error: 'SKU must be unique.' });
    } else {
      res.status(500).json({ error: err.message || 'Failed to create product.' });
    }
  }
});

router.get('/:id', requireAuth, (req, res) => {
  try {
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, p.selling_price as price 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  } catch (err) {
    console.error('[Products] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch product.' });
  }
});

router.put('/:id', requireAuth, (req, res) => {
  try {
    const { 
      name, sku, barcode = '', category_id = null, purchase_price = 0, selling_price = 0, 
      tax_rate = 0, min_stock = 0, unit = 'pcs', description = '', active
    } = req.body;

    if (!validateRequired(name)) return res.status(400).json({ error: 'Product name is required.' });

    const stmt = db.prepare(`
      UPDATE products SET 
        name = ?, sku = ?, barcode = ?, category_id = ?, purchase_price = ?, 
        selling_price = ?, tax_rate = ?, min_stock = ?, unit = ?, 
        description = ?, active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const isActive = active !== undefined ? active : 1;
    const catId = category_id ? parseInt(category_id, 10) : null;
    const info = stmt.run(
      name.trim(), sku ? sku.trim() : null, barcode, catId, parseFloat(purchase_price) || 0, parseFloat(selling_price) || 0,
      parseFloat(tax_rate) || 0, parseFloat(min_stock) || 0, unit || 'pcs', description, isActive, req.params.id
    );

    if (info.changes === 0) return res.status(404).json({ error: 'Product not found.' });

    db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`)
      .run(req.session.userId || 1, 'UPDATE', 'product', req.params.id, `Updated product: ${name}`);

    res.json({ success: true, message: 'Product updated successfully.' });
  } catch (err) {
    console.error('[Products] Error:', err.message);
    if (err.message.includes('UNIQUE constraint failed: products.sku')) {
      res.status(400).json({ error: 'SKU must be unique.' });
    } else {
      res.status(500).json({ error: 'Failed to update product.' });
    }
  }
});

router.delete('/:id', requireAuth, (req, res) => {
  try {
    const stmt = db.prepare(`UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    const info = stmt.run(req.params.id);
    
    if (info.changes === 0) return res.status(404).json({ error: 'Product not found.' });

    db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`)
      .run(req.session.userId || 1, 'DELETE', 'product', req.params.id, `Soft deleted product ID: ${req.params.id}`);

    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    console.error('[Products] Error:', err.message);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

module.exports = router;
