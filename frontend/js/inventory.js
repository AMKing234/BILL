window.Inventory = {
    state: {
        activeTab: 'current', // current, low, history, adjust
        currentStock: { data: [], page: 1, totalPages: 1, search: '', category: '' },
        lowStock: { data: [] },
        history: { data: [], page: 1, totalPages: 1 },
        categories: []
    },

    render(action) {
        if (action && ['current', 'low', 'history', 'adjust'].includes(action)) {
            this.state.activeTab = action;
        }

        const tabs = `
            <div class="tabs">
                <button class="tab-item ${this.state.activeTab === 'current' ? 'active' : ''}" data-tab="current">Current Stock</button>
                <button class="tab-item ${this.state.activeTab === 'low' ? 'active' : ''}" data-tab="low">Low Stock</button>
                <button class="tab-item ${this.state.activeTab === 'history' ? 'active' : ''}" data-tab="history">Stock History</button>
                <button class="tab-item ${this.state.activeTab === 'adjust' ? 'active' : ''}" data-tab="adjust">Adjust Stock</button>
            </div>
        `;

        let content = '';
        if (this.state.activeTab === 'current') {
            content = this.renderCurrentStock();
        } else if (this.state.activeTab === 'low') {
            content = this.renderLowStock();
        } else if (this.state.activeTab === 'history') {
            content = this.renderStockHistory();
        } else if (this.state.activeTab === 'adjust') {
            content = this.renderAdjustStock();
        }

        return `
            <div class="page-header">
                <h2>Inventory Management</h2>
            </div>
            ${tabs}
            <div class="card mt-4">
                <div class="card-body" id="inventory-tab-content">
                    ${content}
                </div>
            </div>
        `;
    },

    renderCurrentStock() {
        return `
            <div class="toolbar mb-4" style="display:flex; gap:10px;">
                <input type="text" id="inv-search" class="form-input search-input" placeholder="Search products..." value="${this.state.currentStock.search}">
                <select id="inv-category" class="form-select">
                    <option value="">All Categories</option>
                    ${this.state.categories.map(c => `<option value="${c.id}" ${this.state.currentStock.category == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="table-responsive" id="inv-current-table-container">
                <p>Loading...</p>
            </div>
        `;
    },

    renderLowStock() {
        return `
            <div class="table-responsive" id="inv-low-table-container">
                <p>Loading...</p>
            </div>
        `;
    },

    renderStockHistory() {
        return `
            <div class="table-responsive" id="inv-history-table-container">
                <p>Loading...</p>
            </div>
        `;
    },

    renderAdjustStock() {
        return `
            <form id="adjust-stock-form" style="max-width: 500px;">
                <div class="form-group">
                    <label class="form-label">Product</label>
                    <select class="form-select" id="adjust-product_id" required>
                        <option value="">Select Product...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Quantity (+/-)</label>
                    <input type="number" class="form-input" id="adjust-quantity" required placeholder="e.g. 5 to add, -3 to remove">
                </div>
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <textarea class="form-textarea" id="adjust-notes" required placeholder="Reason for adjustment"></textarea>
                </div>
                <button type="submit" class="btn btn-primary" id="adjust-submit-btn">Adjust Stock</button>
            </form>
        `;
    },

    async init(action) {
        this.bindEvents();
        try {
            const catRes = await API.get('/api/categories?type=product');
            const cats = Array.isArray(catRes) ? catRes : (catRes.data || catRes.categories || []);
            this.state.categories = cats;
        } catch (e) {
            console.error(e);
        }

        if (this.state.activeTab === 'current') {
            this.loadCurrentStock();
        } else if (this.state.activeTab === 'low') {
            this.loadLowStock();
        } else if (this.state.activeTab === 'history') {
            this.loadStockHistory();
        } else if (this.state.activeTab === 'adjust') {
            this.loadProductsForAdjust();
        }
    },

    bindEvents() {
        const appContent = document.getElementById('app-content');
        
        // Tab switching
        appContent.addEventListener('click', (e) => {
            if (e.target.closest('.tab-item')) {
                const tab = e.target.closest('.tab-item').dataset.tab;
                App.navigate('/inventory/' + tab);
            }
        });

        // Current stock search & filter
        appContent.addEventListener('input', App.debounce((e) => {
            if (e.target.id === 'inv-search') {
                this.state.currentStock.search = e.target.value;
                this.state.currentStock.page = 1;
                this.loadCurrentStock();
            }
        }, 300));

        appContent.addEventListener('change', (e) => {
            if (e.target.id === 'inv-category') {
                this.state.currentStock.category = e.target.value;
                this.state.currentStock.page = 1;
                this.loadCurrentStock();
            }
        });

        // Pagination
        appContent.addEventListener('click', (e) => {
            if (e.target.closest('.page-btn')) {
                const btn = e.target.closest('.page-btn');
                const page = btn.dataset.page;
                if (!page) return;
                
                if (this.state.activeTab === 'current') {
                    this.state.currentStock.page = parseInt(page);
                    this.loadCurrentStock();
                } else if (this.state.activeTab === 'history') {
                    this.state.history.page = parseInt(page);
                    this.loadStockHistory();
                }
            }
        });

        // Adjust form submit
        appContent.addEventListener('submit', async (e) => {
            if (e.target.id === 'adjust-stock-form') {
                e.preventDefault();
                const btn = document.getElementById('adjust-submit-btn');
                const data = {
                    product_id: document.getElementById('adjust-product_id').value,
                    quantity: document.getElementById('adjust-quantity').value,
                    notes: document.getElementById('adjust-notes').value
                };
                
                try {
                    await API.submitOnce(btn, () => API.post('/api/inventory/adjust', data));
                    App.toast('Stock adjusted successfully', 'success');
                    e.target.reset();
                } catch (err) {
                    App.toast(err.message || 'Error adjusting stock', 'error');
                }
            }
        });
    },

    async loadCurrentStock() {
        const container = document.getElementById('inv-current-table-container');
        if (!container) return;
        
        try {
            const { search, category, page } = this.state.currentStock;
            const res = await API.get(`/api/products?search=${encodeURIComponent(search || '')}&category_id=${encodeURIComponent(category || '')}&page=${page || 1}`);
            const products = res.data || res.products || (Array.isArray(res) ? res : []);
            
            if (products.length === 0) {
                container.innerHTML = `<div class="empty-state">No products found.</div>`;
                return;
            }

            this.state.currentStock.totalPages = (res.pagination && res.pagination.totalPages) || res.totalPages || res.pages || 1;

            let html = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Product Name</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th>Current Stock</th>
                            <th>Min Stock</th>
                            <th>Unit</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            products.forEach(p => {
                let statusBadge = '';
                if (p.current_stock <= 0) {
                    statusBadge = '<span class="badge badge-danger">Out of Stock</span>';
                } else if (p.current_stock <= p.min_stock) {
                    statusBadge = '<span class="badge badge-warning">Low Stock</span>';
                } else {
                    statusBadge = '<span class="badge badge-success">In Stock</span>';
                }

                html += `
                    <tr>
                        <td><strong>${p.name}</strong></td>
                        <td>${p.sku || '-'}</td>
                        <td>${p.category_name || p.category || '-'}</td>
                        <td><strong>${p.current_stock}</strong></td>
                        <td>${p.min_stock || 0}</td>
                        <td>${p.unit || '-'}</td>
                        <td>${statusBadge}</td>
                    </tr>
                `;
            });

            html += `</tbody></table>`;
            html += App.paginationHtml(this.state.currentStock.page, this.state.currentStock.totalPages, 'Inventory.goToStockPage');
            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = `<div class="empty-state">Error loading stock data.</div>`;
        }
    },

    goToStockPage(page) {
        this.state.currentStock.page = page;
        this.loadCurrentStock();
    },

    goToHistoryPage(page) {
        this.state.history.page = page;
        this.loadStockHistory();
    },

    async loadLowStock() {
        const container = document.getElementById('inv-low-table-container');
        if (!container) return;
        
        try {
            const res = await API.get('/api/inventory/low-stock');
            const products = res.data || res.products || res.lowStock || (Array.isArray(res) ? res : []);
            if (products.length === 0) {
                container.innerHTML = `<div class="empty-state">No low stock products found.</div>`;
                return;
            }

            let html = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Product Name</th>
                            <th>SKU</th>
                            <th>Current Stock</th>
                            <th>Min Stock</th>
                            <th>Unit</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            products.forEach(p => {
                html += `
                    <tr>
                        <td><strong>${p.name}</strong></td>
                        <td>${p.sku || '-'}</td>
                        <td><strong style="color:var(--danger-color)">${p.current_stock}</strong></td>
                        <td>${p.min_stock || 0}</td>
                        <td>${p.unit || '-'}</td>
                        <td><span class="badge badge-danger">Low Stock</span></td>
                    </tr>
                `;
            });

            html += `</tbody></table>`;
            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = `<div class="empty-state">Error loading low stock data.</div>`;
        }
    },

    async loadStockHistory() {
        const container = document.getElementById('inv-history-table-container');
        if (!container) return;
        
        try {
            const res = await API.get(`/api/inventory/history?page=${this.state.history.page}&limit=25`);
            const history = res.data || res.history || (Array.isArray(res) ? res : []);
            if (history.length === 0) {
                container.innerHTML = `<div class="empty-state">No stock history found.</div>`;
                return;
            }

            this.state.history.totalPages = (res.pagination && res.pagination.totalPages) || res.totalPages || res.pages || 1;

            let html = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Product</th>
                            <th>Type</th>
                            <th>Quantity</th>
                            <th>Previous Stock</th>
                            <th>New Stock</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            history.forEach(h => {
                let qtyColor = h.quantity > 0 ? 'var(--success-color)' : 'var(--danger-color)';
                let qtyText = h.quantity > 0 ? `+${h.quantity}` : h.quantity;
                html += `
                    <tr>
                        <td>${App.formatDate(h.created_at)}</td>
                        <td><strong>${h.product_name}</strong></td>
                        <td><span class="badge badge-secondary">${h.type}</span></td>
                        <td style="color:${qtyColor}; font-weight:bold;">${qtyText}</td>
                        <td>${h.previous_stock}</td>
                        <td>${h.new_stock}</td>
                        <td>${h.notes || '-'}</td>
                    </tr>
                `;
            });

            html += `</tbody></table>`;
            html += App.paginationHtml(this.state.history.page, this.state.history.totalPages, 'Inventory.goToHistoryPage');
            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = `<div class="empty-state">Error loading history data.</div>`;
        }
    },

    async loadProductsForAdjust() {
        const select = document.getElementById('adjust-product_id');
        if (!select) return;
        try {
            const res = await API.get('/api/products?limit=1000');
            const prods = res.data || res.products || (Array.isArray(res) ? res : []);
            select.innerHTML = '<option value="">Select Product...</option>';
            prods.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${p.name} (Stock: ${p.current_stock})`;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error("Failed to load products for adjust:", e);
        }
    }
};
