const Customers = {
  currentPage: 1,
  currentSearch: '',
  
  render() {
    return `
      <div class="page-header">
        <h2>Customers</h2>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="Customers.showAddModal()">Add Customer</button>
        </div>
      </div>
      <div class="toolbar">
        <input type="text" id="customer-search" class="search-input" placeholder="Search customers..." oninput="Customers.handleSearch(this.value)">
      </div>
      <div class="table-responsive" id="customers-table-container">
        <!-- Table will be rendered here -->
        <p>Loading...</p>
      </div>
      <div id="customers-pagination"></div>
    `;
  },
  
  init() {
    this.currentPage = 1;
    this.currentSearch = '';
    this.loadList(this.currentPage, this.currentSearch);
  },
  
  handleSearch(query) {
    if (!this._debouncedSearch) {
      this._debouncedSearch = App.debounce((q) => {
        this.currentSearch = q;
        this.currentPage = 1;
        this.loadList(this.currentPage, this.currentSearch);
      }, 300);
    }
    this._debouncedSearch(query);
  },
  
  async loadList(page, search) {
    try {
      const data = await API.get(`/api/customers?search=${encodeURIComponent(search || '')}&page=${page || 1}`);
      const list = data.customers || data.data || [];
      this.renderTable(list);
      const paginationContainer = document.getElementById('customers-pagination');
      if (paginationContainer) {
        paginationContainer.innerHTML = App.paginationHtml(data.page || 1, data.totalPages || 1, 'Customers.goToPage');
      }
    } catch (err) {
      const container = document.getElementById('customers-table-container');
      if (container) {
        container.innerHTML = `<div class="empty-state">Failed to load customers: ${err.message}</div>`;
      }
    }
  },
  
  goToPage(page) {
    this.currentPage = page;
    this.loadList(this.currentPage, this.currentSearch);
  },
  
  renderTable(customers) {
    const container = document.getElementById('customers-table-container');
    if (!container) return;
    
    if (!customers || customers.length === 0) {
      container.innerHTML = `<div class="empty-state">No customers found. Click "Add Customer" to create one.</div>`;
      return;
    }
    
    let html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Total Sales</th>
            <th>Due</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${customers.map(c => `
            <tr>
              <td><strong>${c.name}</strong></td>
              <td>${c.phone || '-'}</td>
              <td>${c.email || '-'}</td>
              <td>${App.currency(c.totalSales !== undefined ? c.totalSales : c.total_sales)}</td>
              <td>
                <span class="${(c.due || c.total_due) > 0 ? 'badge badge-danger' : 'badge badge-success'}">
                  ${App.currency(c.due !== undefined ? c.due : c.total_due)}
                </span>
              </td>
              <td>
                <button class="btn btn-sm btn-secondary" onclick="Customers.edit(${c.id})">Edit</button>
                <button class="btn btn-sm btn-primary" onclick="Customers.view(${c.id})">Ledger</button>
                <button class="btn btn-sm btn-danger" onclick="Customers.delete(${c.id})">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.innerHTML = html;
  },
  
  showAddModal(customer = null) {
    const isEdit = !!customer;
    const title = isEdit ? 'Edit Customer' : 'Add Customer';
    const idHtml = isEdit ? `<input type="hidden" id="customer-id" value="${customer.id}">` : '';
    
    const bodyHtml = `
      <form id="customer-form" onsubmit="event.preventDefault(); Customers.save();">
        ${idHtml}
        <div class="form-group">
          <label class="form-label">Name *</label>
          <input type="text" id="customer-name" class="form-input" required value="${customer ? customer.name : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input type="text" id="customer-phone" class="form-input" value="${customer && customer.phone ? customer.phone : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="customer-email" class="form-input" value="${customer && customer.email ? customer.email : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Address</label>
          <textarea id="customer-address" class="form-textarea">${customer && customer.address ? customer.address : ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea id="customer-notes" class="form-textarea">${customer && customer.notes ? customer.notes : ''}</textarea>
        </div>
      </form>
    `;
    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button type="submit" form="customer-form" class="btn btn-primary" id="btn-save-customer">Save</button>
    `;
    App.showModal(title, bodyHtml, footerHtml);
  },
  
  async save() {
    const idEl = document.getElementById('customer-id');
    const id = idEl ? idEl.value : null;
    
    const data = {
      name: document.getElementById('customer-name').value,
      phone: document.getElementById('customer-phone').value,
      email: document.getElementById('customer-email').value,
      address: document.getElementById('customer-address').value,
      notes: document.getElementById('customer-notes').value
    };
    
    const btn = document.getElementById('btn-save-customer');
    try {
      if (id) {
        await API.submitOnce('PUT', `/api/customers/${id}`, data, btn);
        App.toast('Customer updated successfully', 'success');
      } else {
        await API.submitOnce('POST', '/api/customers', data, btn);
        App.toast('Customer created successfully', 'success');
      }
      App.closeModal();
      this.loadList(this.currentPage, this.currentSearch);
    } catch (err) {
      App.toast(err.message, 'danger');
    }
  },
  
  async edit(id) {
    try {
      const customer = await API.get(`/api/customers/${id}`);
      this.showAddModal(customer);
    } catch (err) {
      App.toast('Failed to load customer details: ' + err.message, 'danger');
    }
  },
  
  async delete(id) {
    const confirmed = await App.confirm('Are you sure you want to delete this customer? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
      await API.delete(`/api/customers/${id}`);
      App.toast('Customer deleted successfully', 'success');
      this.loadList(this.currentPage, this.currentSearch);
    } catch (err) {
      App.toast('Failed to delete customer: ' + err.message, 'danger');
    }
  },
  
  async view(id) {
    try {
      const c = await API.get(`/api/customers/${id}`);
      const invoices = c.invoices || [];
      const payments = c.payments || [];
      const dueAmt = c.total_due !== undefined ? c.total_due : (c.due || 0);
      const salesAmt = c.total_sales !== undefined ? c.total_sales : (c.totalSales || 0);

      const bodyHtml = `
        <div style="display:flex; flex-wrap:wrap; gap:16px; margin-bottom:16px; padding:12px; background:var(--bg-main); border-radius:var(--radius-sm);">
          <div style="flex:1; min-width:180px;">
            <div><strong>Name:</strong> ${c.name}</div>
            <div><strong>Phone:</strong> ${c.phone || '-'}</div>
            <div><strong>Email:</strong> ${c.email || '-'}</div>
          </div>
          <div style="flex:1; min-width:180px;">
            <div><strong>Address:</strong> ${c.address || '-'}</div>
            <div><strong>Total Sales:</strong> ${App.currency(salesAmt)}</div>
            <div><strong>Current Due:</strong> <span class="${dueAmt > 0 ? 'badge badge-danger' : 'badge badge-success'}">${App.currency(dueAmt)}</span></div>
          </div>
        </div>

        <h4 style="margin: 12px 0 6px;">Recent Invoices</h4>
        <div class="table-responsive" style="max-height: 180px; overflow-y:auto; margin-bottom:14px;">
          <table class="data-table">
            <thead>
              <tr><th>Invoice #</th><th>Date</th><th>Total</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${invoices.length === 0 ? '<tr><td colspan="4" class="empty-state">No invoices yet.</td></tr>' :
                invoices.map(inv => `
                  <tr>
                    <td>#${inv.invoice_number || inv.id}</td>
                    <td>${App.formatDate(inv.date)}</td>
                    <td>${App.currency(inv.grand_total)}</td>
                    <td><span class="badge ${inv.status === 'paid' ? 'badge-success' : 'badge-warning'}">${inv.status}</span></td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>

        <h4 style="margin: 12px 0 6px;">Recent Payments</h4>
        <div class="table-responsive" style="max-height: 180px; overflow-y:auto;">
          <table class="data-table">
            <thead>
              <tr><th>Date</th><th>Amount</th><th>Method</th></tr>
            </thead>
            <tbody>
              ${payments.length === 0 ? '<tr><td colspan="3" class="empty-state">No payments yet.</td></tr>' :
                payments.map(p => `
                  <tr>
                    <td>${App.formatDate(p.payment_date || p.date)}</td>
                    <td>${App.currency(p.amount)}</td>
                    <td>${(p.payment_method || p.method || '').toUpperCase()}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      `;

      const footerHtml = `
        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
        <button class="btn btn-primary" onclick="App.closeModal(); Customers.edit(${c.id})">Edit Details</button>
      `;

      App.showModal(`Customer Ledger: ${c.name}`, bodyHtml, footerHtml);
    } catch (err) {
      App.toast('Failed to load customer ledger: ' + err.message, 'danger');
    }
  }
};

window.Customers = Customers;
