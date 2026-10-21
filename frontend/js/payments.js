window.Payments = {
    state: {
        page: 1,
        search: '',
        method: '',
        dateRange: ''
    },
    render: function(action) {
        if (action === 'due') {
            return this.renderDueView();
        }
        return this.renderPaymentsList();
    },
    renderPaymentsList: function() {
        return `
            <div class="page-header">
                <h2>Payments</h2>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="Payments.showPaymentModal()">Record Payment</button>
                </div>
            </div>
            <div class="toolbar form-row">
                <div class="form-group">
                    <input type="text" id="paymentSearch" class="form-input search-input" placeholder="Search customer or reference...">
                </div>
                <div class="form-group">
                    <select id="paymentMethodFilter" class="form-select">
                        <option value="">All Methods</option>
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <input type="date" id="paymentDateFilter" class="form-input">
                </div>
            </div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Invoice #</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Reference</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="paymentsTableBody">
                        <tr><td colspan="7" class="empty-state">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="paymentsPagination" class="pagination"></div>
        `;
    },
    renderDueView: function() {
        return `
            <div class="page-header">
                <h2>Outstanding Due (Udari)</h2>
                <div class="page-actions">
                    <h3 style="margin: 0;">Total Due: <span id="totalDueHeader">...</span></h3>
                </div>
            </div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Customer Name</th>
                            <th>Total Sales</th>
                            <th>Total Paid</th>
                            <th>Outstanding Due</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="dueTableBody">
                        <tr><td colspan="5" class="empty-state">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        `;
    },
    init: function(action) {
        if (action === 'due') {
            this.loadDueList();
        } else {
            this.loadPaymentsList(this.state.page);

            const searchInput = document.getElementById('paymentSearch');
            if (searchInput) {
                searchInput.addEventListener('input', App.debounce((e) => {
                    this.state.search = e.target.value;
                    this.state.page = 1;
                    this.loadPaymentsList(this.state.page);
                }, 300));
            }

            const methodFilter = document.getElementById('paymentMethodFilter');
            if (methodFilter) {
                methodFilter.addEventListener('change', (e) => {
                    this.state.method = e.target.value;
                    this.state.page = 1;
                    this.loadPaymentsList(this.state.page);
                });
            }

            const dateFilter = document.getElementById('paymentDateFilter');
            if (dateFilter) {
                dateFilter.addEventListener('change', (e) => {
                    this.state.dateRange = e.target.value;
                    this.state.page = 1;
                    this.loadPaymentsList(this.state.page);
                });
            }
        }
    },
    async loadPaymentsList(page = 1) {
        const tbody = document.getElementById('paymentsTableBody');
        const pagination = document.getElementById('paymentsPagination');
        if (!tbody) return;

        try {
            const query = `search=${encodeURIComponent(this.state.search)}&method=${encodeURIComponent(this.state.method)}&date=${encodeURIComponent(this.state.dateRange)}&page=${page}&limit=25`;
            const res = await API.get(`/api/payments?${query}`);
            const payments = res.data || res.payments || [];
            
            if (payments.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No payments found.</td></tr>';
                if(pagination) pagination.innerHTML = '';
                return;
            }

            let html = '';
            payments.forEach(p => {
                html += `
                    <tr>
                        <td>${App.formatDate(p.payment_date || p.date)}</td>
                        <td>${p.customer_name || '-'}</td>
                        <td>${p.invoice_number ? '#' + p.invoice_number : '-'}</td>
                        <td><strong>${App.currency(p.amount)}</strong></td>
                        <td><span class="badge badge-secondary">${(p.payment_method || p.method || 'cash').toUpperCase()}</span></td>
                        <td>${p.reference_number || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-icon" onclick="Payments.view(${p.id})">View</button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

            if (pagination) {
                const totalPages = (res.pagination && res.pagination.totalPages) || res.totalPages || 1;
                const curPage = (res.pagination && res.pagination.page) || res.page || page;
                pagination.innerHTML = App.paginationHtml(curPage, totalPages, 'Payments.changePage');
            }
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Error loading payments.</td></tr>';
            App.toast('Failed to load payments', 'error');
        }
    },
    changePage: function(page) {
        this.state.page = page;
        this.loadPaymentsList(this.state.page);
    },
    async loadDueList() {
        const tbody = document.getElementById('dueTableBody');
        try {
            const res = await API.get('/api/reports/due');
            const data = res.data || res.items || res.due || [];
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No outstanding dues.</td></tr>';
                document.getElementById('totalDueHeader').textContent = App.currency(0);
                return;
            }

            let totalDueAgg = 0;
            let html = '';
            data.forEach(d => {
                const dueAmt = d.total_due !== undefined ? d.total_due : (d.due || 0);
                totalDueAgg += Number(dueAmt);
                html += `
                    <tr>
                        <td><strong>${d.customer_name}</strong></td>
                        <td>${App.currency(d.total_sales)}</td>
                        <td>${App.currency(d.total_paid)}</td>
                        <td><span class="badge badge-danger">${App.currency(dueAmt)}</span></td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="Payments.showPaymentModal(${d.customer_id})">Pay</button>
                            <button class="btn btn-sm btn-secondary" onclick="Payments.viewLedger(${d.customer_id}, '${d.customer_name}')">View Ledger</button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
            document.getElementById('totalDueHeader').textContent = App.currency(totalDueAgg);
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Error loading due list.</td></tr>';
            App.toast('Failed to load due list', 'error');
        }
    },
    showPaymentModal: async function(preselectCustomerId = null) {
        try {
            const customersRes = await API.get('/api/customers');
            const customers = Array.isArray(customersRes) ? customersRes : (customersRes.customers || customersRes.data || []);
            let custOptions = '<option value="">Select Customer</option>';
            customers.forEach(c => {
                custOptions += `<option value="${c.id}" ${preselectCustomerId == c.id ? 'selected' : ''}>${c.name}</option>`;
            });

            const today = new Date().toISOString().split('T')[0];

            const html = `
                <div class="modal-header">
                    <h3>Record Payment</h3>
                    <button class="btn-icon" onclick="App.closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Customer *</label>
                        <select id="payCustomer" class="form-select" onchange="Payments.onCustomerSelect()">
                            ${custOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Invoice (Optional)</label>
                        <select id="payInvoice" class="form-select" onchange="Payments.onInvoiceSelect()">
                            <option value="">Select Invoice (or leave empty for account credit)</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Amount *</label>
                            <input type="number" step="0.01" id="payAmount" class="form-input" required>
                            <small id="payDueHint" style="color: #666; display: none;">Due: <span id="payDueAmt">0</span></small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Date *</label>
                            <input type="date" id="payDate" class="form-input" value="${today}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Method *</label>
                            <select id="payMethod" class="form-select">
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="bank">Bank Transfer</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Reference #</label>
                            <input type="text" id="payReference" class="form-input">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Notes</label>
                        <textarea id="payNotes" class="form-textarea"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                    <button class="btn btn-primary" id="btnRecordPayment" onclick="Payments.recordPayment()">Save Payment</button>
                </div>
            `;
            App.showModal(html);

            if (preselectCustomerId) {
                this.onCustomerSelect();
            }
        } catch (e) {
            App.toast('Error initializing payment form', 'error');
        }
    },
    onCustomerSelect: async function() {
        const custId = document.getElementById('payCustomer').value;
        const invSelect = document.getElementById('payInvoice');
        invSelect.innerHTML = '<option value="">Loading...</option>';
        
        if (!custId) {
            invSelect.innerHTML = '<option value="">Select Invoice (or leave empty for account credit)</option>';
            return;
        }

        try {
            // Get unpaid invoices for this customer
            const invoices = await API.get(`/api/invoices?customer_id=${custId}&status=unpaid,partial`);
            let options = '<option value="">Select Invoice (or leave empty for account credit)</option>';
            
            if (invoices && invoices.data) {
                invoices.data.forEach(inv => {
                    options += `<option value="${inv.id}" data-due="${inv.due_amount}">#${inv.invoice_number} (Due: ${App.currency(inv.due_amount)})</option>`;
                });
            }
            invSelect.innerHTML = options;
        } catch (e) {
            invSelect.innerHTML = '<option value="">Error loading invoices</option>';
        }
    },
    onInvoiceSelect: function() {
        const sel = document.getElementById('payInvoice');
        const opt = sel.options[sel.selectedIndex];
        const hint = document.getElementById('payDueHint');
        const amtInput = document.getElementById('payAmount');
        
        if (opt.value && opt.getAttribute('data-due')) {
            const due = parseFloat(opt.getAttribute('data-due'));
            hint.style.display = 'block';
            document.getElementById('payDueAmt').textContent = App.currency(due);
            amtInput.value = due; // auto-fill max
            amtInput.max = due; // validate max
        } else {
            hint.style.display = 'none';
            amtInput.max = "";
        }
    },
    recordPayment: async function() {
        const customer_id = document.getElementById('payCustomer').value;
        const invoice_id = document.getElementById('payInvoice').value || null;
        const amount = parseFloat(document.getElementById('payAmount').value) || 0;
        const payment_date = document.getElementById('payDate').value;
        const payment_method = document.getElementById('payMethod').value;
        const reference_number = document.getElementById('payReference').value;
        const notes = document.getElementById('payNotes').value;

        if (!customer_id || amount <= 0 || !payment_date) {
            return App.toast('Please fill all required fields correctly', 'error');
        }

        const maxDue = document.getElementById('payAmount').max;
        if (maxDue && amount > parseFloat(maxDue)) {
            return App.toast('Amount cannot exceed the due amount for this invoice', 'error');
        }

        const payload = {
            customer_id,
            invoice_id,
            amount,
            payment_date,
            payment_method,
            reference_number,
            notes
        };

        const btn = document.getElementById('btnRecordPayment');
        try {
            await API.submitOnce(btn, () => API.post('/api/payments', payload));
            App.toast('Payment recorded successfully', 'success');
            App.closeModal();
            
            // Refresh current view
            if (window.location.hash.includes('due')) {
                this.loadDueList();
            } else {
                this.loadPaymentsList(this.state.page);
            }
        } catch (e) {
            App.toast(e.message || 'Error recording payment', 'error');
        }
    },
    viewLedger: async function(customerId, customerName) {
        try {
            const res = await API.get(`/api/customers/${customerId}/ledger`);
            const ledger = res.data || [];
            
            let tbody = '';
            let balance = 0;
            
            ledger.forEach(entry => {
                const isInvoice = entry.type === 'invoice';
                const credit = isInvoice ? entry.amount : 0; // customer owes us
                const debit = !isInvoice ? entry.amount : 0; // customer paid us
                balance += credit - debit;
                
                tbody += `
                    <tr>
                        <td>${App.formatDate(entry.date)}</td>
                        <td>${entry.description}</td>
                        <td style="color: red;">${credit > 0 ? App.currency(credit) : '-'}</td>
                        <td style="color: green;">${debit > 0 ? App.currency(debit) : '-'}</td>
                        <td><strong>${App.currency(balance)}</strong></td>
                    </tr>
                `;
            });

            if(ledger.length === 0) {
                tbody = '<tr><td colspan="5" class="empty-state">No ledger entries found.</td></tr>';
            }

            const html = `
                <div class="modal-header">
                    <h3>Ledger for ${customerName}</h3>
                    <button class="btn-icon" onclick="App.closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Debit (Owed)</th>
                                <th>Credit (Paid)</th>
                                <th>Balance Due</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tbody}
                        </tbody>
                    </table>
                </div>
            `;
            App.showModal(html);
        } catch (e) {
            App.toast('Error loading ledger', 'error');
        }
    },
    view: async function(id) {
        try {
            const data = await API.get(`/api/payments/${id}`);
            const html = `
                <div class="modal-header">
                    <h3>Payment Receipt</h3>
                    <button class="btn-icon" onclick="App.closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <p><strong>Date:</strong> ${App.formatDate(data.payment_date)}</p>
                    <p><strong>Customer:</strong> ${data.customer_name || 'N/A'}</p>
                    <p><strong>Invoice #:</strong> ${data.invoice_number || 'N/A'}</p>
                    <p><strong>Amount:</strong> ${App.currency(data.amount)}</p>
                    <p><strong>Method:</strong> <span class="badge badge-secondary">${data.payment_method.toUpperCase()}</span></p>
                    <p><strong>Reference:</strong> ${data.reference_number || 'N/A'}</p>
                    ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
                </div>
            `;
            App.showModal(html);
        } catch(e) {
            App.toast('Error loading payment details', 'error');
        }
    }
};
