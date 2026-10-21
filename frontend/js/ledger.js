/**
 * Bhai Bhai Communication — Ledger Book (Khata Bahi) Module
 * Handles:
 *  - Customer Ledger (Grahak Khata) with Running Balance & Statement
 *  - Supplier Ledger (Vyapari Khata)
 *  - Daily Cashbook / Daybook (Rojnamcha)
 *  - Print (A4 & Thermal), Download (CSV & HTML/PDF), View, WhatsApp Sharing
 */

window.Ledger = {
    state: {
        activeTab: 'customer', // 'customer' | 'supplier' | 'daybook'
        customerId: null,
        supplierId: null,
        from: '',
        to: '',
        daybookDate: '',
        search: '',
        filter: 'all',
        customerData: null,
        supplierData: null,
        daybookData: null,
        customersList: [],
        suppliersList: []
    },

    render() {
        return `
            <div class="ledger-container">
                <!-- Page Header -->
                <div class="page-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom: 20px;">
                    <div>
                        <h2 style="margin:0; font-size:1.6rem; font-weight:800; display:flex; align-items:center; gap:8px;">
                            <span>📖</span> Ledger Book / खता बही
                        </h2>
                        <p style="margin:4px 0 0 0; color:var(--text-secondary); font-size:0.875rem;">
                            Complete Party Accounts, Running Balances, Daybook & Statement Generator
                        </p>
                    </div>
                    <div class="page-actions" style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn btn-secondary btn-sm" onclick="Ledger.refreshCurrent()">
                            🔄 Refresh
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="Ledger.printCurrent()">
                            🖨️ Print
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="Ledger.exportCSV()">
                            📥 Export CSV
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="App.navigate('/payments')">
                            + Record Payment
                        </button>
                    </div>
                </div>

                <!-- Navigation Tabs -->
                <div class="tabs" style="margin-bottom: 20px; display:flex; gap:8px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                    <button class="tab-item ${this.state.activeTab === 'customer' ? 'active' : ''}" onclick="Ledger.switchTab('customer')">
                        👤 Customer Khata (ग्राहक खाता)
                    </button>
                    <button class="tab-item ${this.state.activeTab === 'supplier' ? 'active' : ''}" onclick="Ledger.switchTab('supplier')">
                        🏢 Supplier Khata (सप्लायर खाता)
                    </button>
                    <button class="tab-item ${this.state.activeTab === 'daybook' ? 'active' : ''}" onclick="Ledger.switchTab('daybook')">
                        📅 Daily Cashbook / Daybook (रोजनामचा)
                    </button>
                </div>

                <!-- Dynamic Content Container -->
                <div id="ledger-tab-content">
                    <div class="text-center p-4">Loading Ledger...</div>
                </div>
            </div>
        `;
    },

    async init(action) {
        // Set default date range to current month
        const today = new Date();
        this.state.to = today.toISOString().split('T')[0];
        this.state.daybookDate = this.state.to;
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        this.state.from = firstDay.toISOString().split('T')[0];

        if (action === 'supplier') {
            this.state.activeTab = 'supplier';
        } else if (action === 'daybook') {
            this.state.activeTab = 'daybook';
        } else {
            this.state.activeTab = 'customer';
        }

        await this.loadPartyLists();
        this.renderTabContent();
    },

    async loadPartyLists() {
        try {
            const [custRes, suppRes] = await Promise.all([
                API.get('/api/customers'),
                API.get('/api/suppliers')
            ]);
            this.state.customersList = Array.isArray(custRes) ? custRes : (custRes.customers || custRes.data || []);
            this.state.suppliersList = Array.isArray(suppRes) ? suppRes : (suppRes.suppliers || suppRes.data || []);
        } catch (e) {
            console.error('Error loading party lists:', e);
        }
    },

    switchTab(tab) {
        this.state.activeTab = tab;
        document.querySelectorAll('.ledger-container .tab-item').forEach(b => {
            b.classList.toggle('active', b.textContent.toLowerCase().includes(tab));
        });
        this.renderTabContent();
    },

    renderTabContent() {
        const container = document.getElementById('ledger-tab-content');
        if (!container) return;

        if (this.state.activeTab === 'customer') {
            this.renderCustomerView(container);
        } else if (this.state.activeTab === 'supplier') {
            this.renderSupplierView(container);
        } else if (this.state.activeTab === 'daybook') {
            this.renderDaybookView(container);
        }
    },

    // ─────────────────────────────────────────────────────────────
    // 1. CUSTOMER LEDGER VIEW
    // ─────────────────────────────────────────────────────────────
    async renderCustomerView(container) {
        let custOptions = '<option value="">-- All Customers Overview (सभी ग्राहक) --</option>';
        this.state.customersList.forEach(c => {
            const selected = (this.state.customerId && this.state.customerId == c.id) ? 'selected' : '';
            custOptions += `<option value="${c.id}" ${selected}>${c.name} ${c.phone ? `(${c.phone})` : ''}</option>`;
        });

        container.innerHTML = `
            <!-- Filter Toolbar -->
            <div class="card mb-4" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; padding:16px;">
                <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:flex-end;">
                    <div style="flex:2; min-width:220px;">
                        <label class="form-label" style="font-weight:600; font-size:12px;">SELECT CUSTOMER (ग्राहक चुनें)</label>
                        <select id="ledgerCustSelect" class="form-select" onchange="Ledger.onCustomerSelect(this.value)">
                            ${custOptions}
                        </select>
                    </div>
                    <div style="flex:1; min-width:140px;">
                        <label class="form-label" style="font-weight:600; font-size:12px;">FROM DATE</label>
                        <input type="date" id="ledgerCustFrom" class="form-input" value="${this.state.from}" onchange="Ledger.onDateChange()">
                    </div>
                    <div style="flex:1; min-width:140px;">
                        <label class="form-label" style="font-weight:600; font-size:12px;">TO DATE</label>
                        <input type="date" id="ledgerCustTo" class="form-input" value="${this.state.to}" onchange="Ledger.onDateChange()">
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        <button class="btn btn-secondary btn-sm" onclick="Ledger.setDatePreset('today')">Today</button>
                        <button class="btn btn-secondary btn-sm" onclick="Ledger.setDatePreset('month')">This Month</button>
                        <button class="btn btn-secondary btn-sm" onclick="Ledger.setDatePreset('all')">All Time</button>
                        <button class="btn btn-primary btn-sm" onclick="Ledger.loadCustomerLedger()">🔍 Filter</button>
                    </div>
                </div>
            </div>

            <div id="customer-ledger-display">
                <div class="text-center p-4">Loading customer data...</div>
            </div>
        `;

        if (this.state.customerId) {
            this.loadCustomerLedger();
        } else {
            this.loadAllCustomersSummary();
        }
    },

    onCustomerSelect(val) {
        this.state.customerId = val ? parseInt(val, 10) : null;
        if (this.state.customerId) {
            this.loadCustomerLedger();
        } else {
            this.loadAllCustomersSummary();
        }
    },

    setDatePreset(preset) {
        const today = new Date();
        const toStr = today.toISOString().split('T')[0];
        this.state.to = toStr;

        if (preset === 'today') {
            this.state.from = toStr;
        } else if (preset === 'month') {
            const first = new Date(today.getFullYear(), today.getMonth(), 1);
            this.state.from = first.toISOString().split('T')[0];
        } else if (preset === 'all') {
            this.state.from = '';
        }

        const fromEl = document.getElementById('ledgerCustFrom');
        const toEl = document.getElementById('ledgerCustTo');
        if (fromEl) fromEl.value = this.state.from;
        if (toEl) toEl.value = this.state.to;

        if (this.state.customerId) this.loadCustomerLedger();
    },

    onDateChange() {
        const fromEl = document.getElementById('ledgerCustFrom');
        const toEl = document.getElementById('ledgerCustTo');
        if (fromEl) this.state.from = fromEl.value;
        if (toEl) this.state.to = toEl.value;
    },

    async loadAllCustomersSummary() {
        const display = document.getElementById('customer-ledger-display');
        if (!display) return;
        display.innerHTML = '<div class="text-center p-4">Loading all customers ledger...</div>';

        try {
            const res = await API.get('/api/ledger/customers');
            this.state.customerData = res;
            const customers = res.customers || [];

            let rowsHtml = '';
            customers.forEach(c => {
                const bal = c.current_balance || 0;
                let balBadge = '<span class="badge badge-secondary">Nil</span>';
                if (bal > 0) balBadge = `<span class="badge badge-danger">₹${bal.toFixed(2)} Dr (Due)</span>`;
                else if (bal < 0) balBadge = `<span class="badge badge-success">₹${Math.abs(bal).toFixed(2)} Cr (Adv)</span>`;

                rowsHtml += `
                    <tr>
                        <td>
                            <strong><a href="javascript:void(0)" onclick="Ledger.viewCustomer(${c.id})" style="color:var(--primary-color);">${c.name}</a></strong>
                            ${c.address ? `<div style="font-size:11px; color:var(--text-secondary);">${c.address}</div>` : ''}
                        </td>
                        <td>${c.phone ? `<a href="tel:${c.phone}">${c.phone}</a>` : '-'}</td>
                        <td style="text-align:right;">₹${(c.total_sales || 0).toFixed(2)}</td>
                        <td style="text-align:right;">₹${(c.total_paid || 0).toFixed(2)}</td>
                        <td style="text-align:right;">₹${(c.total_returns || 0).toFixed(2)}</td>
                        <td style="text-align:right;">${balBadge}</td>
                        <td style="text-align:center;">${c.last_invoice_date ? App.formatDate(c.last_invoice_date) : '-'}</td>
                        <td style="text-align:center;">
                            <div style="display:flex; gap:4px; justify-content:center;">
                                <button class="btn btn-sm btn-secondary" onclick="Ledger.viewCustomer(${c.id})" title="View Full Ledger">
                                    📖 Khata
                                </button>
                                ${bal > 0 ? `
                                    <button class="btn btn-sm btn-success" onclick="Ledger.quickReceivePayment(${c.id}, ${bal})" title="Receive Payment">
                                        💰 Receive
                                    </button>
                                    <button class="btn btn-sm btn-secondary" onclick="Ledger.shareCustomerWhatsApp(${c.id})" title="WhatsApp Balance Reminder">
                                        📱 WhatsApp
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            });

            if (customers.length === 0) {
                rowsHtml = '<tr><td colspan="8" class="empty-state">No customer accounts found.</td></tr>';
            }

            display.innerHTML = `
                <!-- Stats Overview -->
                <div class="stats-grid mb-4" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
                    <div class="stat-card card p-3" style="background:var(--card-bg); border-left:4px solid var(--danger-color);">
                        <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">TOTAL MARKET DUE (कुल उधारी)</div>
                        <div style="font-size:1.8rem; font-weight:800; color:var(--danger-color); margin-top:4px;">
                            ₹${(res.total_receivable || 0).toFixed(2)}
                        </div>
                        <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">Outstanding Receivable</div>
                    </div>
                    <div class="stat-card card p-3" style="background:var(--card-bg); border-left:4px solid var(--success-color);">
                        <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">CUSTOMER ADVANCE (अग्रिम जमा)</div>
                        <div style="font-size:1.8rem; font-weight:800; color:var(--success-color); margin-top:4px;">
                            ₹${(res.total_advance || 0).toFixed(2)}
                        </div>
                        <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">Credit Held with Us</div>
                    </div>
                    <div class="stat-card card p-3" style="background:var(--card-bg); border-left:4px solid var(--primary-color);">
                        <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">ACTIVE ACCOUNTS (खाता संख्या)</div>
                        <div style="font-size:1.8rem; font-weight:800; color:var(--primary-color); margin-top:4px;">
                            ${res.count || 0}
                        </div>
                        <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">Registered Customers</div>
                    </div>
                </div>

                <!-- Table Header with Search -->
                <div class="card" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; overflow:hidden;">
                    <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid var(--border-color);">
                        <h3 style="margin:0; font-size:1.1rem; font-weight:700;">Customer Balances Summary (सभी ग्राहक उधारी)</h3>
                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-sm btn-secondary" onclick="Ledger.printSummaryTable()">🖨️ Print List</button>
                            <button class="btn btn-sm btn-secondary" onclick="Ledger.exportSummaryCSV()">📥 Export CSV</button>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="data-table" id="customerSummaryTable">
                            <thead>
                                <tr>
                                    <th>Customer Name</th>
                                    <th>Phone</th>
                                    <th style="text-align:right;">Total Sales</th>
                                    <th style="text-align:right;">Total Paid</th>
                                    <th style="text-align:right;">Returns</th>
                                    <th style="text-align:right;">Net Balance</th>
                                    <th style="text-align:center;">Last Active</th>
                                    <th style="text-align:center;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (e) {
            display.innerHTML = `<div class="empty-state">Error loading customer summary: ${e.message}</div>`;
        }
    },

    viewCustomer(id) {
        this.state.customerId = id;
        const sel = document.getElementById('ledgerCustSelect');
        if (sel) sel.value = id;
        this.loadCustomerLedger();
    },

    async loadCustomerLedger() {
        const id = this.state.customerId;
        if (!id) {
            this.loadAllCustomersSummary();
            return;
        }

        const display = document.getElementById('customer-ledger-display');
        if (!display) return;
        display.innerHTML = '<div class="text-center p-4">Loading customer account statement...</div>';

        try {
            const query = `from=${encodeURIComponent(this.state.from)}&to=${encodeURIComponent(this.state.to)}`;
            const res = await API.get(`/api/ledger/customer/${id}?${query}`);
            this.state.customerData = res;
            const cust = res.customer;
            const summary = res.summary;
            const entries = res.entries || [];

            let rowsHtml = '';
            // Opening balance row
            rowsHtml += `
                <tr style="background:rgba(255,255,255,0.03); font-weight:600;">
                    <td>${this.state.from || 'Opening'}</td>
                    <td><span class="badge badge-secondary">OPENING</span></td>
                    <td>-</td>
                    <td>Opening Balance Brought Forward (प्रारंभिक शेष)</td>
                    <td style="text-align:right;">${res.opening_balance > 0 ? '₹' + res.opening_balance.toFixed(2) : '-'}</td>
                    <td style="text-align:right;">${res.opening_balance < 0 ? '₹' + Math.abs(res.opening_balance).toFixed(2) : '-'}</td>
                    <td style="text-align:right; font-weight:700;">₹${Math.abs(res.opening_balance).toFixed(2)}</td>
                    <td style="text-align:center;"><span class="badge ${res.opening_balance > 0 ? 'badge-danger' : res.opening_balance < 0 ? 'badge-success' : 'badge-secondary'}">${res.opening_type}</span></td>
                    <td style="text-align:center;">-</td>
                </tr>
            `;

            entries.forEach(e => {
                const isDebit = e.debit > 0;
                const isCredit = e.credit > 0;
                const runVal = Math.abs(e.running_balance).toFixed(2);

                rowsHtml += `
                    <tr>
                        <td>${App.formatDate(e.date)}</td>
                        <td><span class="badge ${e.badge}">${e.label}</span></td>
                        <td><strong>${e.ref_no}</strong></td>
                        <td>${e.description}</td>
                        <td style="text-align:right; color:var(--danger-color); font-weight:600;">
                            ${isDebit ? '₹' + e.debit.toFixed(2) : '-'}
                        </td>
                        <td style="text-align:right; color:var(--success-color); font-weight:600;">
                            ${isCredit ? '₹' + e.credit.toFixed(2) : '-'}
                        </td>
                        <td style="text-align:right; font-weight:800;">
                            ₹${runVal}
                        </td>
                        <td style="text-align:center;">
                            <span class="badge ${e.running_balance > 0 ? 'badge-danger' : e.running_balance < 0 ? 'badge-success' : 'badge-secondary'}">
                                ${e.balance_type}
                            </span>
                        </td>
                        <td style="text-align:center;">
                            ${e.type === 'INVOICE' ? `
                                <button class="btn btn-sm btn-icon" onclick="Invoices.view(${e.id})" title="View Invoice">👁️</button>
                                <button class="btn btn-sm btn-icon" onclick="Invoices.print(${e.id})" title="Print Invoice">🖨️</button>
                            ` : e.type === 'PAYMENT' ? `
                                <button class="btn btn-sm btn-icon" onclick="Ledger.printPaymentReceipt(${e.id})" title="Print Receipt">🧾</button>
                            ` : '-'}
                        </td>
                    </tr>
                `;
            });

            const closingVal = summary.closing_balance || 0;

            display.innerHTML = `
                <!-- Customer Details Banner -->
                <div class="card mb-4" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; padding:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
                        <div>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <h3 style="margin:0; font-size:1.4rem; font-weight:800;">${cust.name}</h3>
                                <span class="badge ${closingVal > 0 ? 'badge-danger' : closingVal < 0 ? 'badge-success' : 'badge-secondary'}" style="font-size:0.85rem; padding:4px 10px;">
                                    ${closingVal > 0 ? `₹${closingVal.toFixed(2)} DUE (उधारी)` : closingVal < 0 ? `₹${Math.abs(closingVal).toFixed(2)} ADVANCE (जमा)` : 'ALL SETTLED'}
                                </span>
                            </div>
                            <div style="color:var(--text-secondary); font-size:13px; margin-top:4px; display:flex; gap:16px; flex-wrap:wrap;">
                                ${cust.phone ? `<span>📞 <strong>${cust.phone}</strong></span>` : ''}
                                ${cust.email ? `<span>✉️ ${cust.email}</span>` : ''}
                                ${cust.address ? `<span>📍 ${cust.address}</span>` : ''}
                            </div>
                        </div>

                        <!-- Actions for this customer -->
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            <button class="btn btn-primary" onclick="Ledger.quickReceivePayment(${cust.id}, ${closingVal})">
                                💰 Receive Payment
                            </button>
                            <button class="btn btn-secondary" onclick="Ledger.printCustomerStatement(${cust.id})">
                                🖨️ Print Statement (A4)
                            </button>
                            <button class="btn btn-secondary" onclick="Ledger.shareCustomerWhatsApp(${cust.id})">
                                📱 WhatsApp Statement
                            </button>
                            <button class="btn btn-secondary" onclick="Ledger.downloadCustomerCSV(${cust.id})">
                                📥 Download CSV
                            </button>
                            <button class="btn btn-secondary" onclick="Ledger.viewCustomerSummary()">
                                ⬅️ Back to All
                            </button>
                        </div>
                    </div>

                    <!-- Period Summary Chips -->
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-top:16px; padding-top:16px; border-top:1px solid var(--border-color);">
                        <div>
                            <div style="font-size:11px; color:var(--text-secondary); font-weight:700;">PERIOD OPENING</div>
                            <div style="font-size:1.15rem; font-weight:700;">₹${Math.abs(res.opening_balance).toFixed(2)} <span style="font-size:12px; color:var(--text-secondary);">${res.opening_type}</span></div>
                        </div>
                        <div>
                            <div style="font-size:11px; color:var(--text-secondary); font-weight:700;">TOTAL DEBIT (Purchased)</div>
                            <div style="font-size:1.15rem; font-weight:700; color:var(--danger-color);">₹${summary.total_debit.toFixed(2)}</div>
                        </div>
                        <div>
                            <div style="font-size:11px; color:var(--text-secondary); font-weight:700;">TOTAL CREDIT (Paid/Returned)</div>
                            <div style="font-size:1.15rem; font-weight:700; color:var(--success-color);">₹${summary.total_credit.toFixed(2)}</div>
                        </div>
                        <div>
                            <div style="font-size:11px; color:var(--text-secondary); font-weight:700;">NET CLOSING BALANCE (वर्तमान शेष)</div>
                            <div style="font-size:1.3rem; font-weight:800; color:${closingVal > 0 ? 'var(--danger-color)' : closingVal < 0 ? 'var(--success-color)' : 'var(--primary-color)'};">
                                ₹${Math.abs(closingVal).toFixed(2)} ${summary.closing_type}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Ledger Statement Table -->
                <div class="card" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; overflow:hidden;">
                    <div class="table-responsive">
                        <table class="data-table" id="customerLedgerTable">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Ref / Bill #</th>
                                    <th>Particulars (विवरण)</th>
                                    <th style="text-align:right;">Debit (+Dr)</th>
                                    <th style="text-align:right;">Credit (-Cr)</th>
                                    <th style="text-align:right;">Running Bal</th>
                                    <th style="text-align:center;">Status</th>
                                    <th style="text-align:center;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                            <tfoot style="border-top:2px solid var(--border-color); font-weight:800; background:rgba(0,0,0,0.1);">
                                <tr>
                                    <td colspan="4" style="text-align:right;">TOTALS FOR PERIOD:</td>
                                    <td style="text-align:right; color:var(--danger-color);">₹${summary.total_debit.toFixed(2)}</td>
                                    <td style="text-align:right; color:var(--success-color);">₹${summary.total_credit.toFixed(2)}</td>
                                    <td style="text-align:right; font-size:1.1em;">₹${Math.abs(closingVal).toFixed(2)}</td>
                                    <td style="text-align:center;">${summary.closing_type}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        } catch (e) {
            display.innerHTML = `<div class="empty-state">Error generating customer statement: ${e.message}</div>`;
        }
    },

    viewCustomerSummary() {
        this.state.customerId = null;
        const sel = document.getElementById('ledgerCustSelect');
        if (sel) sel.value = '';
        this.loadAllCustomersSummary();
    },

    // ─────────────────────────────────────────────────────────────
    // 2. SUPPLIER LEDGER VIEW
    // ─────────────────────────────────────────────────────────────
    async renderSupplierView(container) {
        let suppOptions = '<option value="">-- All Suppliers Overview (सभी सप्लायर) --</option>';
        this.state.suppliersList.forEach(s => {
            const selected = (this.state.supplierId && this.state.supplierId == s.id) ? 'selected' : '';
            suppOptions += `<option value="${s.id}" ${selected}>${s.name} ${s.phone ? `(${s.phone})` : ''}</option>`;
        });

        container.innerHTML = `
            <div class="card mb-4" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; padding:16px;">
                <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:flex-end;">
                    <div style="flex:2; min-width:220px;">
                        <label class="form-label" style="font-weight:600; font-size:12px;">SELECT SUPPLIER (सप्लायर चुनें)</label>
                        <select id="ledgerSuppSelect" class="form-select" onchange="Ledger.onSupplierSelect(this.value)">
                            ${suppOptions}
                        </select>
                    </div>
                    <div style="flex:1; min-width:140px;">
                        <label class="form-label" style="font-weight:600; font-size:12px;">FROM DATE</label>
                        <input type="date" id="ledgerSuppFrom" class="form-input" value="${this.state.from}">
                    </div>
                    <div style="flex:1; min-width:140px;">
                        <label class="form-label" style="font-weight:600; font-size:12px;">TO DATE</label>
                        <input type="date" id="ledgerSuppTo" class="form-input" value="${this.state.to}">
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button class="btn btn-primary btn-sm" onclick="Ledger.loadSupplierLedger()">🔍 Filter</button>
                    </div>
                </div>
            </div>

            <div id="supplier-ledger-display">
                <div class="text-center p-4">Loading supplier data...</div>
            </div>
        `;

        if (this.state.supplierId) {
            this.loadSupplierLedger();
        } else {
            this.loadAllSuppliersSummary();
        }
    },

    onSupplierSelect(val) {
        this.state.supplierId = val ? parseInt(val, 10) : null;
        if (this.state.supplierId) {
            this.loadSupplierLedger();
        } else {
            this.loadAllSuppliersSummary();
        }
    },

    async loadAllSuppliersSummary() {
        const display = document.getElementById('supplier-ledger-display');
        if (!display) return;

        try {
            const res = await API.get('/api/ledger/suppliers');
            this.state.supplierData = res;
            const suppliers = res.suppliers || [];

            let rowsHtml = '';
            suppliers.forEach(s => {
                const bal = s.current_balance || 0;
                rowsHtml += `
                    <tr>
                        <td><strong><a href="javascript:void(0)" onclick="Ledger.viewSupplier(${s.id})" style="color:var(--primary-color);">${s.name}</a></strong></td>
                        <td>${s.phone || '-'}</td>
                        <td>${s.gstin || '-'}</td>
                        <td style="text-align:right;">₹${(s.total_purchases || 0).toFixed(2)}</td>
                        <td style="text-align:right;">₹${(s.total_paid || 0).toFixed(2)}</td>
                        <td style="text-align:right;">₹${(s.total_returns || 0).toFixed(2)}</td>
                        <td style="text-align:right; font-weight:700; color:${bal > 0 ? 'var(--danger-color)' : 'var(--success-color)'};">
                            ₹${bal.toFixed(2)} ${bal > 0 ? 'Cr (Payable)' : 'Nil'}
                        </td>
                        <td style="text-align:center;">
                            <button class="btn btn-sm btn-secondary" onclick="Ledger.viewSupplier(${s.id})">📖 Khata</button>
                        </td>
                    </tr>
                `;
            });

            if (suppliers.length === 0) {
                rowsHtml = '<tr><td colspan="8" class="empty-state">No suppliers registered.</td></tr>';
            }

            display.innerHTML = `
                <div class="stats-grid mb-4" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
                    <div class="stat-card card p-3" style="background:var(--card-bg); border-left:4px solid var(--warning-color);">
                        <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">TOTAL SUPPLIER PAYABLE (सप्लायर देनदारी)</div>
                        <div style="font-size:1.8rem; font-weight:800; color:var(--warning-color); margin-top:4px;">
                            ₹${(res.total_payable || 0).toFixed(2)}
                        </div>
                        <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">Amount to Pay Suppliers</div>
                    </div>
                    <div class="stat-card card p-3" style="background:var(--card-bg); border-left:4px solid var(--primary-color);">
                        <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">REGISTERED VENDORS</div>
                        <div style="font-size:1.8rem; font-weight:800; color:var(--primary-color); margin-top:4px;">
                            ${res.count || 0}
                        </div>
                    </div>
                </div>

                <div class="card" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; overflow:hidden;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Supplier Name</th>
                                <th>Phone</th>
                                <th>GSTIN</th>
                                <th style="text-align:right;">Purchases</th>
                                <th style="text-align:right;">Paid</th>
                                <th style="text-align:right;">Returns</th>
                                <th style="text-align:right;">Net Payable</th>
                                <th style="text-align:center;">Action</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>
            `;
        } catch (e) {
            display.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
        }
    },

    viewSupplier(id) {
        this.state.supplierId = id;
        const sel = document.getElementById('ledgerSuppSelect');
        if (sel) sel.value = id;
        this.loadSupplierLedger();
    },

    async loadSupplierLedger() {
        const id = this.state.supplierId;
        if (!id) {
            this.loadAllSuppliersSummary();
            return;
        }

        const display = document.getElementById('supplier-ledger-display');
        if (!display) return;
        display.innerHTML = '<div class="text-center p-4">Loading supplier statement...</div>';

        try {
            const fromEl = document.getElementById('ledgerSuppFrom');
            const toEl = document.getElementById('ledgerSuppTo');
            const fVal = fromEl ? fromEl.value : this.state.from;
            const tVal = toEl ? toEl.value : this.state.to;

            const res = await API.get(`/api/ledger/supplier/${id}?from=${encodeURIComponent(fVal)}&to=${encodeURIComponent(tVal)}`);
            this.state.supplierData = res;
            const supp = res.supplier;
            const summary = res.summary;
            const entries = res.entries || [];

            let rowsHtml = '';
            entries.forEach(e => {
                rowsHtml += `
                    <tr>
                        <td>${App.formatDate(e.date)}</td>
                        <td><span class="badge ${e.badge}">${e.label}</span></td>
                        <td><strong>${e.ref_no}</strong></td>
                        <td>${e.description}</td>
                        <td style="text-align:right; color:var(--danger-color); font-weight:600;">₹${e.credit.toFixed(2)}</td>
                        <td style="text-align:right; color:var(--success-color); font-weight:600;">₹${e.debit.toFixed(2)}</td>
                        <td style="text-align:right; font-weight:800;">₹${Math.abs(e.running_balance).toFixed(2)}</td>
                        <td style="text-align:center;"><span class="badge ${e.running_balance > 0 ? 'badge-danger' : 'badge-success'}">${e.balance_type}</span></td>
                    </tr>
                `;
            });

            if (entries.length === 0) {
                rowsHtml = '<tr><td colspan="8" class="empty-state">No transaction records found in this date range.</td></tr>';
            }

            display.innerHTML = `
                <div class="card mb-4" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; padding:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
                        <div>
                            <h3 style="margin:0; font-size:1.4rem; font-weight:800;">${supp.name}</h3>
                            <div style="color:var(--text-secondary); font-size:13px; margin-top:4px;">
                                ${supp.phone ? `📞 ${supp.phone} ` : ''}
                                ${supp.gstin ? `| GSTIN: ${supp.gstin} ` : ''}
                                ${supp.address ? `| 📍 ${supp.address}` : ''}
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-secondary" onclick="Ledger.printSupplierStatement(${supp.id})">🖨️ Print Statement</button>
                            <button class="btn btn-secondary" onclick="Ledger.onSupplierSelect('')">⬅️ Back to All</button>
                        </div>
                    </div>
                </div>

                <div class="card" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; overflow:hidden;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Ref #</th>
                                <th>Particulars</th>
                                <th style="text-align:right;">Purchase (+Cr)</th>
                                <th style="text-align:right;">Paid (-Dr)</th>
                                <th style="text-align:right;">Running Balance</th>
                                <th style="text-align:center;">Status</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>
            `;
        } catch (e) {
            display.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
        }
    },

    // ─────────────────────────────────────────────────────────────
    // 3. DAILY CASHBOOK / DAYBOOK VIEW (रोजनामचा)
    // ─────────────────────────────────────────────────────────────
    async renderDaybookView(container) {
        container.innerHTML = `
            <div class="card mb-4" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; padding:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <label class="form-label" style="font-weight:700; margin:0;">SELECT DATE (तारीख):</label>
                        <input type="date" id="daybookDatePicker" class="form-input" value="${this.state.daybookDate}" onchange="Ledger.onDaybookDateChange(this.value)">
                        <button class="btn btn-primary btn-sm" onclick="Ledger.loadDaybook()">Load Daybook</button>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-secondary btn-sm" onclick="Ledger.printDaybook()">🖨️ Print Daybook</button>
                        <button class="btn btn-secondary btn-sm" onclick="Ledger.exportDaybookCSV()">📥 Export Daybook CSV</button>
                    </div>
                </div>
            </div>

            <div id="daybook-content-display">
                <div class="text-center p-4">Loading daily cashbook...</div>
            </div>
        `;

        this.loadDaybook();
    },

    onDaybookDateChange(val) {
        this.state.daybookDate = val;
        this.loadDaybook();
    },

    async loadDaybook() {
        const display = document.getElementById('daybook-content-display');
        if (!display) return;

        try {
            const date = this.state.daybookDate || new Date().toISOString().split('T')[0];
            const res = await API.get(`/api/ledger/daybook?date=${encodeURIComponent(date)}`);
            this.state.daybookData = res;

            const inflows = res.inflows || {};
            const outflows = res.outflows || {};
            const summary = res.summary || {};

            let receiptsRows = '';
            (inflows.receipts || []).forEach(r => {
                receiptsRows += `
                    <tr>
                        <td><strong>${r.ref_no}</strong></td>
                        <td>${r.party_name || 'Cash Customer'}</td>
                        <td><span class="badge badge-success">${(r.method || 'cash').toUpperCase()}</span></td>
                        <td>${r.invoice_number ? `Invoice #${r.invoice_number}` : (r.notes || '-')}</td>
                        <td style="text-align:right; font-weight:700; color:var(--success-color);">₹${r.amount.toFixed(2)}</td>
                    </tr>
                `;
            });
            if (!receiptsRows) receiptsRows = '<tr><td colspan="5" class="empty-state">No payment receipts on this date.</td></tr>';

            let expensesRows = '';
            (outflows.expenses || []).forEach(e => {
                expensesRows += `
                    <tr>
                        <td><strong>${e.ref_no}</strong></td>
                        <td>${e.category_name || 'General Expense'}</td>
                        <td><span class="badge badge-secondary">${(e.method || 'cash').toUpperCase()}</span></td>
                        <td>${e.description || '-'}</td>
                        <td style="text-align:right; font-weight:700; color:var(--danger-color);">₹${e.amount.toFixed(2)}</td>
                    </tr>
                `;
            });
            if (!expensesRows) expensesRows = '<tr><td colspan="5" class="empty-state">No expenses recorded on this date.</td></tr>';

            display.innerHTML = `
                <!-- Daybook KPI Summary -->
                <div class="stats-grid mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
                    <div class="stat-card card p-3" style="background:var(--card-bg); border-left:4px solid var(--success-color);">
                        <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">TOTAL INFLOW (कुल आवक)</div>
                        <div style="font-size:1.8rem; font-weight:800; color:var(--success-color); margin-top:4px;">
                            ₹${(summary.total_inflow || 0).toFixed(2)}
                        </div>
                        <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
                            Cash: ₹${(inflows.cash || 0).toFixed(2)} | UPI: ₹${(inflows.upi || 0).toFixed(2)}
                        </div>
                    </div>
                    <div class="stat-card card p-3" style="background:var(--card-bg); border-left:4px solid var(--danger-color);">
                        <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">TOTAL OUTFLOW (कुल खर्च/जावक)</div>
                        <div style="font-size:1.8rem; font-weight:800; color:var(--danger-color); margin-top:4px;">
                            ₹${(summary.total_outflow || 0).toFixed(2)}
                        </div>
                        <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
                            Expenses & Vendor Payments
                        </div>
                    </div>
                    <div class="stat-card card p-3" style="background:var(--card-bg); border-left:4px solid var(--primary-color);">
                        <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">NET DAILY CASHFLOW (शुद्ध बचत)</div>
                        <div style="font-size:1.8rem; font-weight:800; color:${summary.net_flow >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}; margin-top:4px;">
                            ₹${(summary.net_flow || 0).toFixed(2)}
                        </div>
                        <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
                            Inflow minus Outflow
                        </div>
                    </div>
                    <div class="stat-card card p-3" style="background:var(--card-bg); border-left:4px solid #6366f1;">
                        <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">CASH IN HAND (दुकान गल्ला)</div>
                        <div style="font-size:1.8rem; font-weight:800; color:#6366f1; margin-top:4px;">
                            ₹${(summary.cash_balance || 0).toFixed(2)}
                        </div>
                        <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
                            Physical Cash Balance
                        </div>
                    </div>
                </div>

                <!-- Two Column Ledger: Inflows & Outflows -->
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; align-items:start;">
                    <!-- INFLOWS -->
                    <div class="card" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; overflow:hidden;">
                        <div class="card-header" style="background:rgba(5, 150, 105, 0.1); border-bottom:1px solid var(--border-color); padding:12px 16px;">
                            <h4 style="margin:0; font-size:1.1rem; color:var(--success-color); font-weight:700;">
                                📥 INFLOWS / RECEIPTS (जमा / आवक)
                            </h4>
                        </div>
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Ref #</th>
                                        <th>Received From</th>
                                        <th>Mode</th>
                                        <th>Details</th>
                                        <th style="text-align:right;">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>${receiptsRows}</tbody>
                            </table>
                        </div>
                    </div>

                    <!-- OUTFLOWS -->
                    <div class="card" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; overflow:hidden;">
                        <div class="card-header" style="background:rgba(220, 38, 38, 0.1); border-bottom:1px solid var(--border-color); padding:12px 16px;">
                            <h4 style="margin:0; font-size:1.1rem; color:var(--danger-color); font-weight:700;">
                                📤 OUTFLOWS / EXPENSES (खर्च / निकासी)
                            </h4>
                        </div>
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Ref #</th>
                                        <th>Category</th>
                                        <th>Mode</th>
                                        <th>Details</th>
                                        <th style="text-align:right;">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>${expensesRows}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } catch (e) {
            display.innerHTML = `<div class="empty-state">Error loading daybook: ${e.message}</div>`;
        }
    },

    // ─────────────────────────────────────────────────────────────
    // 4. PRINTING & DOWNLOAD CAPABILITIES
    // ─────────────────────────────────────────────────────────────
    async printCustomerStatement(customerId) {
        try {
            const data = this.state.customerData && this.state.customerData.customer.id === customerId 
                ? this.state.customerData 
                : await API.get(`/api/ledger/customer/${customerId}?from=${encodeURIComponent(this.state.from)}&to=${encodeURIComponent(this.state.to)}`);

            const cust = data.customer;
            const entries = data.entries || [];
            const summary = data.summary || {};

            let bus = { name: 'BHAI BHAI COMMUNICATION', address: 'Mobile & Electronics Store', phone: '' };
            try {
                const busRes = await API.get('/api/settings/business');
                if (busRes && busRes.name) bus = busRes;
            } catch (e) {}

            let rowsHtml = `
                <tr style="background:#f1f5f9; font-weight:bold;">
                    <td>${data.period.from || 'Opening'}</td>
                    <td>OPENING</td>
                    <td>-</td>
                    <td>Opening Balance Brought Forward</td>
                    <td style="text-align:right;">${data.opening_balance > 0 ? 'Rs ' + data.opening_balance.toFixed(2) : '-'}</td>
                    <td style="text-align:right;">${data.opening_balance < 0 ? 'Rs ' + Math.abs(data.opening_balance).toFixed(2) : '-'}</td>
                    <td style="text-align:right;">Rs ${Math.abs(data.opening_balance).toFixed(2)}</td>
                    <td style="text-align:center;">${data.opening_type}</td>
                </tr>
            `;

            entries.forEach(e => {
                rowsHtml += `
                    <tr>
                        <td>${e.date}</td>
                        <td>${e.label}</td>
                        <td>${e.ref_no}</td>
                        <td>${e.description}</td>
                        <td style="text-align:right;">${e.debit > 0 ? 'Rs ' + e.debit.toFixed(2) : '-'}</td>
                        <td style="text-align:right;">${e.credit > 0 ? 'Rs ' + e.credit.toFixed(2) : '-'}</td>
                        <td style="text-align:right; font-weight:bold;">Rs ${Math.abs(e.running_balance).toFixed(2)}</td>
                        <td style="text-align:center;">${e.balance_type}</td>
                    </tr>
                `;
            });

            const closingVal = summary.closing_balance || 0;

            const printWin = window.open('', '_blank');
            printWin.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Ledger Statement - ${cust.name}</title>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; background: #fff; line-height: 1.4; }
                        .statement-container { max-width: 900px; margin: 0 auto; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
                        .party-box { display: flex; justify-content: space-between; background: #f8fafc; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
                        th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
                        th { background: #f1f5f9; font-weight: 700; }
                        .summary-box { display: flex; justify-content: space-between; background: #f1f5f9; padding: 12px 18px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-bottom: 30px; }
                        .footer { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid #cbd5e1; font-size: 12px; }
                        @media print { body { padding: 0; } }
                    </style>
                </head>
                <body>
                    <div class="statement-container">
                        <div class="header">
                            <div>
                                <h1 style="margin:0; font-size:24px; color:#0f172a;">${bus.name.toUpperCase()}</h1>
                                <div style="font-size:13px; color:#64748b;">${bus.address || 'Retail & Electronics Store'}</div>
                                ${bus.phone ? `<div style="font-size:13px; color:#64748b;">Phone: ${bus.phone}</div>` : ''}
                            </div>
                            <div style="text-align:right;">
                                <h2 style="margin:0; color:#4f46e5; font-size:20px;">ACCOUNT LEDGER STATEMENT</h2>
                                <div style="font-size:13px; color:#64748b; margin-top:4px;">Period: ${data.period.from} to ${data.period.to}</div>
                                <div style="font-size:12px; color:#94a3b8;">Printed: ${new Date().toLocaleString()}</div>
                            </div>
                        </div>

                        <div class="party-box">
                            <div>
                                <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Account Of (ग्राहक)</div>
                                <div style="font-size:18px; font-weight:800; color:#0f172a; margin-top:2px;">${cust.name}</div>
                                ${cust.phone ? `<div style="font-size:13px; color:#475569;">Phone: ${cust.phone}</div>` : ''}
                                ${cust.address ? `<div style="font-size:13px; color:#475569;">Address: ${cust.address}</div>` : ''}
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Current Balance Due</div>
                                <div style="font-size:22px; font-weight:900; color:${closingVal > 0 ? '#dc2626' : '#059669'}; margin-top:2px;">
                                    Rs ${Math.abs(closingVal).toFixed(2)} ${summary.closing_type}
                                </div>
                            </div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Ref #</th>
                                    <th>Particulars</th>
                                    <th style="text-align:right;">Debit (+Dr)</th>
                                    <th style="text-align:right;">Credit (-Cr)</th>
                                    <th style="text-align:right;">Balance</th>
                                    <th style="text-align:center;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                            <tfoot style="font-weight:bold; background:#f8fafc;">
                                <tr>
                                    <td colspan="4" style="text-align:right;">TOTALS:</td>
                                    <td style="text-align:right;">Rs ${summary.total_debit.toFixed(2)}</td>
                                    <td style="text-align:right;">Rs ${summary.total_credit.toFixed(2)}</td>
                                    <td style="text-align:right;">Rs ${Math.abs(closingVal).toFixed(2)}</td>
                                    <td style="text-align:center;">${summary.closing_type}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div class="summary-box">
                            <div>Total Invoiced: Rs ${summary.total_debit.toFixed(2)}</div>
                            <div>Total Received: Rs ${summary.total_credit.toFixed(2)}</div>
                            <div>Net Balance: Rs ${Math.abs(closingVal).toFixed(2)} (${summary.closing_type})</div>
                        </div>

                        <div class="footer">
                            <div>
                                This is a computer-generated ledger statement.<br>
                                Thank you for your continued trust and patronage!
                            </div>
                            <div style="text-align:right;">
                                <p style="margin:0 0 35px 0;">For ${bus.name}</p>
                                <p style="margin:0; border-top:1px solid #333; padding-top:4px; font-weight:700;">Authorized Signatory</p>
                            </div>
                        </div>
                    </div>
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
                </html>
            `);
            printWin.document.close();
        } catch (e) {
            App.toast('Error generating printable statement: ' + e.message, 'error');
        }
    },

    downloadCustomerCSV(customerId) {
        const data = this.state.customerData;
        if (!data || !data.entries) {
            App.toast('No ledger entries to export', 'warning');
            return;
        }

        const entries = data.entries;
        const csvRows = [
            ['Date', 'Type', 'Reference No', 'Particulars', 'Debit (Dr)', 'Credit (Cr)', 'Running Balance', 'Status']
        ];

        // Add opening balance
        csvRows.push([
            data.period.from || 'Opening',
            'OPENING',
            '-',
            'Opening Balance Brought Forward',
            data.opening_balance > 0 ? data.opening_balance.toFixed(2) : '0',
            data.opening_balance < 0 ? Math.abs(data.opening_balance).toFixed(2) : '0',
            Math.abs(data.opening_balance).toFixed(2),
            data.opening_type
        ]);

        entries.forEach(e => {
            csvRows.push([
                e.date,
                e.type,
                `"${e.ref_no}"`,
                `"${e.description.replace(/"/g, '""')}"`,
                e.debit.toFixed(2),
                e.credit.toFixed(2),
                Math.abs(e.running_balance).toFixed(2),
                e.balance_type
            ]);
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(r => r.join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Ledger_${data.customer.name.replace(/\s+/g, '_')}_${data.period.from}_to_${data.period.to}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        App.toast('Ledger CSV downloaded successfully', 'success');
    },

    shareCustomerWhatsApp(customerId) {
        const cust = this.state.customersList.find(c => c.id == customerId) || (this.state.customerData && this.state.customerData.customer);
        if (!cust) return;

        let bal = 0;
        if (this.state.customerData && this.state.customerData.customer.id === customerId) {
            bal = this.state.customerData.summary.closing_balance || 0;
        } else {
            const row = (this.state.customerData && this.state.customerData.customers && this.state.customerData.customers.find(c => c.id == customerId));
            bal = row ? row.current_balance : 0;
        }

        const _upiCfg = (window.Settings && Settings.getUpiConfig) ? Settings.getUpiConfig() : {};
        const upiId = _upiCfg.upi_id || '';
        const payee = _upiCfg.payee_name || 'Bhai Bhai Communication';

        let upiPayText = '';
        if (upiId && bal > 0) {
            upiPayText = `\n\n⚡ *Pay via UPI:* \nUPI ID: ${upiId}\nName: ${payee}\nAmount: ₹${bal.toFixed(2)}`;
        }

        let msg = `*BHAI BHAI COMMUNICATION*\nAccount Statement Notification\n\nDear *${cust.name}*,\nYour current ledger outstanding balance is: *₹${Math.abs(bal).toFixed(2)}* (${bal > 0 ? 'DUE / बक़ाया' : 'ADVANCE / जमा'}).${upiPayText}\n\nPlease verify your account. For any queries, feel free to visit or contact us.\n\nThank you!`;

        const phone = cust.phone ? cust.phone.replace(/[^0-9]/g, '') : '';
        const url = `https://wa.me/${phone ? '91' + phone : ''}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    },

    quickReceivePayment(customerId, dueAmount) {
        if (window.Payments && window.Payments.openNewModal) {
            window.Payments.openNewModal({ customerId, amount: dueAmount > 0 ? dueAmount : '' });
        } else {
            App.navigate(`/payments`);
        }
    },

    printPaymentReceipt(paymentId) {
        App.toast(`Printing Payment Receipt PAY-${String(paymentId).padStart(6, '0')}`, 'info');
        window.open(`/api/payments?search=${paymentId}`, '_blank');
    },

    printDaybook() {
        window.print();
    },

    exportDaybookCSV() {
        const data = this.state.daybookData;
        if (!data) return;
        const receipts = data.inflows ? data.inflows.receipts : [];
        const expenses = data.outflows ? data.outflows.expenses : [];

        const rows = [
            ['Type', 'Ref #', 'Party/Category', 'Method', 'Details', 'Amount']
        ];
        receipts.forEach(r => rows.push(['INFLOW', r.ref_no, `"${r.party_name || ''}"`, r.method, `"${r.notes || ''}"`, r.amount.toFixed(2)]));
        expenses.forEach(e => rows.push(['OUTFLOW', e.ref_no, `"${e.category_name || ''}"`, e.method, `"${e.description || ''}"`, e.amount.toFixed(2)]));

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(',')).join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `Daybook_${data.date}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        App.toast('Daybook CSV exported successfully', 'success');
    },

    exportSummaryCSV() {
        const data = this.state.customerData;
        if (!data || !data.customers) return;
        const rows = [
            ['Customer Name', 'Phone', 'Total Sales', 'Total Paid', 'Total Returns', 'Net Balance']
        ];
        data.customers.forEach(c => {
            rows.push([
                `"${c.name}"`,
                `"${c.phone || ''}"`,
                c.total_sales.toFixed(2),
                c.total_paid.toFixed(2),
                c.total_returns.toFixed(2),
                c.current_balance.toFixed(2)
            ]);
        });
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(',')).join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `Customers_Ledger_Summary_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        App.toast('Customer balances exported successfully', 'success');
    },

    printSummaryTable() {
        window.print();
    },

    refreshCurrent() {
        if (this.state.activeTab === 'customer') {
            if (this.state.customerId) this.loadCustomerLedger();
            else this.loadAllCustomersSummary();
        } else if (this.state.activeTab === 'supplier') {
            if (this.state.supplierId) this.loadSupplierLedger();
            else this.loadAllSuppliersSummary();
        } else {
            this.loadDaybook();
        }
        App.toast('Ledger refreshed', 'info');
    },

    printCurrent() {
        if (this.state.activeTab === 'customer' && this.state.customerId) {
            this.printCustomerStatement(this.state.customerId);
        } else {
            window.print();
        }
    },

    exportCSV() {
        if (this.state.activeTab === 'customer') {
            if (this.state.customerId) this.downloadCustomerCSV(this.state.customerId);
            else this.exportSummaryCSV();
        } else if (this.state.activeTab === 'daybook') {
            this.exportDaybookCSV();
        } else {
            App.toast('Exporting table...', 'info');
            window.print();
        }
    }
};
