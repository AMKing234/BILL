// ── Input Validators ──

function validateRequired(val, fields) {
  if (Array.isArray(fields)) {
    if (!val || typeof val !== 'object') return false;
    return fields.every(f => {
      const v = val[f];
      return v !== undefined && v !== null && (typeof v === 'string' ? v.trim() !== '' : true);
    });
  }

  if (val === undefined || val === null) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'number') return !isNaN(val);
  return true;
}

function validatePositiveNumber(value) {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
}

function validateNonNegativeNumber(value) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
}

function validateInvoiceItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || !item.product_id) return false;
    const qty = parseFloat(item.quantity);
    if (isNaN(qty) || qty <= 0) return false;
    const priceVal = item.price !== undefined ? item.price : item.purchase_price;
    if (priceVal !== undefined) {
      const price = parseFloat(priceVal);
      if (isNaN(price) || price < 0) return false;
    }
  }
  return true;
}

function validatePaymentMethod(method) {
  if (!method || typeof method !== 'string') return false;
  const valid = ['cash', 'upi', 'bank', 'other', 'due'];
  return valid.includes(method.toLowerCase());
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim();
}

module.exports = {
  validateRequired,
  validatePositiveNumber,
  validateNonNegativeNumber,
  validateInvoiceItems,
  validatePaymentMethod,
  sanitizeString
};
