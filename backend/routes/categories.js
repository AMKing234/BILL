const express = require('express');
const router = express.Router();
const { db } = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { validateRequired } = require('../utils/validators');

router.get('/', requireAuth, (req, res) => {
  try {
    const { type } = req.query;
    let query = `SELECT * FROM categories`;
    let params = [];

    if (type) {
      query += ` WHERE type = ?`;
      params.push(type);
    }
    
    query += ` ORDER BY name ASC`;
    const categories = db.prepare(query).all(...params);
    res.json(categories);
  } catch (err) {
    console.error('[Categories] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

router.post('/', requireAuth, (req, res) => {
  try {
    const { name, type, active } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    const catType = type === 'expense' ? 'expense' : 'product';
    const isActive = active !== undefined ? active : 1;

    const stmt = db.prepare(`INSERT INTO categories (name, type, active) VALUES (?, ?, ?)`);
    const info = stmt.run(name, catType, isActive);
    
    const category = db.prepare(`SELECT * FROM categories WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json(category);
  } catch (err) {
    console.error('[Categories] Error:', err.message);
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

router.put('/:id', requireAuth, (req, res) => {
  try {
    const { name, type, active } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    const catType = type === 'expense' ? 'expense' : 'product';
    const isActive = active !== undefined ? active : 1;

    const stmt = db.prepare(`UPDATE categories SET name = ?, type = ?, active = ? WHERE id = ?`);
    const info = stmt.run(name, catType, isActive, req.params.id);
    
    if (info.changes === 0) return res.status(404).json({ error: 'Category not found.' });

    res.json({ success: true, message: 'Category updated successfully.' });
  } catch (err) {
    console.error('[Categories] Error:', err.message);
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

router.delete('/:id', requireAuth, (req, res) => {
  try {
    const category = db.prepare(`SELECT type FROM categories WHERE id = ?`).get(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found.' });

    if (category.type === 'product') {
      const prodCount = db.prepare(`SELECT COUNT(*) as count FROM products WHERE category_id = ?`).get(req.params.id).count;
      if (prodCount > 0) return res.status(400).json({ error: 'Cannot delete category with associated products.' });
    } else {
      const expCount = db.prepare(`SELECT COUNT(*) as count FROM expenses WHERE category_id = ?`).get(req.params.id).count;
      if (expCount > 0) return res.status(400).json({ error: 'Cannot delete category with associated expenses.' });
    }

    db.prepare(`DELETE FROM categories WHERE id = ?`).run(req.params.id);
    res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (err) {
    console.error('[Categories] Error:', err.message);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

module.exports = router;
