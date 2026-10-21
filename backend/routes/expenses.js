const express = require('express');
const router = express.Router();
const { db } = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { todayDate } = require('../utils/helpers');
const { validateRequired, validatePositiveNumber } = require('../utils/validators');

router.get('/', requireAuth, (req, res) => {
  try {
    const { search = '', category_id = '', method = '', from = '', to = '', date = '', page = 1, limit = 25 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 25;
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT e.*, c.name as category_name 
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND e.description LIKE ?`;
      params.push(`%${search}%`);
    }
    if (category_id) {
      query += ` AND e.category_id = ?`;
      params.push(category_id);
    }
    if (method) {
      query += ` AND e.payment_method = ?`;
      params.push(method);
    }
    if (from && to) {
      query += ` AND e.date BETWEEN ? AND ?`;
      params.push(from, to);
    } else if (date) {
      query += ` AND e.date = ?`;
      params.push(date);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const total = db.prepare(countQuery).get(...params).total;

    query += ` ORDER BY e.date DESC, e.id DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const expenses = db.prepare(query).all(...params);
    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      expenses,
      data: expenses,
      total,
      page: pageNum,
      limit: limitNum,
      pages: totalPages,
      totalPages,
      pagination: { page: pageNum, totalPages, total }
    });
  } catch (err) {
    console.error('[Expenses] Error fetching expenses:', err.message);
    res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
});

router.post('/', requireAuth, (req, res) => {
  try {
    const { category_id, amount, date = todayDate(), payment_method, method, description = '' } = req.body;
    const finalMethod = payment_method || method || 'cash';
    
    if (!validateRequired(category_id) || !validateRequired(date) || !validateRequired(finalMethod)) {
      return res.status(400).json({ error: 'Category, date, and payment method are required.' });
    }
    if (!validatePositiveNumber(amount)) {
      return res.status(400).json({ error: 'Amount must be positive.' });
    }

    const result = db.prepare(`
      INSERT INTO expenses (category_id, amount, date, payment_method, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(category_id, parseFloat(amount), date, finalMethod, description);
    
    db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'create', 'expense', ?, ?)`).run(req.session.userId || 1, result.lastInsertRowid, JSON.stringify({ amount, description }));
    
    const newExpense = db.prepare(`
      SELECT e.*, c.name as category_name 
      FROM expenses e 
      LEFT JOIN categories c ON e.category_id = c.id 
      WHERE e.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newExpense);
  } catch (err) {
    console.error('[Expenses] Error creating expense:', err.message);
    res.status(400).json({ error: err.message || 'Failed to create expense.' });
  }
});

router.get('/:id', requireAuth, (req, res) => {
  try {
    const expense = db.prepare(`
      SELECT e.*, c.name as category_name 
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `).get(req.params.id);
    
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });
    res.json(expense);
  } catch (err) {
    console.error('[Expenses] Error fetching expense:', err.message);
    res.status(500).json({ error: 'Failed to fetch expense.' });
  }
});

router.put('/:id', requireAuth, (req, res) => {
  try {
    const { category_id, amount, date, payment_method, method, description = '' } = req.body;
    const finalMethod = payment_method || method || 'cash';

    if (!validatePositiveNumber(amount)) {
      return res.status(400).json({ error: 'Amount must be positive.' });
    }

    const result = db.prepare(`
      UPDATE expenses SET category_id = ?, amount = ?, date = ?, payment_method = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(category_id, parseFloat(amount), date, finalMethod, description, req.params.id);
    
    if (result.changes === 0) return res.status(404).json({ error: 'Expense not found.' });
    
    db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'update', 'expense', ?, ?)`).run(req.session.userId || 1, req.params.id, JSON.stringify({ amount, description }));
    
    const updatedExpense = db.prepare(`
      SELECT e.*, c.name as category_name 
      FROM expenses e 
      LEFT JOIN categories c ON e.category_id = c.id 
      WHERE e.id = ?
    `).get(req.params.id);

    res.json(updatedExpense);
  } catch (err) {
    console.error('[Expenses] Error updating expense:', err.message);
    res.status(400).json({ error: 'Failed to update expense.' });
  }
});

router.delete('/:id', requireAuth, (req, res) => {
  try {
    const result = db.prepare(`DELETE FROM expenses WHERE id = ?`).run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Expense not found.' });
    
    db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'delete', 'expense', ?, ?)`).run(req.session.userId || 1, req.params.id, JSON.stringify({ deleted: true }));
    
    res.json({ message: 'Expense deleted successfully.' });
  } catch (err) {
    console.error('[Expenses] Error deleting expense:', err.message);
    res.status(500).json({ error: 'Failed to delete expense.' });
  }
});

module.exports = router;
