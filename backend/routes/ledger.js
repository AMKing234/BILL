const express = require('express');
const router = express.Router();
const { db } = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { round2, todayDate } = require('../utils/helpers');

/**
 * GET /api/ledger/customers
 * Summary list of all customers with their ledger balance (Udari / Bakaya)
 */
router.get('/customers', requireAuth, (req, res) => {
  try {
    const { search = '', filter = 'all' } = req.query;
    let query = `
      SELECT 
        c.id, c.name, c.phone, c.email, c.address,
        COALESCE((SELECT SUM(grand_total) FROM invoices WHERE customer_id = c.id AND status != 'cancelled'), 0) as total_sales,
        COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = c.id), 0) as total_paid,
        COALESCE((SELECT SUM(total) FROM sales_returns WHERE customer_id = c.id), 0) as total_returns,
        (
          COALESCE((SELECT SUM(grand_total) FROM invoices WHERE customer_id = c.id AND status != 'cancelled'), 0)
          - COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = c.id), 0)
          - COALESCE((SELECT SUM(total) FROM sales_returns WHERE customer_id = c.id), 0)
        ) as current_balance,
        (SELECT MAX(date) FROM invoices WHERE customer_id = c.id AND status != 'cancelled') as last_invoice_date,
        (SELECT MAX(date) FROM payments WHERE customer_id = c.id) as last_payment_date
      FROM customers c
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (c.name LIKE ? OR c.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (filter === 'due') {
      query += ` AND (
        COALESCE((SELECT SUM(grand_total) FROM invoices WHERE customer_id = c.id AND status != 'cancelled'), 0)
        - COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = c.id), 0)
        - COALESCE((SELECT SUM(total) FROM sales_returns WHERE customer_id = c.id), 0)
      ) > 0`;
    } else if (filter === 'advance') {
      query += ` AND (
        COALESCE((SELECT SUM(grand_total) FROM invoices WHERE customer_id = c.id AND status != 'cancelled'), 0)
        - COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = c.id), 0)
        - COALESCE((SELECT SUM(total) FROM sales_returns WHERE customer_id = c.id), 0)
      ) < 0`;
    } else if (filter === 'clear') {
      query += ` AND (
        COALESCE((SELECT SUM(grand_total) FROM invoices WHERE customer_id = c.id AND status != 'cancelled'), 0)
        - COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = c.id), 0)
        - COALESCE((SELECT SUM(total) FROM sales_returns WHERE customer_id = c.id), 0)
      ) = 0`;
    }

    query += ` ORDER BY current_balance DESC, c.name ASC`;
    const customers = db.prepare(query).all(...params);

    const totalReceivable = customers.reduce((sum, c) => sum + (c.current_balance > 0 ? c.current_balance : 0), 0);
    const totalAdvance = customers.reduce((sum, c) => sum + (c.current_balance < 0 ? Math.abs(c.current_balance) : 0), 0);

    res.json({
      customers,
      total_receivable: round2(totalReceivable),
      total_advance: round2(totalAdvance),
      count: customers.length
    });
  } catch (err) {
    console.error('[Ledger] Error fetching customers ledger summary:', err.message);
    res.status(500).json({ error: 'Failed to fetch customer ledger summary.' });
  }
});

/**
 * GET /api/ledger/customer/:id
 * Full chronological ledger statement for a customer
 */
router.get('/customer/:id', requireAuth, (req, res) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    const { from = '', to = '' } = req.query;

    const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // 1. Calculate Opening Balance before `from` date if a date filter is applied
    let openingBalance = 0;
    if (from) {
      const priorInvoices = db.prepare(`
        SELECT COALESCE(SUM(grand_total), 0) as total FROM invoices 
        WHERE customer_id = ? AND status != 'cancelled' AND date < ?
      `).get(customerId, from).total;

      const priorPayments = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM payments 
        WHERE customer_id = ? AND date < ?
      `).get(customerId, from).total;

      const priorReturns = db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total FROM sales_returns 
        WHERE customer_id = ? AND date < ?
      `).get(customerId, from).total;

      openingBalance = round2(priorInvoices - priorPayments - priorReturns);
    }

    // 2. Fetch all Invoices in period
    let invQuery = `SELECT id, date, invoice_number as ref_no, 'INVOICE' as type, grand_total as debit, 0 as credit, notes, created_at FROM invoices WHERE customer_id = ? AND status != 'cancelled'`;
    const invParams = [customerId];
    if (from) { invQuery += ` AND date >= ?`; invParams.push(from); }
    if (to) { invQuery += ` AND date <= ?`; invParams.push(to); }
    const invoices = db.prepare(invQuery).all(...invParams);

    // 3. Fetch all Payments in period
    let payQuery = `SELECT id, date, 'PAY-' || printf('%06d', id) as ref_no, 'PAYMENT' as type, 0 as debit, amount as credit, method, reference_number, notes, created_at FROM payments WHERE customer_id = ?`;
    const payParams = [customerId];
    if (from) { payQuery += ` AND date >= ?`; payParams.push(from); }
    if (to) { payQuery += ` AND date <= ?`; payParams.push(to); }
    const payments = db.prepare(payQuery).all(...payParams);

    // 4. Fetch all Sales Returns in period
    let retQuery = `SELECT id, date, COALESCE(return_number, 'RET-' || printf('%06d', id)) as ref_no, 'RETURN' as type, 0 as debit, total as credit, reason as notes, created_at FROM sales_returns WHERE customer_id = ?`;
    const retParams = [customerId];
    if (from) { retQuery += ` AND date >= ?`; retParams.push(from); }
    if (to) { retQuery += ` AND date <= ?`; retParams.push(to); }
    const returns = db.prepare(retQuery).all(...retParams);

    // 5. Combine and sort all transactions chronologically
    const allEntries = [];

    invoices.forEach(i => {
      allEntries.push({
        id: i.id,
        date: i.date,
        type: 'INVOICE',
        badge: 'badge-primary',
        label: 'Sale Invoice',
        ref_no: i.ref_no,
        description: `Tax Invoice #${i.ref_no}` + (i.notes ? ` - ${i.notes}` : ''),
        debit: round2(i.debit),
        credit: 0,
        sort_key: `${i.date}_1_${i.id}`
      });
    });

    payments.forEach(p => {
      const methodLabel = p.method ? p.method.toUpperCase() : 'CASH';
      const refDetail = p.reference_number ? ` (Ref: ${p.reference_number})` : '';
      allEntries.push({
        id: p.id,
        date: p.date,
        type: 'PAYMENT',
        badge: 'badge-success',
        label: `Payment (${methodLabel})`,
        ref_no: p.ref_no,
        description: `Payment Received via ${methodLabel}${refDetail}` + (p.notes ? ` - ${p.notes}` : ''),
        debit: 0,
        credit: round2(p.credit),
        sort_key: `${p.date}_2_${p.id}`
      });
    });

    returns.forEach(r => {
      allEntries.push({
        id: r.id,
        date: r.date,
        type: 'RETURN',
        badge: 'badge-warning',
        label: 'Sales Return',
        ref_no: r.ref_no,
        description: `Sales Return Credit Note #${r.ref_no}` + (r.notes ? ` - ${r.notes}` : ''),
        debit: 0,
        credit: round2(r.credit),
        sort_key: `${r.date}_3_${r.id}`
      });
    });

    // Sort ascending by date and entry type
    allEntries.sort((a, b) => a.sort_key.localeCompare(b.sort_key));

    // 6. Compute running balance
    let currentRunning = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    const ledgerRows = allEntries.map(entry => {
      currentRunning = round2(currentRunning + entry.debit - entry.credit);
      totalDebit = round2(totalDebit + entry.debit);
      totalCredit = round2(totalCredit + entry.credit);

      return {
        ...entry,
        running_balance: currentRunning,
        balance_type: currentRunning > 0 ? 'Dr (Due)' : currentRunning < 0 ? 'Cr (Advance)' : 'Nil'
      };
    });

    const closingBalance = currentRunning;

    res.json({
      customer,
      period: { from: from || 'All Time', to: to || 'Present' },
      opening_balance: openingBalance,
      opening_type: openingBalance > 0 ? 'Dr (Due)' : openingBalance < 0 ? 'Cr (Advance)' : 'Nil',
      entries: ledgerRows,
      summary: {
        total_debit: totalDebit,
        total_credit: totalCredit,
        closing_balance: closingBalance,
        closing_type: closingBalance > 0 ? 'Dr (Due)' : closingBalance < 0 ? 'Cr (Advance)' : 'Nil',
        count: ledgerRows.length
      }
    });
  } catch (err) {
    console.error('[Ledger] Error generating customer ledger:', err.message);
    res.status(500).json({ error: 'Failed to generate customer ledger.' });
  }
});

