window.Returns = {
    state: {
        type: 'sales', // sales or purchases
        page: 1,
        totalPages: 1,
        selectedInvoiceId: null,
        invoiceItems: []
    },

    render(action) {
        this.state.type = action === 'purchases' ? 'purchases' : 'sales';
        const title = this.state.type === 'sales' ? 'Sales Returns' : 'Purchase Returns';
        const btnText = this.state.type === 'sales' ? 'New Sales Return' : 'New Purchase Return';

        return `
            <div class="page-header">
                <h2>${title}</h2>
                <button class="btn btn-primary" onclick="Returns.showModal()">+ ${btnText}</button>
            </div>
            
            <div class="card mt-4">
                <div class="card-body" id="returns-table-container">
                    <p>Loading...</p>
                </div>
            </div>

            <!-- Return Modal -->
            <div class="modal-overlay" id="return-modal">
                <div class="modal" style="max-width:800px; width:90%;">
                    <div class="modal-header">
                        <h3 id="return-modal-title">${btnText}</h3>
                        <button class="btn-icon" onclick="App.closeModal('return-modal')">&times;</button>
                    </div>
                    <form id="return-form">
                        <div class="modal-body">
                            <div class="form-group">
                                <label class="form-label">${this.state.type === 'sales' ? 'Select Invoice' : 'Select Purchase'}</label>
                                <select class="form-select" id="return-parent-id" required onchange="Returns.loadItems(this.value)">
                                    <option value="">Select...</option>
                                </select>
                            </div>
                            
                            <div id="return-items-container" style="display:none;">
                                <h4>Select Items to Return</h4>
                                <table class="data-table mt-2 mb-4">
                                    <thead>
                                        <tr>
                                            <th><input type="checkbox" id="return-select-all" onchange="Returns.toggleAllItems(this.checked)"></th>
                                            <th>Product</th>
                                            <th>Qty Bought</th>
                                            <th>Price</th>
                                            <th>Return Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody id="return-items-body"></tbody>
                                </table>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Reason for Return</label>
                                <textarea class="form-textarea" id="return-reason" required></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="App.closeModal('return-modal')">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="return-submit-btn">Submit Return</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    async init(action) {
        this.bindEvents();
        this.loadList(1);
    },

    bindEvents() {
        const appContent = document.getElementById('app-content');
        
        // Form submit
        appContent.addEventListener('submit', async (e) => {
            if (e.target.id === 'return-form') {
                e.preventDefault();
                await this.submitReturn();
            }
        });

        // Pagination
        appContent.addEventListener('click', (e) => {
            if (e.target.closest('.page-btn')) {
                const btn = e.target.closest('.page-btn');
                const page = btn.dataset.page;
                if (page) {
                    this.loadList(parseInt(page));
                }
            }
        });
    },

    goToPage(page) {
        this.loadList(page);
    },

    async loadList(page = 1) {
        this.state.page = page;
        const container = document.getElementById('returns-table-container');
        if (!container) return;

        try {
            const url = `/api/returns/${this.state.type}?page=${this.state.page}`;
            const res = await API.get(url);
            const returns = res.data || res.returns || (Array.isArray(res) ? res : []);
            
            if (returns.length === 0) {
                container.innerHTML = `<div class="empty-state">No returns found.</div>`;
                return;
            }

            this.state.totalPages = (res.pagination && res.pagination.totalPages) || res.totalPages || res.pages || 1;

            let html = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Return #</th>
                            <th>Date</th>
                            <th>${this.state.type === 'sales' ? 'Invoice #' : 'Purchase #'}</th>
                            <th>Party</th>
                            <th>Total Amount</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            returns.forEach(r => {
                html += `
                    <tr>
                        <td><strong>${r.return_number || r.id}</strong></td>
                        <td>${App.formatDate(r.created_at)}</td>
                        <td>${r.parent_number || r.parent_id}</td>
                        <td>${r.party_name || '-'}</td>
                        <td><strong>${App.currency(r.total !== undefined ? r.total : r.grand_total)}</strong></td>
                        <td>${r.reason || '-'}</td>
                    </tr>
                `;
            });

            html += `</tbody></table>`;
            html += App.paginationHtml(this.state.page, this.state.totalPages, 'Returns.goToPage');
            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = `<div class="empty-state">Error loading returns.</div>`;
        }
    },

    async showModal() {
        document.getElementById('return-form').reset();
        document.getElementById('return-items-container').style.display = 'none';
        document.getElementById('return-items-body').innerHTML = '';
        this.state.selectedInvoiceId = null;
        this.state.invoiceItems = [];
        
        try {
            const parentSelect = document.getElementById('return-parent-id');
            parentSelect.innerHTML = '<option value="">Select...</option>';
            
            const url = this.state.type === 'sales' ? '/api/invoices?status=paid,partial' : '/api/purchases?status=paid,partial';
            const res = await API.get(url);
            const items = res.data || (this.state.type === 'sales' ? res.invoices : res.purchases) || (Array.isArray(res) ? res : []);
            
            items.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.id;
                const num = item.invoice_number || item.purchase_number || item.id;
                const name = item.customer_name || item.supplier_name || 'Unknown';
                const total = item.grand_total !== undefined ? item.grand_total : (item.total || 0);
                opt.textContent = `${num} - ${name} (${App.currency(total)})`;
                parentSelect.appendChild(opt);
            });

            App.showModal('return-modal');
        } catch (err) {
            App.toast('Error loading list', 'error');
        }
    },

    async loadItems(id) {
        const container = document.getElementById('return-items-container');
        const tbody = document.getElementById('return-items-body');
        
        if (!id) {
            container.style.display = 'none';
            return;
        }

        try {
            const url = this.state.type === 'sales' ? `/api/invoices/${id}` : `/api/purchases/${id}`;
            const res = await API.get(url);
            this.state.selectedInvoiceId = id;
            this.state.invoiceItems = res.items || [];

            if (this.state.invoiceItems.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5">No items found.</td></tr>';
            } else {
                tbody.innerHTML = this.state.invoiceItems.map((item, idx) => `
                    <tr>
                        <td><input type="checkbox" class="return-item-cb" data-idx="${idx}"></td>
                        <td>${item.product_name}</td>
                        <td>${item.quantity}</td>
                        <td>${App.currency(item.price !== undefined ? item.price : item.selling_price || item.purchase_price)}</td>
                        <td><input type="number" class="form-input return-qty-input" data-idx="${idx}" max="${item.quantity}" min="1" value="${item.quantity}" disabled style="width:80px;"></td>
                    </tr>
                `).join('');
                
                // Add change listeners
                document.querySelectorAll('.return-item-cb').forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const idx = e.target.dataset.idx;
                        const qtyInput = document.querySelector(`.return-qty-input[data-idx="${idx}"]`);
                        if (qtyInput) qtyInput.disabled = !e.target.checked;
                    });
                });
            }
            container.style.display = 'block';
        } catch (err) {
            App.toast('Error loading items', 'error');
            container.style.display = 'none';
        }
    },

    toggleAllItems(checked) {
        document.querySelectorAll('.return-item-cb').forEach(cb => {
            cb.checked = checked;
            const idx = cb.dataset.idx;
            const qtyInput = document.querySelector(`.return-qty-input[data-idx="${idx}"]`);
            if (qtyInput) qtyInput.disabled = !checked;
        });
    },

    async submitReturn() {
        if (!this.state.selectedInvoiceId) {
            App.toast('Please select a valid record', 'warning');
            return;
        }

        const selectedItems = [];
        document.querySelectorAll('.return-item-cb:checked').forEach(cb => {
            const idx = cb.dataset.idx;
            const item = this.state.invoiceItems[idx];
            const qtyInput = document.querySelector(`.return-qty-input[data-idx="${idx}"]`);
            const returnQty = qtyInput ? qtyInput.value : item.quantity;
            
            selectedItems.push({
                product_id: item.product_id,
                quantity: parseFloat(returnQty),
                price: parseFloat(item.price !== undefined ? item.price : (item.selling_price || item.purchase_price || 0))
            });
        });

        if (selectedItems.length === 0) {
            App.toast('Please select at least one item to return', 'warning');
            return;
        }

        const data = {
            id: this.state.selectedInvoiceId,
            items: selectedItems,
            reason: document.getElementById('return-reason').value
        };

        const btn = document.getElementById('return-submit-btn');
        try {
            const endpoint = this.state.type === 'sales' ? '/api/returns/sales' : '/api/returns/purchases';
            if (this.state.type === 'sales') {
                data.invoice_id = this.state.selectedInvoiceId;
            } else {
                data.purchase_id = this.state.selectedInvoiceId;
            }
            
            await API.submitOnce(btn, () => API.post(endpoint, data));
            App.toast('Return processed successfully', 'success');
            App.closeModal('return-modal');
            this.loadList(1);
        } catch (err) {
            App.toast(err.message || 'Error processing return', 'error');
        }
    }
};
