window.Products = {
    state: {
        page: 1,
        search: '',
        category: ''
    },
    render: function(action) {
        return `
            <div class="page-header">
                <h2>Products</h2>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="Products.showAddModal()">Add Product</button>
                </div>
            </div>
            <div class="toolbar form-row">
                <div class="form-group">
                    <input type="text" id="productSearch" class="form-input search-input" placeholder="Search products...">
                </div>
                <div class="form-group">
                    <select id="productCategoryFilter" class="form-select">
                        <option value="">All Categories</option>
                    </select>
                </div>
            </div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th>Purchase Price</th>
                            <th>Selling Price</th>
                            <th>Stock</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="productsTableBody">
                        <tr><td colspan="8" class="empty-state">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="productsPagination" class="pagination"></div>
        `;
    },
    init: function(action) {
        this.loadCategories();
        this.loadList(this.state.page, this.state.search, this.state.category);

        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            searchInput.addEventListener('input', App.debounce((e) => {
                this.state.search = e.target.value;
                this.state.page = 1;
                this.loadList(this.state.page, this.state.search, this.state.category);
            }, 300));
        }

        const categoryFilter = document.getElementById('productCategoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.state.category = e.target.value;
                this.state.page = 1;
                this.loadList(this.state.page, this.state.search, this.state.category);
            });
        }
    },
    async loadCategories() {
        try {
            const categories = await API.get('/api/categories?type=product');
            const select = document.getElementById('productCategoryFilter');
            if (select && categories) {
                let html = '<option value="">All Categories</option>';
                categories.forEach(c => {
                    html += `<option value="${c.id}">${c.name}</option>`;
                });
                select.innerHTML = html;
            }
        } catch (e) {
            console.error('Failed to load categories', e);
        }
    },
    async loadList(page = 1, search = '', category = '') {
        const tbody = document.getElementById('productsTableBody');
        const pagination = document.getElementById('productsPagination');
        if (!tbody) return;

        try {
            const res = await API.get(`/api/products?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&page=${page}&limit=25`);
            const products = res.data || res.products || [];
            
            if (products.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No products found.</td></tr>';
                if(pagination) pagination.innerHTML = '';
                return;
            }

            let html = '';
            products.forEach(p => {
                const stockBadge = (p.current_stock <= p.min_stock) ? 'badge-danger' : 'badge-success';
                const stockLabel = (p.current_stock <= p.min_stock) ? 'Low Stock' : 'OK';
                
                html += `
                    <tr>
                        <td><strong>${p.name}</strong></td>
                        <td>${p.sku || '-'}</td>
                        <td>${p.category_name || p.category || '-'}</td>
                        <td>${App.currency(p.purchase_price)}</td>
                        <td>${App.currency(p.selling_price || p.price)}</td>
                        <td>
                            ${p.current_stock} <span class="badge ${stockBadge}">${stockLabel}</span>
                        </td>
                        <td>${p.status || (p.active ? 'Active' : 'Inactive')}</td>
                        <td>
                            <button class="btn btn-sm btn-icon" onclick="Products.edit(${p.id})">Edit</button>
                            <button class="btn btn-sm btn-danger btn-icon" onclick="Products.delete(${p.id})">Delete</button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

            if (pagination) {
                const totalPages = (res.pagination && res.pagination.totalPages) || res.totalPages || 1;
                const curPage = (res.pagination && res.pagination.page) || res.page || page;
                pagination.innerHTML = App.paginationHtml(curPage, totalPages, 'Products.changePage');
            }
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Error loading products.</td></tr>';
            App.toast('Failed to load products', 'error');
        }
    },
    changePage: function(page) {
        this.state.page = page;
        this.loadList(this.state.page, this.state.search, this.state.category);
    },
    showAddModal: async function(product = null) {
        const isEdit = !!product;
        const categories = await API.get('/api/categories?type=product') || [];
        const catOptions = categories.map(c => `<option value="${c.id}" ${product && product.category_id == c.id ? 'selected' : ''}>${c.name}</option>`).join('');

        const modalHtml = `
            <div class="modal-header">
                <h3>${isEdit ? 'Edit Product' : 'Add Product'}</h3>
                <button class="btn-icon" onclick="App.closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <form id="productForm">
                    <input type="hidden" id="productId" value="${product ? product.id : ''}">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Name *</label>
                            <input type="text" id="productName" class="form-input" required value="${product ? product.name : ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">SKU</label>
                            <input type="text" id="productSku" class="form-input" placeholder="Auto-generated if empty" value="${product ? product.sku : ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Category</label>
                            <select id="productCategory" class="form-select">
                                <option value="">Select Category</option>
                                ${catOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Barcode</label>
                            <input type="text" id="productBarcode" class="form-input" value="${product ? product.barcode : ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Purchase Price</label>
                            <input type="number" step="0.01" id="productPurchasePrice" class="form-input" value="${product ? product.purchase_price : '0'}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Selling Price</label>
                            <input type="number" step="0.01" id="productSellingPrice" class="form-input" value="${product ? product.selling_price : '0'}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tax Rate (%)</label>
                            <input type="number" step="0.01" id="productTaxRate" class="form-input" value="${product ? product.tax_rate : '0'}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Opening Stock</label>
                            <input type="number" step="0.01" id="productOpeningStock" class="form-input" value="${product ? product.opening_stock : '0'}" ${isEdit ? 'disabled' : ''}>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Min Stock</label>
                            <input type="number" step="0.01" id="productMinStock" class="form-input" value="${product ? product.min_stock : '0'}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Unit</label>
                            <input type="text" id="productUnit" class="form-input" placeholder="e.g. pcs, kg" value="${product ? product.unit : 'pcs'}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea id="productDescription" class="form-textarea">${product && product.description ? product.description : ''}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="Products.save()">Save</button>
            </div>
        `;
        App.showModal(modalHtml);
    },
    async save() {
        const id = document.getElementById('productId').value;
        const name = document.getElementById('productName').value;
        if (!name) return App.toast('Name is required', 'error');

        const payload = {
            name,
            sku: document.getElementById('productSku').value,
            category_id: document.getElementById('productCategory').value,
            barcode: document.getElementById('productBarcode').value,
            purchase_price: parseFloat(document.getElementById('productPurchasePrice').value) || 0,
            selling_price: parseFloat(document.getElementById('productSellingPrice').value) || 0,
            tax_rate: parseFloat(document.getElementById('productTaxRate').value) || 0,
            opening_stock: parseFloat(document.getElementById('productOpeningStock').value) || 0,
            min_stock: parseFloat(document.getElementById('productMinStock').value) || 0,
            unit: document.getElementById('productUnit').value,
            description: document.getElementById('productDescription').value
        };

        try {
            if (id) {
                await API.put(`/api/products/${id}`, payload);
                App.toast('Product updated successfully', 'success');
            } else {
                await API.post('/api/products', payload);
                App.toast('Product added successfully', 'success');
            }
            App.closeModal();
            this.loadList(this.state.page, this.state.search, this.state.category);
        } catch (e) {
            App.toast(e.message || 'Error saving product', 'error');
        }
    },
    async edit(id) {
        try {
            const product = await API.get(`/api/products/${id}`);
            this.showAddModal(product);
        } catch (e) {
            App.toast('Error loading product details', 'error');
        }
    },
    async delete(id) {
        if (await App.confirm('Are you sure you want to delete this product?')) {
            try {
                await API.delete(`/api/products/${id}`);
                App.toast('Product deleted', 'success');
                this.loadList(this.state.page, this.state.search, this.state.category);
            } catch (e) {
                App.toast(e.message || 'Error deleting product', 'error');
            }
        }
    }
};
