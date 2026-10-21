const express = require('express');
const router = express.Router();
const { db } = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { round2 } = require('../utils/helpers');

router.get('/sales', requireAuth, (req, res) => {
  try {
    const { from, to } = req.query;
    let dateFilter = '';
    const params = [];
    if (from && to) {
      dateFilter = `AND date BETWEEN ? AND ?`;
      params.push(from, to);
    }
    
    const summary = db.prepare(`
      SELECT COUNT(*) as invoice_count,
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(discount), 0) as total_discount 
      FROM invoices WHERE status != 'cancelled' ${dateFilter}
    `).get(...params);
    
    const by_date = db.prepare(`
      SELECT date, COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total 
      FROM invoices WHERE status != 'cancelled' ${dateFilter}
      GROUP BY date ORDER BY date DESC
    `).all(...params);

    const items = db.prepare(`
      SELECT i.id, i.date, i.invoice_number as number, c.name as party_name, i.grand_total as total, i.paid, i.due, i.status
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.status != 'cancelled' ${dateFilter}
      ORDER BY i.date DESC, i.id DESC LIMIT 100
    `).all(...params);

    res.json({
      summary,
      by_date,
      items,
      total: summary.total_sales,
      count: summary.invoice_count
    });
  } catch (err) {
    console.error('[Reports] Error generating sales report:', err.message);
    res.status(500).json({ error: 'Failed to generate sales report.' });
  }
});

router.get('/purchases', requireAuth, (req, res) => {
  try {
    const { from, to } = req.query;
    let dateFilter = '';
    const params = [];
    if (from && to) {
      dateFilter = `AND date BETWEEN ? AND ?`;
      params.push(from, to);
    }
    
    const summary = db.prepare(`
      SELECT COUNT(*) as purchase_count,
        COALESCE(SUM(grand_total), 0) as total_purchases,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(discount), 0) as total_discount
      FROM purchases WHERE status != 'cancelled' ${dateFilter}
    `).get(...params);

    const items = db.prepare(`
      SELECT p.id, p.date, p.purchase_number as number, s.name as party_name, p.grand_total as total, p.paid, p.due, p.status
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.status != 'cancelled' ${dateFilter}
      ORDER BY p.date DESC, p.id DESC LIMIT 100
    `).all(...params);
    
    res.json({
      summary,
      items,
      total: summary.total_purchases,
      count: summary.purchase_count
    });
  } catch (err) {
    console.error('[Reports] Error generating purchase report:', err.message);
    res.status(500).json({ error: 'Failed to generate purchase report.' });
  }
});

