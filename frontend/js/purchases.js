window.Purchases = {
    state: {
        page: 1,
        search: '',
        supplier: '',
        dateRange: ''
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
                <h2>Purchases</h2>
                <div class="page-actions">
                    <a href="#/purchases/new" class="btn btn-primary">New Purchase</a>
                </div>
            </div>
            <div class="toolbar form-row">
                <div class="form-group">
                    <input type="text" id="purchaseSearch" class="form-input search-input" placeholder="Search purchase # or supplier...">
                </div>
                <div class="form-group">
                    <input type="date" id="purchaseDateFilter" class="form-input">
                </div>
            </div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Purchase #</th>
                            <th>Date</th>
                            <th>Supplier</th>
                            <th>Grand Total</th>
                            <th>Paid</th>
                            <th>Due</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="purchasesTableBody">
                        <tr><td colspan="8" class="empty-state">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="purchasesPagination" class="pagination"></div>
        `;
    },
    renderNew: function() {
        const today = new Date().toISOString().split('T')[0];
        
        return `
            <div class="page-header">
                <h2>Create Purchase</h2>
                <div class="page-actions">
                    <a href="#/purchases" class="btn btn-secondary">Cancel</a>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Supplier *</label>
                            <select id="purSupplier" class="form-select" required>
                                <option value="">Select Supplier</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Date *</label>
                            <input type="date" id="purDate" class="form-input" value="${today}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Reference #</label>
                            <input type="text" id="purReference" class="form-input" placeholder="Bill No / Ref No">
                        </div>
                    </div>
                    
                    <div class="table-responsive" style="margin-top: 15px;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th width="30%">Product</th>
                                    <th width="10%">Quantity</th>
                                    <th width="15%">Purchase Price</th>
                                    <th width="10%">Discount</th>
                                    <th width="10%">Tax %</th>
                                    <th width="15%">Total</th>
                                    <th width="10%">Action</th>
                                </tr>
                            </thead>
                            <tbody id="purItemsBody">
                            </tbody>
                        </table>
                        <button class="btn btn-sm btn-secondary" style="margin-top: 10px;" onclick="Purchases.addItemRow()">+ Add Item</button>
                    </div>
                    
                    <div class="form-row" style="margin-top: 20px;">
                        <div class="form-group" style="flex: 2;">
                            <label class="form-label">Notes</label>
                            <textarea id="purNotes" class="form-textarea"></textarea>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <div class="stats-grid" style="grid-template-columns: 1fr; gap: 10px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>Subtotal:</strong> <span id="purSubtotal">0.00</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>Total Discount:</strong> <span id="purTotalDiscount">0.00</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>Total Tax:</strong> <span id="purTotalTax">0.00</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 1.2em;">
                                    <strong>Grand Total:</strong> <strong id="purGrandTotal">0.00</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <h3 style="margin-top: 20px;">Payment Details</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Amount Paid</label>
                            <input type="number" step="0.01" id="purAmountPaid" class="form-input" value="0.00" oninput="Purchases.calculateTotals()">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Payment Method</label>
                            <select id="purPaymentMethod" class="form-select">
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="bank">Bank Transfer</option>
                                <option value="other">Other</option>
                                <option value="due">Due (No Payment)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-actions" style="margin-top: 20px; text-align: right;">
                        <button class="btn btn-primary" id="btnSavePurchase" onclick="Purchases.savePurchase()">Save Purchase</button>
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

        const searchInput = document.getElementById('purchaseSearch');
        if (searchInput) {
            searchInput.addEventListener('input', App.debounce((e) => {
                this.state.search = e.target.value;
                this.state.page = 1;
                this.loadList(this.state.page);
            }, 300));
        }

        const dateFilter = document.getElementById('purchaseDateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.state.dateRange = e.target.value;
                this.state.page = 1;
                this.loadList(this.state.page);
            });
        }
    },
    async loadList(page = 1) {
        const tbody = document.getElementById('purchasesTableBody');
        const pagination = document.getElementById('purchasesPagination');
        if (!tbody) return;

        try {
            const query = `search=${encodeURIComponent(this.state.search)}&date=${encodeURIComponent(this.state.dateRange)}&page=${page}&limit=25`;
            const res = await API.get(`/api/purchases?${query}`);
            const purchases = res.data || res.purchases || [];
            
            if (purchases.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No purchases found.</td></tr>';
                if(pagination) pagination.innerHTML = '';
                return;
            }

            let html = '';
            purchases.forEach(p => {
                let badge = 'badge-success';
                if (p.status === 'unpaid') badge = 'badge-danger';
                if (p.status === 'partial') badge = 'badge-warning';

                html += `
                    <tr>
                        <td><strong>${p.purchase_number}</strong></td>
                        <td>${App.formatDate(p.date)}</td>
                        <td>${p.supplier_name || '-'}</td>
                        <td>${App.currency(p.grand_total)}</td>
                        <td>${App.currency(p.paid_amount)}</td>
                        <td>${App.currency(p.due_amount)}</td>
                        <td><span class="badge ${badge}">${p.status}</span></td>
                        <td>
                            <button class="btn btn-sm btn-icon" onclick="Purchases.view(${p.id})">View</button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

            if (pagination) {
                const totalPages = (res.pagination && res.pagination.totalPages) || res.totalPages || 1;
                const curPage = (res.pagination && res.pagination.page) || res.page || page;
                pagination.innerHTML = App.paginationHtml(curPage, totalPages, 'Purchases.changePage');
            }
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Error loading purchases.</td></tr>';
            App.toast('Failed to load purchases', 'error');
        }
    },
    changePage: function(page) {
        this.state.page = page;
        this.loadList(this.state.page);
    },
    initNew: async function() {
        try {
            const suppliersRes = await API.get('/api/suppliers');
            const supSelect = document.getElementById('purSupplier');
            const supList = Array.isArray(suppliersRes) ? suppliersRes : (suppliersRes.suppliers || suppliersRes.data || []);
            if (supSelect && supList) {
                supList.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = s.name + (s.phone ? ` (${s.phone})` : '');
                    supSelect.appendChild(opt);
                });
            }

            const prodRes = await API.get('/api/products?limit=1000');
            this.products = Array.isArray(prodRes) ? prodRes : (prodRes.products || prodRes.data || []);
            this.addItemRow();
        } catch (e) {
            App.toast('Error initializing purchase form', 'error');
        }
    },
    addItemRow: function() {
        const tbody = document.getElementById('purItemsBody');
        const rowId = 'prow_' + Date.now() + Math.random().toString().substring(2,5);
        
        const tr = document.createElement('tr');
        tr.id = rowId;
        
        let prodOptions = '<option value="">Select Product</option>';
        if (this.products) {
            this.products.forEach(p => {
                prodOptions += `<option value="${p.id}" data-price="${p.purchase_price}" data-tax="${p.tax_rate}">${p.name} - ${App.currency(p.purchase_price)}</option>`;
            });
        }

        tr.innerHTML = `
            <td>
                <select class="form-select pur-item-product" onchange="Purchases.onProductChange('${rowId}')">
                    ${prodOptions}
                </select>
            </td>
            <td><input type="number" step="0.01" class="form-input pur-item-qty" value="1" min="1" oninput="Purchases.calculateTotals()"></td>
            <td><input type="number" step="0.01" class="form-input pur-item-price" value="0" oninput="Purchases.calculateTotals()"></td>
            <td><input type="number" step="0.01" class="form-input pur-item-discount" value="0" oninput="Purchases.calculateTotals()"></td>
            <td><input type="number" step="0.01" class="form-input pur-item-tax" value="0" oninput="Purchases.calculateTotals()"></td>
            <td><input type="text" class="form-input pur-item-total" value="0.00" readonly></td>
            <td><button class="btn btn-sm btn-danger btn-icon" onclick="Purchases.removeItemRow('${rowId}')">✕</button></td>
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
        const sel = tr.querySelector('.pur-item-product');
        const opt = sel.options[sel.selectedIndex];
        if (opt.value) {
            tr.querySelector('.pur-item-price').value = opt.getAttribute('data-price') || 0;
            tr.querySelector('.pur-item-tax').value = opt.getAttribute('data-tax') || 0;
        } else {
            tr.querySelector('.pur-item-price').value = 0;
            tr.querySelector('.pur-item-tax').value = 0;
        }
        this.calculateTotals();
    },
    calculateTotals: function() {
        const tbody = document.getElementById('purItemsBody');
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;
        let grandTotal = 0;

        if (tbody) {
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(tr => {
                const qty = parseFloat(tr.querySelector('.pur-item-qty').value) || 0;
                const price = parseFloat(tr.querySelector('.pur-item-price').value) || 0;
                const discount = parseFloat(tr.querySelector('.pur-item-discount').value) || 0;
                const taxRate = parseFloat(tr.querySelector('.pur-item-tax').value) || 0;

                const rowSub = qty * price;
                const rowDiscount = discount;
                const taxable = rowSub - rowDiscount;
                const rowTax = (taxable > 0 ? taxable : 0) * (taxRate / 100);
                const rowTotal = taxable + rowTax;

                tr.querySelector('.pur-item-total').value = rowTotal.toFixed(2);

                subtotal += rowSub;
                totalDiscount += rowDiscount;
                totalTax += rowTax;
                grandTotal += rowTotal;
            });
        }

        document.getElementById('purSubtotal').textContent = App.currency(subtotal);
        document.getElementById('purTotalDiscount').textContent = App.currency(totalDiscount);
        document.getElementById('purTotalTax').textContent = App.currency(totalTax);
        document.getElementById('purGrandTotal').textContent = App.currency(grandTotal);
    },
    savePurchase: async function() {
        const supplier_id = document.getElementById('purSupplier').value;
        if (!supplier_id) return App.toast('Please select a supplier', 'error');

        const date = document.getElementById('purDate').value;
        const paid = parseFloat(document.getElementById('purAmountPaid').value) || 0;
        const payment_method = document.getElementById('purPaymentMethod').value;
        const reference_number = document.getElementById('purReference').value;
        const notes = document.getElementById('purNotes').value;

        const items = [];
        const tbody = document.getElementById('purItemsBody');
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(tr => {
            const product_id = tr.querySelector('.pur-item-product').value;
            if (product_id) {
                items.push({
                    product_id: product_id,
                    quantity: parseFloat(tr.querySelector('.pur-item-qty').value) || 0,
                    purchase_price: parseFloat(tr.querySelector('.pur-item-price').value) || 0,
                    discount: parseFloat(tr.querySelector('.pur-item-discount').value) || 0,
                    tax_rate: parseFloat(tr.querySelector('.pur-item-tax').value) || 0
                });
            }
        });

        if (items.length === 0) return App.toast('Please add at least one valid item', 'error');

        const payload = {
            supplier_id,
            date,
            items,
            paid,
            payment_method,
            reference_number,
            notes
        };

        const btn = document.getElementById('btnSavePurchase');
        try {
            await API.submitOnce(btn, () => API.post('/api/purchases', payload));
            App.toast('Purchase created successfully', 'success');
            window.location.hash = '#/purchases';
        } catch (e) {
            App.toast(e.message || 'Failed to create purchase', 'error');
        }
    },
    view: async function(id) {
        try {
            const data = await API.get(`/api/purchases/${id}`);
            const pur = data.purchase;
            const items = data.items;

            let itemsHtml = '';
            items.forEach((item, index) => {
                itemsHtml += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.product_name}</td>
                        <td>${item.quantity}</td>
                        <td>${App.currency(item.purchase_price)}</td>
                        <td>${App.currency(item.discount)}</td>
                        <td>${item.tax_rate}%</td>
                        <td>${App.currency(item.total)}</td>
                    </tr>
                `;
            });

            const html = `
                <div class="modal-header">
                    <h3>Purchase ${pur.purchase_number}</h3>
                    <button class="btn-icon" onclick="App.closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <div>
                            <strong>From:</strong><br>
                            ${pur.supplier_name}<br>
                            ${App.formatDate(pur.date)}<br>
                            Ref: ${pur.reference_number || '-'}
                        </div>
                        <div style="text-align: right;">
                            <strong>Status:</strong> <span class="badge badge-primary">${pur.status.toUpperCase()}</span><br>
                            <strong>Grand Total:</strong> ${App.currency(pur.grand_total)}<br>
                            <strong>Due:</strong> ${App.currency(pur.due_amount)}
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
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
                </div>
            `;
            App.showModal(html);
        } catch (e) {
            App.toast('Error loading purchase', 'error');
        }
    }
};
