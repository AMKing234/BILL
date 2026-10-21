window.Suppliers = {
    state: {
        page: 1,
        search: ''
    },
    render: function() {
        return `
            <div class="page-header">
                <h2>Suppliers</h2>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="Suppliers.showAddModal()">Add Supplier</button>
                </div>
            </div>
            <div class="toolbar form-row">
                <div class="form-group">
                    <input type="text" id="supplierSearch" class="form-input search-input" placeholder="Search suppliers...">
                </div>
            </div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>GSTIN</th>
                            <th>Total Purchases</th>
                            <th>Due Amount</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="suppliersTableBody">
                        <tr><td colspan="7" class="empty-state">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="suppliersPagination" class="pagination"></div>
        `;
    },
    init: function() {
        this.loadList(this.state.page, this.state.search);

        const searchInput = document.getElementById('supplierSearch');
        if (searchInput) {
            searchInput.addEventListener('input', App.debounce((e) => {
                this.state.search = e.target.value;
                this.state.page = 1;
                this.loadList(this.state.page, this.state.search);
            }, 300));
        }
    },
    async loadList(page = 1, search = '') {
        const tbody = document.getElementById('suppliersTableBody');
        const pagination = document.getElementById('suppliersPagination');
        if (!tbody) return;

        try {
            const res = await API.get(`/api/suppliers?search=${encodeURIComponent(search)}&page=${page}&limit=25`);
            const suppliers = res.data || res.suppliers || [];
            
            if (suppliers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No suppliers found.</td></tr>';
                if(pagination) pagination.innerHTML = '';
                return;
            }

            let html = '';
            suppliers.forEach(s => {
                const totalPurchases = s.total_purchases !== undefined ? s.total_purchases : (s.totalPurchases || 0);
                const dueAmount = s.due_amount !== undefined ? s.due_amount : (s.due || 0);
                
                html += `
                    <tr>
                        <td><strong>${s.name}</strong></td>
                        <td>${s.phone || '-'}</td>
                        <td>${s.email || '-'}</td>
                        <td>${s.gstin || '-'}</td>
                        <td>${App.currency(totalPurchases)}</td>
                        <td>
                            <span class="${dueAmount > 0 ? 'badge badge-danger' : 'badge badge-success'}">
                                ${App.currency(dueAmount)}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-icon" onclick="Suppliers.viewLedger(${s.id}, '${s.name}')">Ledger</button>
                            <button class="btn btn-sm btn-icon" onclick="Suppliers.edit(${s.id})">Edit</button>
                            <button class="btn btn-sm btn-danger btn-icon" onclick="Suppliers.delete(${s.id})">Del</button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

            if (pagination) {
                const totalPages = (res.pagination && res.pagination.totalPages) || res.totalPages || 1;
                const curPage = (res.pagination && res.pagination.page) || res.page || page;
                pagination.innerHTML = App.paginationHtml(curPage, totalPages, 'Suppliers.changePage');
            }
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Error loading suppliers.</td></tr>';
            App.toast('Failed to load suppliers', 'error');
        }
    },
    changePage: function(page) {
        this.state.page = page;
        this.loadList(this.state.page, this.state.search);
    },
    showAddModal: function(supplier = null) {
        const isEdit = !!supplier;
        const html = `
            <div class="modal-header">
                <h3>${isEdit ? 'Edit Supplier' : 'Add Supplier'}</h3>
                <button class="btn-icon" onclick="App.closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <form id="supplierForm">
                    <input type="hidden" id="supId" value="${supplier ? supplier.id : ''}">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Name *</label>
                            <input type="text" id="supName" class="form-input" required value="${supplier ? supplier.name : ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Phone</label>
                            <input type="text" id="supPhone" class="form-input" value="${supplier ? supplier.phone : ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" id="supEmail" class="form-input" value="${supplier ? supplier.email : ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">GSTIN</label>
                            <input type="text" id="supGstin" class="form-input" value="${supplier ? supplier.gstin : ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Address</label>
                        <textarea id="supAddress" class="form-textarea">${supplier && supplier.address ? supplier.address : ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Notes</label>
                        <textarea id="supNotes" class="form-textarea">${supplier && supplier.notes ? supplier.notes : ''}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="Suppliers.save()">Save</button>
            </div>
        `;
        App.showModal(html);
    },
    save: async function() {
        const id = document.getElementById('supId').value;
        const name = document.getElementById('supName').value;
        if (!name) return App.toast('Name is required', 'error');

        const payload = {
            name,
            phone: document.getElementById('supPhone').value,
            email: document.getElementById('supEmail').value,
            address: document.getElementById('supAddress').value,
            gstin: document.getElementById('supGstin').value,
            notes: document.getElementById('supNotes').value
        };

        try {
            if (id) {
                await API.put(`/api/suppliers/${id}`, payload);
                App.toast('Supplier updated successfully', 'success');
            } else {
                await API.post('/api/suppliers', payload);
                App.toast('Supplier added successfully', 'success');
            }
            App.closeModal();
            this.loadList(this.state.page, this.state.search);
        } catch (e) {
            App.toast(e.message || 'Error saving supplier', 'error');
        }
    },
    edit: async function(id) {
        try {
            const supplier = await API.get(`/api/suppliers/${id}`);
            this.showAddModal(supplier);
        } catch (e) {
            App.toast('Error loading supplier details', 'error');
        }
    },
    delete: async function(id) {
        if (await App.confirm('Are you sure you want to delete this supplier?')) {
            try {
                await API.delete(`/api/suppliers/${id}`);
                App.toast('Supplier deleted', 'success');
                this.loadList(this.state.page, this.state.search);
            } catch (e) {
                App.toast(e.message || 'Error deleting supplier', 'error');
            }
        }
    },
    viewLedger: async function(supplierId, supplierName) {
        try {
            const res = await API.get(`/api/suppliers/${supplierId}/ledger`);
            const ledger = res.data || [];
            
            let tbody = '';
            let balance = 0;
            
            ledger.forEach(entry => {
                const isPurchase = entry.type === 'purchase';
                const credit = isPurchase ? entry.amount : 0; // we owe supplier
                const debit = !isPurchase ? entry.amount : 0; // we paid supplier
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
                    <h3>Ledger for ${supplierName}</h3>
                    <button class="btn-icon" onclick="App.closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Credit (We Owe)</th>
                                <th>Debit (We Paid)</th>
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
            App.toast('Error loading supplier ledger', 'error');
        }
    }
};