router.get('/expenses', requireAuth, (req, res) => {
  try {
    const { from, to } = req.query;
    let filter = '';
    const params = [];
    if (from && to) {
      filter = `WHERE e.date BETWEEN ? AND ?`;
      params.push(from, to);
    }
    
    const summary = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses e ${filter}
    `).get(...params);
    
    const by_category = db.prepare(`
      SELECT COALESCE(c.name, 'Uncategorized') as name, COALESCE(SUM(e.amount), 0) as total 
      FROM expenses e 
      LEFT JOIN categories c ON e.category_id = c.id
      ${filter}
      GROUP BY e.category_id ORDER BY total DESC
    `).all(...params);

    const items = db.prepare(`
      SELECT e.id, e.date, COALESCE(c.name, 'Uncategorized') as category, e.description, e.payment_method, e.amount as total
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      ${filter}
      ORDER BY e.date DESC, e.id DESC LIMIT 100
    `).all(...params);

    res.json({ summary, by_category, items, total: summary.total_expenses, count: items.length });
  } catch (err) {
    console.error('[Reports] Error generating expense report:', err.message);
    res.status(500).json({ error: 'Failed to generate expense report.' });
  }
});

router.get('/payments', requireAuth, (req, res) => {
  try {
    const { from, to } = req.query;
    let filter = '';
    const params = [];
    if (from && to) {
      filter = `WHERE p.date BETWEEN ? AND ?`;
      params.push(from, to);
    }
    
    const by_method = db.prepare(`
      SELECT method, COALESCE(SUM(amount), 0) as total, COUNT(*) as count 
      FROM payments p ${filter}
      GROUP BY method
    `).all(...params);

    const items = db.prepare(`
      SELECT p.id, p.date, c.name as customer_name, i.invoice_number, p.amount as total, p.method, p.reference_number
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      ${filter}
      ORDER BY p.date DESC, p.id DESC LIMIT 100
    `).all(...params);

    const total = items.reduce((sum, p) => sum + p.total, 0);
    
    res.json({ by_method, items, total, count: items.length });
  } catch (err) {
    console.error('[Reports] Error generating payment report:', err.message);
    res.status(500).json({ error: 'Failed to generate payment report.' });
  }
});

router.get('/due', requireAuth, (req, res) => {
  try {
    const customers = db.prepare(`
      SELECT c.id, c.id as customer_id, c.name, c.name as customer_name, c.phone,
        COALESCE((SELECT SUM(due) FROM invoices WHERE customer_id = c.id AND status != 'cancelled'), 0) as total_due,
        COALESCE((SELECT SUM(grand_total) FROM invoices WHERE customer_id = c.id AND status != 'cancelled'), 0) as total_sales,
        COALESCE((SELECT SUM(paid) FROM invoices WHERE customer_id = c.id AND status != 'cancelled'), 0) as total_paid
      FROM customers c
      WHERE (SELECT COALESCE(SUM(due), 0) FROM invoices WHERE customer_id = c.id AND status != 'cancelled') > 0
      ORDER BY total_due DESC
    `).all();
    
    res.json({ customers, data: customers, items: customers });
  } catch (err) {
    console.error('[Reports] Error generating due report:', err.message);
    res.status(500).json({ error: 'Failed to generate due report.' });
  }
});

router.get('/customers', requireAuth, (req, res) => {
  try {
    const { from, to } = req.query;
    let dateFilter = '';
    const params = [];
    if (from && to) {
      dateFilter = `AND i.date BETWEEN ? AND ?`;
      params.push(from, to);
    }
    
    const customers = db.prepare(`
      SELECT c.id, c.name, COALESCE(SUM(i.grand_total), 0) as total_sales, COUNT(i.id) as invoice_count,
        COALESCE(SUM(i.due), 0) as outstanding_due
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.status != 'cancelled' ${dateFilter}
      GROUP BY c.id
      ORDER BY total_sales DESC
      LIMIT 50
    `).all(...params);
    
    res.json({ customers, data: customers });
  } catch (err) {
    console.error('[Reports] Error generating customers report:', err.message);
    res.status(500).json({ error: 'Failed to generate customers report.' });
  }
});

router.get('/products', requireAuth, (req, res) => {
  try {
    const { from, to } = req.query;
    let dateJoinFilter = '';
    const params = [];
    if (from && to) {
      dateJoinFilter = `AND i.date BETWEEN ? AND ?`;
      params.push(from, to);
    }
    
    const products = db.prepare(`
      SELECT p.id, p.name, p.sku, COALESCE(SUM(ii.quantity), 0) as qty_sold, COALESCE(SUM(ii.total), 0) as total_revenue
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      JOIN products p ON ii.product_id = p.id
      WHERE i.status != 'cancelled' ${dateJoinFilter}
      GROUP BY p.id
      ORDER BY qty_sold DESC
      LIMIT 50
    `).all(...params);
    
    res.json({ products, data: products });
  } catch (err) {
    console.error('[Reports] Error generating products report:', err.message);
    res.status(500).json({ error: 'Failed to generate products report.' });
  }
});

router.get('/inventory', requireAuth, (req, res) => {
  try {
    const valuation = db.prepare(`
      SELECT p.id, p.name, p.sku, p.current_stock, p.purchase_price, p.selling_price,
        (p.current_stock * p.purchase_price) as valuation
      FROM products p
      WHERE p.current_stock > 0 AND p.active = 1
      ORDER BY valuation DESC
    `).all();
    
    const total_valuation = valuation.reduce((sum, p) => sum + (p.valuation || 0), 0);
    
    res.json({ valuation, data: valuation, total_valuation });
  } catch (err) {
    console.error('[Reports] Error generating inventory report:', err.message);
    res.status(500).json({ error: 'Failed to generate inventory report.' });
  }
});

router.get('/profit', requireAuth, (req, res) => {
  try {
    const { from, to } = req.query;
    let filterI = '', filterP = '', filterE = '', filterSR = '', filterPR = '';
    const dateParams = [];
    if (from && to) {
      filterI = `AND date BETWEEN ? AND ?`;
      filterP = `AND date BETWEEN ? AND ?`;
      filterE = `WHERE date BETWEEN ? AND ?`;
      filterSR = `WHERE date BETWEEN ? AND ?`;
      filterPR = `WHERE date BETWEEN ? AND ?`;
      dateParams.push(from, to);
    }
    
    const total_sales = db.prepare(`SELECT COALESCE(SUM(grand_total), 0) as total FROM invoices WHERE status != 'cancelled' ${filterI}`).get(...dateParams).total;
    const total_purchases = db.prepare(`SELECT COALESCE(SUM(grand_total), 0) as total FROM purchases WHERE status != 'cancelled' ${filterP}`).get(...dateParams).total;
    const total_expenses = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses ${filterE}`).get(...dateParams).total;
    const sales_returns = db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM sales_returns ${filterSR}`).get(...dateParams).total;
    const purchase_returns = db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM purchase_returns ${filterPR}`).get(...dateParams).total;
    
    const net_sales = round2(total_sales - sales_returns);
    const net_purchases = round2(total_purchases - purchase_returns);
    const net_profit = round2(net_sales - net_purchases - total_expenses);
    
    res.json({
      total_sales,
      sales_returns,
      net_sales,
      total_purchases,
      purchase_returns,
      net_purchases,
      total_expenses,
      net_profit
    });
  } catch (err) {
    console.error('[Reports] Error generating profit report:', err.message);
    res.status(500).json({ error: 'Failed to generate profit report.' });
  }
});

router.get('/tax', requireAuth, (req, res) => {
  try {
    const { from, to } = req.query;
    let filterI = '', filterP = '';
    const dateParams = [];
    if (from && to) {
      filterI = `AND date BETWEEN ? AND ?`;
      filterP = `AND date BETWEEN ? AND ?`;
      dateParams.push(from, to);
    }
    
    const tax_collected = db.prepare(`SELECT COALESCE(SUM(tax_amount), 0) as total FROM invoices WHERE status != 'cancelled' ${filterI}`).get(...dateParams).total;
    const tax_paid = db.prepare(`SELECT COALESCE(SUM(tax_amount), 0) as total FROM purchases WHERE status != 'cancelled' ${filterP}`).get(...dateParams).total;
    
    res.json({ tax_collected, tax_paid, net_tax: round2(tax_collected - tax_paid) });
  } catch (err) {
    console.error('[Reports] Error generating tax report:', err.message);
    res.status(500).json({ error: 'Failed to generate tax report.' });
  }
});

module.exports = router;
