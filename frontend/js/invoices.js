window.Invoices = {
    state: {
        page: 1,
        search: '',
        status: '',
        dateRange: '',
        items: []
    },
    render: function(action) {
        if (action === 'new') {
            return this.renderNew();
        }
        return this.renderList();
    },
    renderList: function() {
        return `
            <div class="page-header">
                <h2>Invoices</h2>
                <div class="page-actions">
                    <a href="#/invoices/new" class="btn btn-primary">New Invoice</a>
                </div>
            </div>
            <div class="toolbar form-row">
                <div class="form-group">
                    <input type="text" id="invoiceSearch" class="form-input search-input" placeholder="Search invoice # or customer...">
                </div>
                <div class="form-group">
                    <select id="invoiceStatusFilter" class="form-select">
                        <option value="">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                <div class="form-group">
                    <input type="date" id="invoiceDateFilter" class="form-input">
                </div>
            </div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Invoice #</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Grand Total</th>
                            <th>Paid</th>
                            <th>Due</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="invoicesTableBody">
                        <tr><td colspan="8" class="empty-state">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="invoicesPagination" class="pagination"></div>
        `;
    },
    renderNew: function() {
        this.state.items = [];
        const today = new Date().toISOString().split('T')[0];
        
        return `
            <div class="page-header">
                <h2>Create Invoice</h2>
                <div class="page-actions">
                    <a href="#/invoices" class="btn btn-secondary">Cancel</a>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Customer *</label>
                            <select id="invCustomer" class="form-select" required>
                                <option value="">Select Customer</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Date *</label>
                            <input type="date" id="invDate" class="form-input" value="${today}" required>
                        </div>
                    </div>
                    
                    <div class="table-responsive" style="margin-top: 15px;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th width="30%">Product</th>
                                    <th width="10%">Quantity</th>
                                    <th width="15%">Price</th>
                                    <th width="10%">Discount</th>
                                    <th width="10%">Tax %</th>
                                    <th width="15%">Total</th>
                                    <th width="10%">Action</th>
                                </tr>
                            </thead>
                            <tbody id="invItemsBody">
                                <!-- Items will go here -->
                            </tbody>
                        </table>
                        <button class="btn btn-sm btn-secondary" style="margin-top: 10px;" onclick="Invoices.addItemRow()">+ Add Item</button>
                    </div>
                    
                    <div class="form-row" style="margin-top: 20px;">
                        <div class="form-group" style="flex: 2;">
                            <label class="form-label">Notes</label>
                            <textarea id="invNotes" class="form-textarea"></textarea>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <div class="stats-grid" style="grid-template-columns: 1fr; gap: 10px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>Subtotal:</strong> <span id="invSubtotal">0.00</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>Total Discount:</strong> <span id="invTotalDiscount">0.00</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>Total Tax:</strong> <span id="invTotalTax">0.00</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 1.2em;">
                                    <strong>Grand Total:</strong> <strong id="invGrandTotal">0.00</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <h3 style="margin-top: 20px;">Payment Details</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Amount Paid</label>
                            <input type="number" step="0.01" id="invAmountPaid" class="form-input" value="0.00" oninput="Invoices.calculateTotals()">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Payment Method</label>
                            <select id="invPaymentMethod" class="form-select">
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="bank">Bank Transfer</option>
                                <option value="other">Other</option>
                                <option value="due">Due (No Payment)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Reference Number</label>
                            <input type="text" id="invReference" class="form-input">
                        </div>
                    </div>
                    
                    <div class="form-actions" style="margin-top: 20px; text-align: right;">
                        <button class="btn btn-primary" id="btnSaveInvoice" onclick="Invoices.saveInvoice()">Save Invoice</button>
                    </div>
                </div>
            </div>
        `;
    },
    init: function(action) {
        if (action === 'new') {
            this.initNew();
        } else {
            this.initList();
        }
    },
    initList: function() {
        this.loadList(this.state.page);

        const searchInput = document.getElementById('invoiceSearch');
        if (searchInput) {
            searchInput.addEventListener('input', App.debounce((e) => {
                this.state.search = e.target.value;
                this.state.page = 1;
                this.loadList(this.state.page);
            }, 300));
        }

        const statusFilter = document.getElementById('invoiceStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.state.status = e.target.value;
                this.state.page = 1;
                this.loadList(this.state.page);
            });
        }
        
        const dateFilter = document.getElementById('invoiceDateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.state.dateRange = e.target.value;
                this.state.page = 1;
                this.loadList(this.state.page);
            });
        }
    },
    async loadList(page = 1) {
        const tbody = document.getElementById('invoicesTableBody');
        const pagination = document.getElementById('invoicesPagination');
        if (!tbody) return;

        try {
            const query = `search=${encodeURIComponent(this.state.search)}&status=${encodeURIComponent(this.state.status)}&date=${encodeURIComponent(this.state.dateRange)}&page=${page}&limit=25`;
            const res = await API.get(`/api/invoices?${query}`);
            const invoices = res.data || res.invoices || [];
            
            if (invoices.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No invoices found.</td></tr>';
                if(pagination) pagination.innerHTML = '';
                return;
            }

            let html = '';
            invoices.forEach(inv => {
                let badge = 'badge-success';
                if (inv.status === 'unpaid') badge = 'badge-danger';
                if (inv.status === 'partial') badge = 'badge-warning';
                if (inv.status === 'cancelled') badge = 'badge-secondary';

                html += `
                    <tr>
                        <td><strong>${inv.invoice_number}</strong></td>
                        <td>${App.formatDate(inv.date)}</td>
                        <td>${inv.customer_name || '-'}</td>
                        <td>${App.currency(inv.grand_total)}</td>
                        <td>${App.currency(inv.paid_amount)}</td>
                        <td>${App.currency(inv.due_amount)}</td>
                        <td><span class="badge ${badge}">${inv.status}</span></td>
                        <td style="white-space: nowrap;">
                            <div style="display:flex; gap:4px; align-items:center;">
                                <button class="btn btn-sm btn-icon" onclick="Invoices.view(${inv.id})" title="View Invoice">👁️ View</button>
                                <button class="btn btn-sm btn-icon" onclick="Invoices.print(${inv.id})" title="Print Full Tax Invoice">🖨️ Print</button>
                                <button class="btn btn-sm btn-icon" onclick="Invoices.printThermal(${inv.id})" title="Thermal POS Slip">🧾 POS</button>
                                <button class="btn btn-sm btn-icon" onclick="Invoices.downloadCSV(${inv.id})" title="Download CSV">📥 CSV</button>
                                <button class="btn btn-sm btn-icon" onclick="Invoices.shareWhatsApp(${inv.id})" title="WhatsApp Bill">📱</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

            if (pagination) {
                const totalPages = (res.pagination && res.pagination.totalPages) || res.totalPages || 1;
                const curPage = (res.pagination && res.pagination.page) || res.page || page;
                pagination.innerHTML = App.paginationHtml(curPage, totalPages, 'Invoices.changePage');
            }
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Error loading invoices.</td></tr>';
            App.toast('Failed to load invoices', 'error');
        }
    },
    changePage: function(page) {
        this.state.page = page;
        this.loadList(this.state.page);
    },
    initNew: async function() {
        try {
            // Load Customers
            const customersRes = await API.get('/api/customers');
            const custSelect = document.getElementById('invCustomer');
            const custList = Array.isArray(customersRes) ? customersRes : (customersRes.customers || customersRes.data || []);
            if (custSelect && custList) {
                custList.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name + (c.phone ? ` (${c.phone})` : '');
                    custSelect.appendChild(opt);
                });
            }

            // Load Products for later use in rows
            const prodRes = await API.get('/api/products?limit=1000');
            this.products = Array.isArray(prodRes) ? prodRes : (prodRes.products || prodRes.data || []);
            
            // Add first initial row
            this.addItemRow();
        } catch (e) {
            App.toast('Error initializing invoice form', 'error');
        }
    },
    addItemRow: function() {
        const tbody = document.getElementById('invItemsBody');
        const rowId = 'row_' + Date.now() + Math.random().toString().substring(2,5);
        
        const tr = document.createElement('tr');
        tr.id = rowId;
        
        let prodOptions = '<option value="">Select Product</option>';
        if (this.products) {
            this.products.forEach(p => {
                prodOptions += `<option value="${p.id}" data-price="${p.selling_price}" data-tax="${p.tax_rate}">${p.name} - ${App.currency(p.selling_price)}</option>`;
            });
        }

        tr.innerHTML = `
            <td>
                <select class="form-select inv-item-product" onchange="Invoices.onProductChange('${rowId}')">
                    ${prodOptions}
                </select>
            </td>
            <td><input type="number" step="0.01" class="form-input inv-item-qty" value="1" min="1" oninput="Invoices.calculateTotals()"></td>
            <td><input type="number" step="0.01" class="form-input inv-item-price" value="0" oninput="Invoices.calculateTotals()"></td>
            <td><input type="number" step="0.01" class="form-input inv-item-discount" value="0" oninput="Invoices.calculateTotals()"></td>
            <td><input type="number" step="0.01" class="form-input inv-item-tax" value="0" oninput="Invoices.calculateTotals()"></td>
            <td><input type="text" class="form-input inv-item-total" value="0.00" readonly></td>
            <td><button class="btn btn-sm btn-danger btn-icon" onclick="Invoices.removeItemRow('${rowId}')">✕</button></td>
        `;
        tbody.appendChild(tr);
        this.calculateTotals();
    },
    removeItemRow: function(rowId) {
        const tr = document.getElementById(rowId);
        if (tr) {
            tr.remove();
            this.calculateTotals();
        }
    },
    onProductChange: function(rowId) {
        const tr = document.getElementById(rowId);
        const sel = tr.querySelector('.inv-item-product');
        const opt = sel.options[sel.selectedIndex];
        if (opt.value) {
            tr.querySelector('.inv-item-price').value = opt.getAttribute('data-price') || 0;
            tr.querySelector('.inv-item-tax').value = opt.getAttribute('data-tax') || 0;
        } else {
            tr.querySelector('.inv-item-price').value = 0;
            tr.querySelector('.inv-item-tax').value = 0;
        }
        this.calculateTotals();
    },
    calculateTotals: function() {
        const tbody = document.getElementById('invItemsBody');
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;
        let grandTotal = 0;

        if (tbody) {
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(tr => {
                const qty = parseFloat(tr.querySelector('.inv-item-qty').value) || 0;
                const price = parseFloat(tr.querySelector('.inv-item-price').value) || 0;
                const discount = parseFloat(tr.querySelector('.inv-item-discount').value) || 0;
                const taxRate = parseFloat(tr.querySelector('.inv-item-tax').value) || 0;

                const rowSub = qty * price;
                const rowDiscount = discount; // assuming absolute discount per row total. Or qty * discount? Let's assume absolute flat discount on row
                const taxable = rowSub - rowDiscount;
                const rowTax = (taxable > 0 ? taxable : 0) * (taxRate / 100);
                const rowTotal = taxable + rowTax;

                tr.querySelector('.inv-item-total').value = rowTotal.toFixed(2);

                subtotal += rowSub;
                totalDiscount += rowDiscount;
                totalTax += rowTax;
                grandTotal += rowTotal;
            });
        }

        document.getElementById('invSubtotal').textContent = App.currency(subtotal);
        document.getElementById('invTotalDiscount').textContent = App.currency(totalDiscount);
        document.getElementById('invTotalTax').textContent = App.currency(totalTax);
        document.getElementById('invGrandTotal').textContent = App.currency(grandTotal);
    },
    saveInvoice: async function() {
        const customer_id = document.getElementById('invCustomer').value;
        if (!customer_id) return App.toast('Please select a customer', 'error');

        const date = document.getElementById('invDate').value;
        const paid = parseFloat(document.getElementById('invAmountPaid').value) || 0;
        const payment_method = document.getElementById('invPaymentMethod').value;
        const reference_number = document.getElementById('invReference').value;
        const notes = document.getElementById('invNotes').value;

        const items = [];
        const tbody = document.getElementById('invItemsBody');
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(tr => {
            const product_id = tr.querySelector('.inv-item-product').value;
            if (product_id) {
                items.push({
                    product_id: product_id,
                    quantity: parseFloat(tr.querySelector('.inv-item-qty').value) || 0,
                    price: parseFloat(tr.querySelector('.inv-item-price').value) || 0,
                    discount: parseFloat(tr.querySelector('.inv-item-discount').value) || 0,
                    tax_rate: parseFloat(tr.querySelector('.inv-item-tax').value) || 0
                });
            }
        });

        if (items.length === 0) return App.toast('Please add at least one valid item', 'error');

        const payload = {
            customer_id,
            date,
            items,
            paid,
            payment_method,
            reference_number,
            notes
        };

        const btn = document.getElementById('btnSaveInvoice');
        try {
            await API.submitOnce(btn, () => API.post('/api/invoices', payload));
            if (window.ThemeEngine && window.ThemeEngine.audio) {
                window.ThemeEngine.audio.playChime();
            }
            App.toast('Invoice created successfully', 'success');
            window.location.hash = '#/invoices';
        } catch (e) {
            App.toast(e.message || 'Failed to create invoice', 'error');
        }
    },
    view: async function(id) {
        try {
            const data = await API.get(`/api/invoices/${id}`);
            const inv = data.invoice;
            const items = data.items;

            let itemsHtml = '';
            items.forEach((item, index) => {
                itemsHtml += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.product_name}</td>
                        <td>${item.quantity}</td>
                        <td>${App.currency(item.price)}</td>
                        <td>${App.currency(item.discount)}</td>
                        <td>${item.tax_rate}%</td>
                        <td>${App.currency(item.total)}</td>
                    </tr>
                `;
            });

            const html = `
                <div class="modal-header">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <h3 style="margin:0;">Invoice ${inv.invoice_number}</h3>
                        <span class="badge badge-primary">${inv.status.toUpperCase()}</span>
                    </div>
                    <button class="btn-icon" onclick="App.closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                        <div>
                            <strong>Billed To:</strong><br>
                            <span style="font-size: 1.1em; font-weight: 700;">${inv.customer_name || 'Cash Customer'}</span><br>
                            ${inv.customer_phone ? `Phone: ${inv.customer_phone}<br>` : ''}
                            Date: ${App.formatDate(inv.date)}
                        </div>
                        <div style="text-align: right;">
                            <strong>Grand Total:</strong> <span style="font-size: 1.2em; font-weight: 800; color: var(--primary-color);">${App.currency(inv.grand_total)}</span><br>
                            <strong>Amount Paid:</strong> ${App.currency(inv.paid_amount)}<br>
                            <strong>Balance Due:</strong> <span style="color: ${inv.due_amount > 0 ? 'var(--danger-color)' : 'var(--success-color)'}; font-weight: 700;">${App.currency(inv.due_amount)}</span>
                        </div>
                    </div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Product</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Discount</th>
                                <th>Tax</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    ${inv.notes ? `<p style="margin-top: 15px;"><strong>Notes:</strong> ${inv.notes}</p>` : ''}
                </div>
                <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-sm" onclick="Invoices.shareWhatsApp(${inv.id})">
                            📱 WhatsApp Bill
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="ThemeEngine.showUpiModal(${inv.grand_total}, '${inv.invoice_number}', '${(inv.customer_name || 'Customer').replace(/'/g, "\\'")}')">
                            ⚡ UPI QR Code
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="Invoices.printThermal(${inv.id})">
                            🧾 Thermal POS Slip
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="Invoices.downloadCSV(${inv.id})">
                            📥 Download CSV
                        </button>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
                        <button class="btn btn-primary" onclick="Invoices.print(${inv.id})">🖨️ Full Bill</button>
                    </div>
                </div>
            `;
            App.showModal(html);
        } catch (e) {
            App.toast('Error loading invoice', 'error');
        }
    },
    shareWhatsApp: async function(id) {
        try {
            const data = await API.get(`/api/invoices/${id}`);
            const inv = data.invoice;
            const items = data.items;
            let itemLines = items.map(i => `• ${i.product_name} x ${i.quantity} = ₹${i.total.toFixed(2)}`).join('\n');
            let msg = `*BHAI BHAI COMMUNICATION*\nInvoice: #${inv.invoice_number}\nDate: ${App.formatDate(inv.date)}\nCustomer: ${inv.customer_name || 'Customer'}\n\n*Items Purchased:*\n${itemLines}\n\n*Grand Total:* ₹${inv.grand_total.toFixed(2)}\n*Amount Paid:* ₹${inv.paid_amount.toFixed(2)}\n*Balance Due:* ₹${inv.due_amount.toFixed(2)}\n\nThank you for choosing Bhai Bhai Communication!`;
            
            const custPhone = inv.customer_phone ? inv.customer_phone.replace(/[^0-9]/g, '') : '';
            const url = `https://wa.me/${custPhone ? '91' + custPhone : ''}?text=${encodeURIComponent(msg)}`;
            window.open(url, '_blank');
        } catch(e) {
            App.toast('Could not generate WhatsApp bill', 'error');
        }
    },
    printThermal: async function(id) {
        try {
            const data = await API.get(`/api/invoices/${id}`);
            const inv = data.invoice;
            const items = data.items;
            
            let itemsHtml = items.map(i => `
                <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                    <span style="flex:2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${i.product_name}</span>
                    <span style="flex:1; text-align:center;">${i.quantity}</span>
                    <span style="flex:1; text-align:right;">${i.total.toFixed(2)}</span>
                </div>
            `).join('');

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>POS Slip #${inv.invoice_number}</title>
                    <style>
                        @page { size: 58mm auto; margin: 0; }
                        body {
                            font-family: 'Courier New', Courier, monospace;
                            width: 58mm;
                            margin: 0 auto;
                            padding: 6px 4px;
                            font-size: 11px;
                            line-height: 1.25;
                            color: #000;
                        }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .divider { border-top: 1px dashed #000; margin: 5px 0; }
                        .bold { font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="text-center bold" style="font-size:13px;">BHAI BHAI COMMUNICATION</div>
                    <div class="text-center" style="font-size:10px;">Mobile & Electronics</div>
                    <div class="divider"></div>
                    <div>Bill #: ${inv.invoice_number}</div>
                    <div>Date: ${inv.date}</div>
                    <div>Customer: ${inv.customer_name || 'Cash Customer'}</div>
                    <div class="divider"></div>
                    <div style="display:flex; justify-content:space-between; font-weight:bold; margin-bottom:3px;">
                        <span style="flex:2;">ITEM</span>
                        <span style="flex:1; text-align:center;">QTY</span>
                        <span style="flex:1; text-align:right;">AMT</span>
                    </div>
                    ${itemsHtml}
                    <div class="divider"></div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>Total:</span>
                        <span class="bold">Rs ${inv.grand_total.toFixed(2)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>Paid:</span>
                        <span>Rs ${inv.paid_amount.toFixed(2)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-weight:bold;">
                        <span>Due:</span>
                        <span>Rs ${inv.due_amount.toFixed(2)}</span>
                    </div>
                    <div class="divider"></div>
                    <div class="text-center" style="font-size:10px; margin-top:4px;">
                        Thank You! Visit Again.<br>
                        Goods once sold cannot be returned.
                    </div>
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch(e) {
            App.toast('Error generating thermal slip', 'error');
        }
    },
    print: async function(id) {
        try {
            const data = await API.get(`/api/invoices/${id}`);
            const inv = data.invoice;
            const items = data.items;

            let bus = { name: 'BHAI BHAI COMMUNICATION', address: 'Mobile & Electronics Store', phone: '' };
            try {
                const busRes = await API.get('/api/settings/business');
                if (busRes && busRes.name) bus = busRes;
            } catch(e) {}
            
            let itemsHtml = '';
            items.forEach((item, index) => {
                itemsHtml += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.product_name}</td>
                        <td>${item.quantity}</td>
                        <td>${item.price.toFixed(2)}</td>
                        <td>${item.discount.toFixed(2)}</td>
                        <td>${item.tax_rate}%</td>
                        <td>${item.total.toFixed(2)}</td>
                    </tr>
                `;
            });

            const _upiCfg = (window.Settings && Settings.getUpiConfig) ? Settings.getUpiConfig() : {};
            const _upiId = _upiCfg.upi_id || 'yourname@upi';
            const _upiPayee = _upiCfg.payee_name || bus.name;
            const _upiCurrency = _upiCfg.currency || 'INR';
            const _showUpiOnInvoice = _upiCfg.upi_id && _upiCfg.show_on_invoice !== false;
            const upiUrl = `upi://pay?pa=${encodeURIComponent(_upiId)}&pn=${encodeURIComponent(_upiPayee)}&am=${inv.grand_total.toFixed(2)}&cu=${_upiCurrency}&tn=${encodeURIComponent('Bill ' + inv.invoice_number)}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(upiUrl)}`;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Invoice ${inv.invoice_number}</title>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; background: #fff; }
                        .invoice-print { max-width: 800px; margin: 0 auto; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
                        .info-section { display: flex; justify-content: space-between; margin-bottom: 24px; background: #f8fafc; padding: 12px 16px; border-radius: 6px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
                        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
                        th { background-color: #f1f5f9; font-weight: 700; }
                        .totals { width: 45%; margin-left: auto; }
                        .totals table { border: none; }
                        .totals th, .totals td { border: none; padding: 4px 8px; }
                        .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; display: flex; justify-content: space-between; align-items: center; }
                        @media print {
                            body { -webkit-print-color-adjust: exact; padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="invoice-print">
                        <div class="header">
                            <div>
                                <h1 style="margin:0; font-size: 22px; color: #0f172a;">${bus.name.toUpperCase()}</h1>
                                <p style="margin: 2px 0; font-size: 13px; color: #64748b;">${bus.address || 'Retail & Electronics'}</p>
                                ${bus.phone ? `<p style="margin: 2px 0; font-size: 13px; color: #64748b;">Phone: ${bus.phone}</p>` : ''}
                            </div>
                            <div style="text-align: right;">
                                <h2 style="margin:0; color: #4f46e5; font-size: 20px;">TAX INVOICE</h2>
                                <h3 style="margin:4px 0 0 0; font-size: 16px;">#${inv.invoice_number}</h3>
                                <div style="font-size: 13px; color: #64748b;">Date: ${App.formatDate(inv.date)}</div>
                            </div>
                        </div>

                        <div class="info-section">
                            <div>
                                <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Billed To</strong><br>
                                <strong style="font-size: 15px;">${inv.customer_name || 'Cash Customer'}</strong>
                                ${inv.customer_phone ? `<br><span style="font-size: 13px;">Phone: ${inv.customer_phone}</span>` : ''}
                            </div>
                            <div style="text-align: right;">
                                <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Payment Status</strong><br>
                                <span style="font-weight: 700; text-transform: uppercase; color: ${inv.status === 'paid' ? '#059669' : '#dc2626'};">${inv.status}</span>
                            </div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Product / Description</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Discount</th>
                                    <th>Tax%</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>

                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            ${_showUpiOnInvoice ? `<div style="text-align: center; border: 1px dashed #cbd5e1; padding: 10px 14px; border-radius: 8px;">
                                <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px;">⚡ SCAN & PAY VIA UPI</div>
                                <img src="${qrUrl}" alt="Scan & Pay" style="width: 100px; height: 100px; display: block; margin: 0 auto;">
                                <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${_upiPayee}</div>
                            </div>` : '<div></div>'}

                            <div class="totals">
                                <table>
                                    <tr><th>Subtotal:</th><td>${App.currency(inv.subtotal)}</td></tr>
                                    <tr><th>Discount:</th><td>${App.currency(inv.total_discount)}</td></tr>
                                    <tr><th>Tax:</th><td>${App.currency(inv.total_tax)}</td></tr>
                                    <tr style="font-size: 1.15em; font-weight: 800; border-top: 2px solid #0f172a;"><th>Grand Total:</th><td><strong>${App.currency(inv.grand_total)}</strong></td></tr>
                                    <tr><th>Amount Paid:</th><td>${App.currency(inv.paid_amount)}</td></tr>
                                    <tr style="color: ${inv.due_amount > 0 ? '#dc2626' : '#059669'};"><th>Balance Due:</th><td><strong>${App.currency(inv.due_amount)}</strong></td></tr>
                                </table>
                            </div>
                        </div>

                        ${inv.notes ? `<p style="margin-top: 20px; font-size: 13px;"><strong>Notes:</strong> ${inv.notes}</p>` : ''}

                        <div class="footer">
                            <div style="font-size: 12px; color: #64748b;">
                                Thank you for your business!<br>
                                Computer generated tax invoice.
                            </div>
                            <div style="text-align: right;">
                                <p style="margin: 0 0 25px 0; font-size: 12px; color: #64748b;">For ${bus.name}</p>
                                <p style="margin: 0; font-weight: 700; border-top: 1px solid #333; padding-top: 4px;">Authorized Signatory</p>
                            </div>
                        </div>
                    </div>
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (e) {
            App.toast('Error generating print layout', 'error');
        }
    },
    downloadCSV: async function(id) {
        try {
            const data = await API.get(`/api/invoices/${id}`);
            const inv = data.invoice;
            const items = data.items;

            const csvRows = [
                ['Invoice Number', inv.invoice_number],
                ['Date', inv.date],
                ['Customer Name', `"${inv.customer_name || 'Cash Customer'}"`],
                ['Status', inv.status],
                ['Payment Method', inv.payment_method || 'Cash'],
                [''],
                ['#', 'Product Name', 'Quantity', 'Unit Price', 'Discount', 'Tax Rate %', 'Total Amount']
            ];

            items.forEach((item, index) => {
                csvRows.push([
                    index + 1,
                    `"${item.product_name.replace(/"/g, '""')}"`,
                    item.quantity,
                    item.price.toFixed(2),
                    item.discount.toFixed(2),
                    item.tax_rate,
                    item.total.toFixed(2)
                ]);
            });

            csvRows.push(['']);
            csvRows.push(['Subtotal', '', '', '', '', '', inv.subtotal.toFixed(2)]);
            csvRows.push(['Discount', '', '', '', '', '', inv.total_discount.toFixed(2)]);
            csvRows.push(['Tax', '', '', '', '', '', inv.total_tax.toFixed(2)]);
            csvRows.push(['Grand Total', '', '', '', '', '', inv.grand_total.toFixed(2)]);
            csvRows.push(['Paid Amount', '', '', '', '', '', inv.paid_amount.toFixed(2)]);
            csvRows.push(['Due Amount', '', '', '', '', '', inv.due_amount.toFixed(2)]);

            const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(r => r.join(',')).join('\n');
            const link = document.createElement('a');
            link.setAttribute('href', encodeURI(csvContent));
            link.setAttribute('download', `Invoice_${inv.invoice_number}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            App.toast(`Invoice #${inv.invoice_number} exported to CSV`, 'success');
        } catch (e) {
            App.toast('Failed to download invoice CSV', 'error');
        }
    },
    exportTableCSV: async function() {
        try {
            const res = await API.get('/api/invoices?limit=1000');
            const invoices = res.data || res.invoices || [];
            if (invoices.length === 0) {
                App.toast('No invoices to export', 'warning');
                return;
            }
            const csvRows = [
                ['Invoice Number', 'Date', 'Customer Name', 'Grand Total', 'Paid', 'Due', 'Status', 'Payment Method']
            ];
            invoices.forEach(inv => {
                csvRows.push([
                    `"${inv.invoice_number}"`,
                    inv.date,
                    `"${(inv.customer_name || 'Cash Customer').replace(/"/g, '""')}"`,
                    inv.grand_total.toFixed(2),
                    (inv.paid_amount || 0).toFixed(2),
                    (inv.due_amount || 0).toFixed(2),
                    inv.status,
                    inv.payment_method || 'Cash'
                ]);
            });
            const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(r => r.join(',')).join('\n');
            const link = document.createElement('a');
            link.setAttribute('href', encodeURI(csvContent));
            link.setAttribute('download', `Invoices_Export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            App.toast('All invoices exported to CSV', 'success');
        } catch(e) {
            App.toast('Failed to export invoices', 'error');
        }
    }
};
