// ── Formatting Helpers ──

function formatCurrency(amount, symbol = '₹') {
  const num = parseFloat(amount) || 0;
  return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function padNumber(num, width = 6) {
  return String(num).padStart(width, '0');
}

function generateNumber(prefix, num) {
  const cleanPrefix = (prefix || 'INV').replace(/-+$/, '');
  const n = parseInt(num, 10) || 1;
  return `${cleanPrefix}-${padNumber(n)}`;
}

function round2(val) {
  return Math.round((parseFloat(val) || 0) * 100) / 100;
}

function calculateItemTotal(quantity, price, discount = 0, taxRate = 0) {
  const qty = parseFloat(quantity) || 0;
  const prc = parseFloat(price) || 0;
  const disc = parseFloat(discount) || 0;
  const tax = parseFloat(taxRate) || 0;

  const subtotal = round2(qty * prc);
  const discountAmount = round2(disc);
  const taxableAmount = Math.max(0, round2(subtotal - discountAmount));
  const taxAmount = round2(taxableAmount * tax / 100);
  const total = round2(taxableAmount + taxAmount);

  return { subtotal, discountAmount, taxableAmount, taxAmount, total };
}

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function nowDatetime() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

module.exports = {
  formatCurrency,
  padNumber,
  generateNumber,
  round2,
  calculateItemTotal,
  todayDate,
  nowDatetime
};
