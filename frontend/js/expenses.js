window.Expenses = {
    state: {
        page: 1,
        totalPages: 1,
        search: '',
        category: '',
        method: '',
        from: '',
        to: '',
        categories: []
    },

    render() {
        return `
            <div class="page-header">
                <h2>Expenses</h2>
                <button class="btn btn-primary" onclick="Expenses.showAddModal()">+ Add Expense</button>
            </div>
            
            <div class="card mt-4">
                <div class="card-body">
                    <div class="toolbar mb-4" style="display:flex; flex-wrap:wrap; gap:10px;">
                        <input type="text" id="exp-search" class="form-input search-input" placeholder="Search description..." value="${this.state.search}">
                        <select id="exp-category" class="form-select">
                            <option value="">All Categories</option>
                        </select>
                        <select id="exp-method" class="form-select">
                            <option value="">All Methods</option>
                            <option value="cash">Cash</option>
                            <option value="bank">Bank</option>
                            <option value="upi">UPI</option>
                            <option value="other">Other</option>
                        </select>
                        <input type="date" id="exp-from" class="form-input" title="From Date" value="${this.state.from}">
                        <input type="date" id="exp-to" class="form-input" title="To Date" value="${this.state.to}">
                        <button class="btn btn-secondary" onclick="Expenses.loadList(1)">Filter</button>
                        <button class="btn btn-secondary" onclick="Expenses.resetFilters()">Reset</button>
                    </div>

                    <div class="table-responsive" id="expenses-table-container">
                        <p>Loading...</p>
                    </div>
                </div>
            </div>

            <!-- Expense Modal -->
            <div class="modal-overlay" id="expense-modal">
                <div class="modal">
                    <div class="modal-header">
                        <h3 id="expense-modal-title">Add Expense</h3>
                        <button class="btn-icon" onclick="App.closeModal('expense-modal')">&times;</button>
                    </div>
                    <form id="expense-form">
                        <div class="modal-body">
                            <input type="hidden" id="expense-id">
                            <div class="form-group">
                                <label class="form-label">Category</label>
                                <select class="form-select" id="expense-category-select" required>
                                    <option value="">Select Category...</option>
                                </select>
                            </div>
                            <div class="form-row">
                                <div class="form-group" style="flex:1;">
                                    <label class="form-label">Amount</label>
                                    <input type="number" step="0.01" class="form-input" id="expense-amount" required>
                                </div>
                                <div class="form-group" style="flex:1;">
                                    <label class="form-label">Date</label>
                                    <input type="date" class="form-input" id="expense-date" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Payment Method</label>
                                <select class="form-select" id="expense-method" required>
                                    <option value="cash">Cash</option>
                                    <option value="upi">UPI</option>
                                    <option value="bank">Bank</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Description</label>
                                <textarea class="form-textarea" id="expense-description"></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="App.closeModal('expense-modal')">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="expense-submit-btn">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    async init() {
        this.bindEvents();
        try {
            const catRes = await API.get('/api/categories?type=expense');
            const cats = Array.isArray(catRes) ? catRes : (catRes.data || catRes.categories || []);
            this.state.categories = cats;
            const catSelect = document.getElementById('exp-category');
            const modalCatSelect = document.getElementById('expense-category-select');
            if (catSelect && modalCatSelect) {
                const options = this.state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                catSelect.innerHTML = '<option value="">All Categories</option>' + options;
                modalCatSelect.innerHTML = '<option value="">Select Category...</option>' + options;
            }
        } catch (e) {
            console.error(e);
        }

        this.loadList(1);
    },

    bindEvents() {
        const appContent = document.getElementById('app-content');
        
        // Form submit
        appContent.addEventListener('submit', async (e) => {
            if (e.target.id === 'expense-form') {
                e.preventDefault();
                await this.saveExpense();
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

    resetFilters() {
        if (document.getElementById('exp-search')) document.getElementById('exp-search').value = '';
        if (document.getElementById('exp-category')) document.getElementById('exp-category').value = '';
        if (document.getElementById('exp-method')) document.getElementById('exp-method').value = '';
        if (document.getElementById('exp-from')) document.getElementById('exp-from').value = '';
        if (document.getElementById('exp-to')) document.getElementById('exp-to').value = '';
        this.loadList(1);
    },

    goToPage(page) {
        this.loadList(page);
    },

    async loadList(page = 1) {
        this.state.page = page;
        this.state.search = document.getElementById('exp-search') ? document.getElementById('exp-search').value : '';
        this.state.category = document.getElementById('exp-category') ? document.getElementById('exp-category').value : '';
        this.state.method = document.getElementById('exp-method') ? document.getElementById('exp-method').value : '';
        this.state.from = document.getElementById('exp-from') ? document.getElementById('exp-from').value : '';
        this.state.to = document.getElementById('exp-to') ? document.getElementById('exp-to').value : '';

        const container = document.getElementById('expenses-table-container');
        if (!container) return;

        try {
            let url = `/api/expenses?page=${this.state.page}&search=${encodeURIComponent(this.state.search)}&category_id=${this.state.category}&method=${this.state.method}&from=${this.state.from}&to=${this.state.to}`;
            const res = await API.get(url);
            const expenses = res.data || res.expenses || (Array.isArray(res) ? res : []);
            
            if (expenses.length === 0) {
                container.innerHTML = `<div class="empty-state">No expenses found.</div>`;
                return;
            }

            this.state.totalPages = (res.pagination && res.pagination.totalPages) || res.totalPages || res.pages || 1;

            let html = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Payment Method</th>
                            <th>Amount</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            expenses.forEach(ex => {
                html += `
                    <tr>
                        <td>${App.formatDate(ex.date)}</td>
                        <td>${ex.category_name || '-'}</td>
                        <td>${ex.description || '-'}</td>
                        <td><span class="badge badge-secondary">${(ex.payment_method || ex.method || 'cash').toUpperCase()}</span></td>
                        <td><strong>${App.currency(ex.amount)}</strong></td>
                        <td>
                            <button class="btn btn-sm btn-secondary" onclick="Expenses.edit(${ex.id})">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="Expenses.delete(${ex.id})">Del</button>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table>`;
            html += App.paginationHtml(this.state.page, this.state.totalPages, 'Expenses.goToPage');
            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = `<div class="empty-state">Error loading expenses.</div>`;
        }
    },

    showAddModal() {
        document.getElementById('expense-id').value = '';
        document.getElementById('expense-form').reset();
        document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('expense-modal-title').textContent = 'Add Expense';
        App.showModal('expense-modal');
    },

    async edit(id) {
        try {
            const ex = await API.get(`/api/expenses/${id}`);
            document.getElementById('expense-id').value = ex.id;
            document.getElementById('expense-category-select').value = ex.category_id || '';
            document.getElementById('expense-amount').value = ex.amount;
            document.getElementById('expense-date').value = ex.date ? ex.date.split('T')[0] : '';
            document.getElementById('expense-method').value = ex.payment_method;
            document.getElementById('expense-description').value = ex.description || '';
            
            document.getElementById('expense-modal-title').textContent = 'Edit Expense';
            App.showModal('expense-modal');
        } catch (err) {
            App.toast('Error loading expense details', 'error');
        }
    },

    async delete(id) {
        App.confirm('Are you sure you want to delete this expense?', async () => {
            try {
                await API.delete(`/api/expenses/${id}`);
                App.toast('Expense deleted', 'success');
                this.loadList(this.state.page);
            } catch (err) {
                App.toast(err.message || 'Error deleting expense', 'error');
            }
        });
    },

    async saveExpense() {
        const id = document.getElementById('expense-id').value;
        const data = {
            category_id: document.getElementById('expense-category-select').value,
            amount: parseFloat(document.getElementById('expense-amount').value),
            date: document.getElementById('expense-date').value,
            payment_method: document.getElementById('expense-method').value,
            description: document.getElementById('expense-description').value
        };

        const btn = document.getElementById('expense-submit-btn');
        try {
            if (id) {
                await API.submitOnce(btn, () => API.put(`/api/expenses/${id}`, data));
                App.toast('Expense updated', 'success');
            } else {
                await API.submitOnce(btn, () => API.post('/api/expenses', data));
                App.toast('Expense added', 'success');
            }
            App.closeModal('expense-modal');
            this.loadList(this.state.page);
        } catch (err) {
            App.toast(err.message || 'Error saving expense', 'error');
        }
    }
};
