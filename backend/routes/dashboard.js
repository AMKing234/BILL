const express = require('express');
const router = express.Router();
const { db } = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { todayDate } = require('../utils/helpers');

// GET /api/dashboard/stats
router.get('/stats', requireAuth, (req, res) => {
  try {
    const today = todayDate();

    const todaySales = db.prepare(
      `SELECT COALESCE(SUM(grand_total), 0) as total FROM invoices WHERE date = ? AND status != 'cancelled'`
    ).get(today).total;

    const totalSales = db.prepare(
      `SELECT COALESCE(SUM(grand_total), 0) as total FROM invoices WHERE status != 'cancelled'`
    ).get().total;

    const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE active = 1').get().count;
    const totalInvoices = db.prepare('SELECT COUNT(*) as count FROM invoices').get().count;
    const totalPurchasesAmount = db.prepare(
      `SELECT COALESCE(SUM(grand_total), 0) as total FROM purchases WHERE status != 'cancelled'`
    ).get().total;

    const totalPurchasesCount = db.prepare('SELECT COUNT(*) as count FROM purchases').get().count;

    const totalPayments = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments'
    ).get().total;

    const totalExpenses = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses'
    ).get().total;

    const totalDue = db.prepare(
      `SELECT COALESCE(SUM(due), 0) as total FROM invoices WHERE status != 'cancelled'`
    ).get().total;

    const rawLowStock = db.prepare(`
      SELECT id, name, sku, current_stock, min_stock, unit 
      FROM products 
      WHERE current_stock <= min_stock AND active = 1 
      ORDER BY current_stock ASC 
      LIMIT 10
    `).all();

    const lowStock = rawLowStock.map(p => ({
      ...p,
      stock: p.current_stock,
      minStock: p.min_stock
    }));

    const rawActivity = db.prepare(`
      SELECT id, action, entity_type, entity_id, details, created_at 
      FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT 20
    `).all();

    const recentActivity = rawActivity.map(act => ({
      ...act,
      description: act.details || `${act.action} ${act.entity_type || ''} ${act.entity_id ? '#' + act.entity_id : ''}`.trim(),
      date: act.created_at
    }));

    const stats = {
      todaySales,
      totalSales,
      totalCustomers,
      totalProducts,
      totalInvoices,
      totalPurchases: totalPurchasesAmount,
      totalPurchasesCount,
      totalPayments,
      totalExpenses,
      totalDue
    };

    res.json({
      ...stats,
      stats,
      lowStock,
      lowStockProducts: lowStock,
      recentActivity
    });
  } catch (err) {
    console.error('[Dashboard] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics.' });
  }
});

module.exports = router;
