const express = require('express');
const router = express.Router();
const { db } = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { todayDate } = require('../utils/helpers');

router.get('/', requireAuth, (req, res) => {
  try {
    let { search, category, stock } = req.query;

    let query = `
      SELECT p.id, p.name, p.sku, p.current_stock, p.min_stock, p.unit, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1
    `;
    let params = [];

    if (search) {
      search = `%${search}%`;
      query += ` AND (p.name LIKE ? OR p.sku LIKE ?)`;
      params.push(search, search);
    }

    if (category) {
      query += ` AND p.category_id = ?`;
      params.push(category);
    }

    if (stock === 'low') {
      query += ` AND p.current_stock <= p.min_stock`;
    }

    query += ` ORDER BY p.name ASC`;
    
    const inventory = db.prepare(query).all(...params);
    res.json({
      data: inventory,
      inventory
    });
  } catch (err) {
    console.error('[Inventory] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch inventory.' });
  }
});

router.get('/low-stock', requireAuth, (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.id, p.name, p.sku, p.current_stock, p.min_stock, p.unit, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1 AND p.current_stock <= p.min_stock
      ORDER BY p.current_stock ASC
    `).all();
    res.json({
      data: products,
      products,
      lowStock: products
    });
  } catch (err) {
    console.error('[Inventory] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch low stock products.' });
  }
});

router.get('/history', requireAuth, (req, res) => {
  try {
    let { product_id, type, page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 50;
    const offset = (page - 1) * limit;

    let query = `
      SELECT h.*, p.name as product_name, p.sku
      FROM stock_history h
      JOIN products p ON h.product_id = p.id
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM stock_history h WHERE 1=1`;
    let params = [];

    if (product_id) {
      query += ` AND h.product_id = ?`;
      countQuery += ` AND h.product_id = ?`;
      params.push(product_id);
    }

    if (type) {
      query += ` AND h.type = ?`;
      countQuery += ` AND h.type = ?`;
      params.push(type);
    }

    query += ` ORDER BY h.id DESC LIMIT ? OFFSET ?`;
    
    const history = db.prepare(query).all(...params, limit, offset);
    const total = db.prepare(countQuery).get(...params).total;
    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      data: history,
      history,
      total,
      page,
      pages: totalPages,
      totalPages,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (err) {
    console.error('[Inventory] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stock history.' });
  }
});

router.post('/adjust', requireAuth, (req, res) => {
  const transaction = db.transaction(() => {
    const { product_id, quantity, notes } = req.body;
    
    if (!product_id || quantity === undefined || isNaN(quantity)) {
      throw new Error('Valid product_id and quantity are required.');
    }

    const qty = parseFloat(quantity);
    if (qty === 0) throw new Error('Quantity cannot be zero.');

    const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(product_id);
    if (!product) throw new Error('Product not found.');

    const new_stock = product.current_stock + qty;
    
    db.prepare(`UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(new_stock, product_id);

    db.prepare(`
      INSERT INTO stock_history (product_id, type, quantity, previous_stock, new_stock, reference_type, reference_id, notes, date)
      VALUES (?, 'adjustment', ?, ?, ?, 'system', NULL, ?, ?)
    `).run(product_id, qty, product.current_stock, new_stock, notes || 'Manual Adjustment', todayDate());

    db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`)
      .run(req.session.userId || 1, 'UPDATE', 'product', product_id, `Stock adjusted by ${qty} for product: ${product.name}`);

    return { product_id, previous_stock: product.current_stock, new_stock, adjusted_by: qty };
  });

  try {
    const result = transaction();
    res.json({ success: true, message: 'Stock adjusted successfully.', ...result, data: result });
  } catch (err) {
    console.error('[Inventory] Error:', err.message);
    res.status(400).json({ error: err.message || 'Failed to adjust stock.' });
  }
});

module.exports = router;