/**
 * GET /api/ledger/suppliers
 * Summary list of all suppliers with their payable balance
 */
router.get('/suppliers', requireAuth, (req, res) => {
  try {
    const { search = '' } = req.query;
    let query = `
      SELECT 
        s.id, s.name, s.phone, s.email, s.gstin,
        COALESCE((SELECT SUM(grand_total) FROM purchases WHERE supplier_id = s.id AND status != 'cancelled'), 0) as total_purchases,
        COALESCE((SELECT SUM(paid) FROM purchases WHERE supplier_id = s.id AND status != 'cancelled'), 0) as total_paid,
        COALESCE((SELECT SUM(total) FROM purchase_returns WHERE supplier_id = s.id), 0) as total_returns,
        (
          COALESCE((SELECT SUM(grand_total) FROM purchases WHERE supplier_id = s.id AND status != 'cancelled'), 0)
          - COALESCE((SELECT SUM(paid) FROM purchases WHERE supplier_id = s.id AND status != 'cancelled'), 0)
          - COALESCE((SELECT SUM(total) FROM purchase_returns WHERE supplier_id = s.id), 0)
        ) as current_balance
      FROM suppliers s
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      query += ` AND (s.name LIKE ? OR s.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ` ORDER BY current_balance DESC, s.name ASC`;
    const suppliers = db.prepare(query).all(...params);

    const totalPayable = suppliers.reduce((sum, s) => sum + (s.current_balance > 0 ? s.current_balance : 0), 0);

    res.json({
      suppliers,
      total_payable: round2(totalPayable),
      count: suppliers.length
    });
  } catch (err) {
    console.error('[Ledger] Error fetching supplier ledger summary:', err.message);
    res.status(500).json({ error: 'Failed to fetch supplier ledger summary.' });
  }
});

/**
 * GET /api/ledger/supplier/:id
 * Full chronological ledger statement for a supplier
 */
router.get('/supplier/:id', requireAuth, (req, res) => {
  try {
    const supplierId = parseInt(req.params.id, 10);
    const { from = '', to = '' } = req.query;

    const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(supplierId);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    // 1. Calculate opening balance before `from` date
    let openingBalance = 0;
    if (from) {
      const priorPurchases = db.prepare(`
        SELECT COALESCE(SUM(grand_total), 0) as total FROM purchases 
        WHERE supplier_id = ? AND status != 'cancelled' AND date < ?
      `).get(supplierId, from).total;

      const priorPaid = db.prepare(`
        SELECT COALESCE(SUM(paid), 0) as total FROM purchases 
        WHERE supplier_id = ? AND status != 'cancelled' AND date < ?
      `).get(supplierId, from).total;

      const priorReturns = db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total FROM purchase_returns 
        WHERE supplier_id = ? AND date < ?
      `).get(supplierId, from).total;

      openingBalance = round2(priorPurchases - priorPaid - priorReturns);
    }

    // 2. Fetch Purchases
    let purQuery = `SELECT id, date, purchase_number as ref_no, 'PURCHASE' as type, grand_total as credit, paid as debit, notes FROM purchases WHERE supplier_id = ? AND status != 'cancelled'`;
    const purParams = [supplierId];
    if (from) { purQuery += ` AND date >= ?`; purParams.push(from); }
    if (to) { purQuery += ` AND date <= ?`; purParams.push(to); }
    const purchases = db.prepare(purQuery).all(...purParams);

    // 3. Fetch Purchase Returns
    let retQuery = `SELECT id, date, COALESCE(return_number, 'PRET-' || printf('%06d', id)) as ref_no, 'RETURN' as type, total as debit, 0 as credit, reason as notes FROM purchase_returns WHERE supplier_id = ?`;
    const retParams = [supplierId];
    if (from) { retQuery += ` AND date >= ?`; retParams.push(from); }
    if (to) { retQuery += ` AND date <= ?`; retParams.push(to); }
    const returns = db.prepare(retQuery).all(...retParams);

    const allEntries = [];

    purchases.forEach(p => {
      allEntries.push({
        id: p.id,
        date: p.date,
        type: 'PURCHASE',
        badge: 'badge-primary',
        label: 'Purchase Bill',
        ref_no: p.ref_no,
        description: `Purchase Bill #${p.ref_no}` + (p.notes ? ` - ${p.notes}` : ''),
        credit: round2(p.credit), // Amount we owe
        debit: round2(p.debit),   // Amount paid at purchase
        sort_key: `${p.date}_1_${p.id}`
      });
    });

    returns.forEach(r => {
      allEntries.push({
        id: r.id,
        date: r.date,
        type: 'PURCHASE_RETURN',
        badge: 'badge-warning',
        label: 'Purchase Return',
        ref_no: r.ref_no,
        description: `Debit Note #${r.ref_no}` + (r.notes ? ` - ${r.notes}` : ''),
        credit: 0,
        debit: round2(r.debit),
        sort_key: `${r.date}_2_${r.id}`
      });
    });

    allEntries.sort((a, b) => a.sort_key.localeCompare(b.sort_key));

    let currentRunning = openingBalance;
    let totalCredit = 0; // purchases
    let totalDebit = 0;  // paid / returns

    const ledgerRows = allEntries.map(entry => {
      currentRunning = round2(currentRunning + entry.credit - entry.debit);
      totalCredit = round2(totalCredit + entry.credit);
      totalDebit = round2(totalDebit + entry.debit);

      return {
        ...entry,
        running_balance: currentRunning,
        balance_type: currentRunning > 0 ? 'Cr (Payable)' : currentRunning < 0 ? 'Dr (Advance)' : 'Nil'
      };
    });

    res.json({
      supplier,
      period: { from: from || 'All Time', to: to || 'Present' },
      opening_balance: openingBalance,
      entries: ledgerRows,
      summary: {
        total_purchases: totalCredit,
        total_paid_and_returns: totalDebit,
        closing_balance: currentRunning,
        closing_type: currentRunning > 0 ? 'Cr (Payable)' : currentRunning < 0 ? 'Dr (Advance)' : 'Nil'
      }
    });
  } catch (err) {
    console.error('[Ledger] Error generating supplier ledger:', err.message);
    res.status(500).json({ error: 'Failed to generate supplier ledger.' });
  }
});

