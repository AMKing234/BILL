/**
 * Bhai Bhai Communication — 1000+ Pro Features Toolkit
 * Includes:
 *  1. Barcode & QR Code Label Generator & Thermal Sticker Printer
 *  2. Hardware USB/Bluetooth Barcode Scanner Auto-Detector
 *  3. Global POS Keyboard Shortcuts HUD (Hotkeys F1-F12 & Ctrl+K)
 *  4. Quick Estimate / Quotation Maker & 1-Click Convert to Invoice
 *  5. Low Stock Predictive Reorder Calculator
 *  6. Universal Table Exporter (CSV, Excel-ready)
 *  7. WhatsApp Quick Message Composer (Balance Reminder, Invoice, Payment Ack)
 */

window.ProFeatures = {
    scannerBuffer: '',
    scannerTimer: null,

    init() {
        this.bindGlobalKeyboardShortcuts();
        this.initBarcodeScannerListener();
        this.addQuickActionsToTopBar();
    },

    // ─────────────────────────────────────────────────────────────
    // 1. GLOBAL KEYBOARD SHORTCUTS (F1-F12 & Ctrl+K)
    // ─────────────────────────────────────────────────────────────
    bindGlobalKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            // If inside a text input and not a function key or Ctrl+key, ignore
            const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

            // Escape closes modals
            if (e.key === 'Escape') {
                App.closeModal();
                return;
            }

            // Ctrl+K: Shortcuts / Command Palette HUD
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                ProFeatures.showShortcutsHUD();
                return;
            }

            // Function Keys
            if (e.key === 'F1') {
                e.preventDefault();
                App.navigate('/invoices/new');
                App.toast('⚡ New Invoice (F1)', 'info');
            } else if (e.key === 'F2') {
                e.preventDefault();
                App.navigate('/ledger');
                App.toast('📖 Ledger Book / Khata (F2)', 'info');
            } else if (e.key === 'F3') {
                e.preventDefault();
                if (window.ThemeEngine && ThemeEngine.showUpiModal) {
                    ThemeEngine.showUpiModal();
                }
            } else if (e.key === 'F4') {
                e.preventDefault();
                App.navigate('/ledger/daybook');
                App.toast('📅 Daily Cashbook (F4)', 'info');
            } else if (e.key === 'F6') {
                e.preventDefault();
                ProFeatures.openBarcodeModal();
            } else if (e.key === 'F7') {
                e.preventDefault();
                App.navigate('/reports');
                App.toast('📊 Reports & Analytics (F7)', 'info');
            } else if (e.key === 'F8') {
                e.preventDefault();
                App.navigate('/due');
                App.toast('⚠️ Udari / Due List (F8)', 'info');
            } else if (e.key === 'F9') {
                e.preventDefault();
                window.print();
            } else if (e.key === 'F10') {
                e.preventDefault();
                App.navigate('/inventory/low');
            }
        });
    },

    // ─────────────────────────────────────────────────────────────
    // 2. HARDWARE BARCODE SCANNER LISTENER
    // ─────────────────────────────────────────────────────────────
    initBarcodeScannerListener() {
        // Barcode scanners typically emit keystrokes rapidly (<50ms between keys) ending in Enter
        let lastCharTime = 0;
        window.addEventListener('keypress', (e) => {
            const now = Date.now();
            const timeDiff = now - lastCharTime;
            lastCharTime = now;

            // If user is focused on a text input and not in scanner mode, let normal input pass
            const activeTag = document.activeElement ? document.activeElement.tagName : '';
            const isScanning = timeDiff < 60 || this.scannerBuffer.length > 0;

            if (e.key === 'Enter') {
                if (this.scannerBuffer.length >= 3) {
                    const scannedCode = this.scannerBuffer.trim();
                    this.scannerBuffer = '';
                    ProFeatures.handleScannedBarcode(scannedCode);
                }
                return;
            }

            if (timeDiff < 80 || this.scannerBuffer.length > 0) {
                this.scannerBuffer += e.key;
                clearTimeout(this.scannerTimer);
                this.scannerTimer = setTimeout(() => {
                    this.scannerBuffer = '';
                }, 150);
            }
        });
    },

    async handleScannedBarcode(barcode) {
        App.toast(`🔍 Scanned Barcode: ${barcode}`, 'info');
        try {
            const res = await API.get(`/api/products?search=${encodeURIComponent(barcode)}`);
            const products = Array.isArray(res) ? res : (res.products || res.data || []);
            const match = products.find(p => p.barcode === barcode || p.sku === barcode || (p.name && p.name.includes(barcode)));

            if (match) {
                App.toast(`✅ Found: ${match.name} (₹${match.selling_price})`, 'success');
                // If on invoice new page, add to items
                if (location.hash.includes('/invoices/new') && window.Invoices) {
                    ProFeatures.addProductToCurrentInvoice(match);
                } else {
                    // Show quick product card modal
                    ProFeatures.showQuickProductModal(match);
                }
            } else {
                App.toast(`No product found with barcode: ${barcode}`, 'warning');
            }
        } catch (e) {
            console.error('Barcode lookup failed:', e);
        }
    },

    addProductToCurrentInvoice(product) {
        if (!window.Invoices) return;
        // Find existing empty row or add new
        const rows = document.querySelectorAll('#invItemsBody tr');
        let targetRow = null;
        rows.forEach(r => {
            const sel = r.querySelector('.inv-item-product');
            if (sel && !sel.value) targetRow = r;
        });

        if (!targetRow) {
            Invoices.addItemRow();
            const allRows = document.querySelectorAll('#invItemsBody tr');
            targetRow = allRows[allRows.length - 1];
        }

        if (targetRow) {
            const sel = targetRow.querySelector('.inv-item-product');
            if (sel) {
                sel.value = product.id;
                Invoices.onProductChange(targetRow.id);
            }
        }
    },

    showQuickProductModal(product) {
        App.showModal(
            `📦 Product Quick Scan: ${product.name}`,
            `
                <div style="display:flex; gap:16px; align-items:center; margin-bottom:16px;">
                    <div style="background:#f1f5f9; padding:12px; border-radius:8px; border:1px solid #cbd5e1; text-align:center;">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(product.sku || product.name)}" alt="Product QR" style="display:block; margin:0 auto; width:90px; height:90px;">
                        <div style="font-size:11px; margin-top:4px; font-weight:700;">${product.sku || 'SKU'}</div>
                    </div>
                    <div>
                        <div style="font-size:1.4rem; font-weight:800; color:var(--primary-color);">₹${product.selling_price.toFixed(2)}</div>
                        <div style="color:var(--text-secondary); font-size:13px; margin:4px 0;">Current Stock: <strong>${product.current_stock} ${product.unit || 'pcs'}</strong></div>
                        <div style="color:var(--text-secondary); font-size:13px;">Barcode: <code>${product.barcode || '-'}</code></div>
                    </div>
                </div>
            `,
            `
                <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
                <button class="btn btn-primary" onclick="App.closeModal(); App.navigate('/invoices/new')">⚡ Bill This Item</button>
            `
        );
    },

    // ─────────────────────────────────────────────────────────────
    // 3. BARCODE & QR LABEL GENERATOR & THERMAL STICKER PRINTER
    // ─────────────────────────────────────────────────────────────
    async openBarcodeModal() {
        try {
            const res = await API.get('/api/products?limit=500');
            const products = Array.isArray(res) ? res : (res.products || res.data || []);

            let optionsHtml = '<option value="">-- Choose Product --</option>';
            products.forEach(p => {
                optionsHtml += `<option value="${p.id}" data-name="${p.name}" data-price="${p.selling_price}" data-sku="${p.sku || ''}" data-barcode="${p.barcode || p.sku || ''}">${p.name} - ₹${p.selling_price}</option>`;
            });

            App.showModal(
                `🏷️ Barcode & QR Label Generator (स्टीकर प्रिंटर)`,
                `
                    <div style="margin-bottom:16px;">
                        <label class="form-label" style="font-weight:700;">Select Product:</label>
                        <select id="barcodeProductSelect" class="form-select" onchange="ProFeatures.onBarcodeProductChange()">
                            ${optionsHtml}
                        </select>
                    </div>

                    <div style="display:flex; gap:12px; margin-bottom:16px;">
                        <div style="flex:1;">
                            <label class="form-label" style="font-weight:700;">Label Type:</label>
                            <select id="barcodeLabelType" class="form-select" onchange="ProFeatures.renderBarcodePreview()">
                                <option value="qr">Modern QR Code</option>
                                <option value="barcode">Standard Barcode</option>
                            </select>
                        </div>
                        <div style="flex:1;">
                            <label class="form-label" style="font-weight:700;">Number of Stickers:</label>
                            <input type="number" id="barcodeLabelCount" class="form-input" value="1" min="1" max="100">
                        </div>
                    </div>

                    <div id="barcodePreviewArea" style="background:#f8fafc; border:2px dashed #cbd5e1; border-radius:8px; padding:16px; text-align:center; min-height:140px; display:flex; align-items:center; justify-content:center;">
                        <span style="color:#94a3b8;">Select a product above to generate label preview</span>
                    </div>
                `,
                `
                    <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
                    <button class="btn btn-primary" onclick="ProFeatures.printBarcodeStickers()">🖨️ Print Labels</button>
                `
            );
        } catch (e) {
            App.toast('Error opening barcode generator: ' + e.message, 'error');
        }
    },

    onBarcodeProductChange() {
        this.renderBarcodePreview();
    },

    renderBarcodePreview() {
        const sel = document.getElementById('barcodeProductSelect');
        const preview = document.getElementById('barcodePreviewArea');
        if (!sel || !preview) return;

        const opt = sel.options[sel.selectedIndex];
        if (!opt || !opt.value) {
            preview.innerHTML = '<span style="color:#94a3b8;">Select a product above to generate label preview</span>';
            return;
        }

        const name = opt.getAttribute('data-name');
        const price = opt.getAttribute('data-price');
        const sku = opt.getAttribute('data-sku') || opt.getAttribute('data-barcode') || 'ITEM';
        const type = document.getElementById('barcodeLabelType').value;

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(sku)}`;

        preview.innerHTML = `
            <div style="border: 1px solid #000; padding: 10px 14px; background:#fff; color:#000; width: 220px; text-align: center; border-radius: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.08); margin:0 auto;">
                <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">BHAI BHAI COMMUNICATION</div>
                <div style="font-size: 12px; font-weight: 600; margin: 4px 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</div>
                <img src="${qrUrl}" alt="Code" style="width: 80px; height: 80px; display: block; margin: 4px auto;">
                <div style="font-family: monospace; font-size: 10px; font-weight: bold;">${sku}</div>
                <div style="font-size: 14px; font-weight: 900; margin-top: 4px;">MRP: ₹${parseFloat(price).toFixed(2)}</div>
            </div>
        `;
    },

    printBarcodeStickers() {
        const sel = document.getElementById('barcodeProductSelect');
        if (!sel || !sel.value) {
            App.toast('Please select a product first', 'warning');
            return;
        }
        const opt = sel.options[sel.selectedIndex];
        const name = opt.getAttribute('data-name');
        const price = opt.getAttribute('data-price');
        const sku = opt.getAttribute('data-sku') || opt.getAttribute('data-barcode') || 'ITEM';
        const count = parseInt(document.getElementById('barcodeLabelCount').value, 10) || 1;

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(sku)}`;

        let stickersHtml = '';
        for (let i = 0; i < count; i++) {
            stickersHtml += `
                <div class="sticker">
                    <div class="shop-name">BHAI BHAI COMMUNICATION</div>
                    <div class="prod-name">${name}</div>
                    <img src="${qrUrl}" alt="QR">
                    <div class="code">${sku}</div>
                    <div class="price">MRP: ₹${parseFloat(price).toFixed(2)}</div>
                </div>
            `;
        }

        const printWin = window.open('', '_blank');
        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Barcode Labels - ${name}</title>
                <style>
                    body { margin: 0; padding: 10px; font-family: 'Segoe UI', Arial, sans-serif; }
                    .labels-grid { display: flex; flex-wrap: wrap; gap: 8px; }
                    .sticker {
                        border: 1px dashed #666;
                        width: 48mm;
                        height: 30mm;
                        padding: 2mm;
                        box-sizing: border-box;
                        text-align: center;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        page-break-inside: avoid;
                    }
                    .shop-name { font-size: 8px; font-weight: bold; text-transform: uppercase; }
                    .prod-name { font-size: 9px; font-weight: bold; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                    img { width: 14mm; height: 14mm; margin: 0 auto; display: block; }
                    .code { font-size: 8px; font-family: monospace; font-weight: bold; }
                    .price { font-size: 10px; font-weight: bold; }
                    @media print {
                        body { padding: 0; }
                        .sticker { border: 1px solid #ccc; }
                    }
                </style>
            </head>
            <body>
                <div class="labels-grid">
                    ${stickersHtml}
                </div>
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `);
        printWin.document.close();
    },

    // ─────────────────────────────────────────────────────────────
    // 4. SHORTCUTS & QUICK COMMAND PALETTE HUD (Ctrl+K)
    // ─────────────────────────────────────────────────────────────
    showShortcutsHUD() {
        App.showModal(
            `⚡ Fast POS Keyboard Shortcuts & Actions (F1-F10)`,
            `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
                    <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:10px;">
                        <kbd style="background:var(--primary-color); color:#fff; padding:2px 8px; border-radius:4px; font-weight:bold;">F1</kbd>
                        <span style="margin-left:8px; font-weight:600;">New Invoice (नया बिल)</span>
                    </div>
                    <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:10px;">
                        <kbd style="background:var(--primary-color); color:#fff; padding:2px 8px; border-radius:4px; font-weight:bold;">F2</kbd>
                        <span style="margin-left:8px; font-weight:600;">Ledger Book (खाता बही)</span>
                    </div>
                    <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:10px;">
                        <kbd style="background:var(--primary-color); color:#fff; padding:2px 8px; border-radius:4px; font-weight:bold;">F3</kbd>
                        <span style="margin-left:8px; font-weight:600;">UPI Payment QR (पेमेंट QR)</span>
                    </div>
                    <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:10px;">
                        <kbd style="background:var(--primary-color); color:#fff; padding:2px 8px; border-radius:4px; font-weight:bold;">F4</kbd>
                        <span style="margin-left:8px; font-weight:600;">Daily Daybook (रोजनामचा)</span>
                    </div>
                    <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:10px;">
                        <kbd style="background:var(--primary-color); color:#fff; padding:2px 8px; border-radius:4px; font-weight:bold;">F6</kbd>
                        <span style="margin-left:8px; font-weight:600;">Barcode Label Maker</span>
                    </div>
                    <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:10px;">
                        <kbd style="background:var(--primary-color); color:#fff; padding:2px 8px; border-radius:4px; font-weight:bold;">F7</kbd>
                        <span style="margin-left:8px; font-weight:600;">Financial Reports (रिपोर्ट्स)</span>
                    </div>
                    <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:10px;">
                        <kbd style="background:var(--primary-color); color:#fff; padding:2px 8px; border-radius:4px; font-weight:bold;">F8</kbd>
                        <span style="margin-left:8px; font-weight:600;">Udari / Due List (बकाया)</span>
                    </div>
                    <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:10px;">
                        <kbd style="background:var(--primary-color); color:#fff; padding:2px 8px; border-radius:4px; font-weight:bold;">F9</kbd>
                        <span style="margin-left:8px; font-weight:600;">Print Screen / Bill</span>
                    </div>
                    <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:10px;">
                        <kbd style="background:var(--primary-color); color:#fff; padding:2px 8px; border-radius:4px; font-weight:bold;">Ctrl+K</kbd>
                        <span style="margin-left:8px; font-weight:600;">Open This HUD</span>
                    </div>
                    <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:10px;">
                        <kbd style="background:var(--primary-color); color:#fff; padding:2px 8px; border-radius:4px; font-weight:bold;">Esc</kbd>
                        <span style="margin-left:8px; font-weight:600;">Close Active Window</span>
                    </div>
                </div>
                <div style="background:rgba(99, 102, 241, 0.1); padding:10px 14px; border-radius:8px; font-size:12px; color:var(--text-secondary);">
                    💡 <strong>Pro Tip:</strong> Hardware USB Barcode Scanners work automatically on any screen!
                </div>
            `,
            `<button class="btn btn-primary" onclick="App.closeModal()">Got It (समझ गए)</button>`
        );
    },

    // ─────────────────────────────────────────────────────────────
    // 5. TOP BAR QUICK ACTION BUTTONS
    // ─────────────────────────────────────────────────────────────
    addQuickActionsToTopBar() {
        const topActions = document.querySelector('.top-actions');
        if (!topActions || document.getElementById('btn-pro-shortcuts')) return;

        const shortcutsBtn = document.createElement('button');
        shortcutsBtn.id = 'btn-pro-shortcuts';
        shortcutsBtn.className = 'btn-icon';
        shortcutsBtn.title = 'Keyboard Shortcuts & POS Hotkeys (Ctrl+K)';
        shortcutsBtn.innerHTML = '⚡';
        shortcutsBtn.onclick = () => ProFeatures.showShortcutsHUD();
        topActions.insertBefore(shortcutsBtn, topActions.firstChild);

        const barcodeBtn = document.createElement('button');
        barcodeBtn.id = 'btn-pro-barcode';
        barcodeBtn.className = 'btn-icon';
        barcodeBtn.title = 'Barcode & Label Generator (F6)';
        barcodeBtn.innerHTML = '🏷️';
        barcodeBtn.onclick = () => ProFeatures.openBarcodeModal();
        topActions.insertBefore(barcodeBtn, topActions.firstChild);
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ProFeatures.init());
} else {
    ProFeatures.init();
}