/**
 * GET /api/ledger/daybook
 * Daily Cashbook / Daybook (Rojnamcha) with cash & digital in/out flows
 */
router.get('/daybook', requireAuth, (req, res) => {
  try {
    const targetDate = req.query.date || todayDate();

    // 1. Receipts (Inflow) - Payments received from customers
    const receipts = db.prepare(`
      SELECT 
        p.id, p.date, p.method, p.amount, p.reference_number, p.notes,
        'PAY-' || printf('%06d', p.id) as ref_no,
        c.name as party_name,
        i.invoice_number
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE p.date = ?
      ORDER BY p.id ASC
    `).all(targetDate);

    // 2. Outflow - Expenses
    const expenses = db.prepare(`
      SELECT 
        e.id, e.date, e.payment_method as method, e.amount, e.description,
        'EXP-' || printf('%06d', e.id) as ref_no,
        c.name as category_name
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.date = ?
      ORDER BY e.id ASC
    `).all(targetDate);

    // 3. Outflow - Purchases paid on this date
    const purchasesPaid = db.prepare(`
      SELECT 
        p.id, p.date, p.payment_method as method, p.paid as amount, p.notes,
        p.purchase_number as ref_no,
        s.name as party_name
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.date = ? AND p.paid > 0
      ORDER BY p.id ASC
    `).all(targetDate);

    let cashIn = 0;
    let upiIn = 0;
    let cardIn = 0;
    let bankIn = 0;

    receipts.forEach(r => {
      const m = (r.method || 'cash').toLowerCase();
      if (m === 'cash') cashIn += r.amount;
      else if (m === 'upi') upiIn += r.amount;
      else if (m === 'card') cardIn += r.amount;
      else bankIn += r.amount;
    });

    let cashOut = 0;
    let upiOut = 0;
    let otherOut = 0;

    expenses.forEach(e => {
      const m = (e.method || 'cash').toLowerCase();
      if (m === 'cash') cashOut += e.amount;
      else if (m === 'upi') upiOut += e.amount;
      else otherOut += e.amount;
    });

    purchasesPaid.forEach(p => {
      const m = (p.method || 'cash').toLowerCase();
      if (m === 'cash') cashOut += p.amount;
      else if (m === 'upi') upiOut += p.amount;
      else otherOut += p.amount;
    });

    const totalInflow = round2(cashIn + upiIn + cardIn + bankIn);
    const totalOutflow = round2(cashOut + upiOut + otherOut);
    const netCashflow = round2(totalInflow - totalOutflow);

    res.json({
      date: targetDate,
      inflows: {
        receipts,
        cash: round2(cashIn),
        upi: round2(upiIn),
        card: round2(cardIn),
        bank: round2(bankIn),
        total: totalInflow
      },
      outflows: {
        expenses,
        purchases: purchasesPaid,
        cash: round2(cashOut),
        upi: round2(upiOut),
        other: round2(otherOut),
        total: totalOutflow
      },
      summary: {
        total_inflow: totalInflow,
        total_outflow: totalOutflow,
        net_flow: netCashflow,
        cash_balance: round2(cashIn - cashOut)
      }
    });
  } catch (err) {
    console.error('[Ledger] Error generating daybook:', err.message);
    res.status(500).json({ error: 'Failed to generate daybook.' });
  }
});

module.exports = router;
