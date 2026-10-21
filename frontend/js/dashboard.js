const Dashboard = {
  render() {
    return `
      <!-- Hero Welcome & Quick Action Bar -->
      <div class="dashboard-hero-banner">
        <div class="hero-text">
          <h2>Bhai Bhai Communication</h2>
          <p>Real-time retail sales, inventory stock levels, and accounts overview.</p>
        </div>
        <div class="quick-actions-bar">
          <button class="btn btn-primary" onclick="App.navigate('/invoices/new')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>New Invoice</span>
          </button>
          <button class="btn btn-secondary" onclick="App.navigate('/payments')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            <span>Collect Payment</span>
          </button>
          <button class="btn btn-secondary" onclick="App.navigate('/customers')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            <span>+ Customer</span>
          </button>
          <button class="btn btn-secondary" onclick="App.navigate('/inventory')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
            <span>Inventory</span>
          </button>
        </div>
      </div>

      <!-- Main KPI Stats Grid -->
      <div class="stats-grid" id="dashboard-stats">
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(99, 102, 241, 0.15); color: #818CF8;">💰</div>
          <div class="stat-details">
            <div class="stat-label">Today's Sales</div>
            <div class="stat-value">Loading...</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(16, 185, 129, 0.15); color: #34D399;">📈</div>
          <div class="stat-details">
            <div class="stat-label">Total Revenue</div>
            <div class="stat-value">Loading...</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(244, 63, 94, 0.15); color: #FB7185;">⏳</div>
          <div class="stat-details">
            <div class="stat-label">Outstanding Udari / Due</div>
            <div class="stat-value">Loading...</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(6, 182, 212, 0.15); color: #38BDF8;">🛒</div>
          <div class="stat-details">
            <div class="stat-label">Total Purchases</div>
            <div class="stat-value">Loading...</div>
          </div>
        </div>
      </div>

      <!-- Dashboard Sections: Low Stock & Activity -->
      <div class="dashboard-sections" style="display: flex; gap: 20px; flex-wrap: wrap;">
        <!-- Low Stock Alerts -->
        <div class="card" style="flex: 1.2; min-width: 320px;">
          <div class="card-header">
            <h3>⚠️ Low Stock Inventory Alerts</h3>
            <button class="btn btn-sm btn-secondary" onclick="App.navigate('/inventory/low')">View All</button>
          </div>
          <div class="card-body" id="low-stock-container">
            <div class="empty-state">Loading stock metrics...</div>
          </div>
        </div>
        
        <!-- Recent Business Activity -->
        <div class="card" style="flex: 1; min-width: 300px;">
          <div class="card-header">
            <h3>⚡ Recent Shop Activity</h3>
            <button class="btn btn-sm btn-secondary" onclick="App.navigate('/audit')">Audit Logs</button>
          </div>
          <div class="card-body" id="recent-activity-container">
            <div class="empty-state">Loading recent events...</div>
          </div>
        </div>
      </div>
    `;
  },
  
  async init() {
    try {
      const data = await API.get('/api/dashboard/stats');
      this.renderStats(data.stats || data);
      this.renderLowStock(data.lowStock || data.lowStockProducts);
      this.renderRecentActivity(data.recentActivity);
    } catch (err) {
      console.error('[Dashboard] Init error:', err);
      const statsContainer = document.getElementById('dashboard-stats');
      if (statsContainer) {
        statsContainer.innerHTML = `
          <div class="stat-card" style="grid-column: 1 / -1;">
            <div class="stat-details">
              <div class="stat-label">Analytics Overview</div>
              <div class="stat-value" style="font-size: 16px; font-weight: 500;">Ready to record your first transaction. Create an invoice to begin.</div>
            </div>
          </div>
        `;
      }
      const lowStockContainer = document.getElementById('low-stock-container');
      if (lowStockContainer) lowStockContainer.innerHTML = '<div class="empty-state">No low stock items.</div>';
      const recentActivityContainer = document.getElementById('recent-activity-container');
      if (recentActivityContainer) recentActivityContainer.innerHTML = '<div class="empty-state">No recent activity yet.</div>';
    }
  },
  
  renderStats(stats) {
    if (!stats) return;
    const statsHtml = `
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(99, 102, 241, 0.15); color: #818CF8;">💰</div>
        <div class="stat-details">
          <div class="stat-label">Today's Sales</div>
          <div class="stat-value">${App.currency(stats.todaySales || 0)}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(16, 185, 129, 0.15); color: #34D399;">📈</div>
        <div class="stat-details">
          <div class="stat-label">Total Revenue</div>
          <div class="stat-value">${App.currency(stats.totalSales || 0)}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(244, 63, 94, 0.15); color: #FB7185;">⏳</div>
        <div class="stat-details">
          <div class="stat-label">Outstanding Due (Udari)</div>
          <div class="stat-value" style="color: #F43F5E;">${App.currency(stats.totalDue || 0)}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(6, 182, 212, 0.15); color: #38BDF8;">🛒</div>
        <div class="stat-details">
          <div class="stat-label">Total Purchases</div>
          <div class="stat-value">${App.currency(stats.totalPurchases || 0)}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(168, 85, 247, 0.15); color: #C084FC;">💵</div>
        <div class="stat-details">
          <div class="stat-label">Payments Received</div>
          <div class="stat-value">${App.currency(stats.totalPayments || 0)}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(245, 158, 11, 0.15); color: #FBBF24;">💸</div>
        <div class="stat-details">
          <div class="stat-label">Store Expenses</div>
          <div class="stat-value">${App.currency(stats.totalExpenses || 0)}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(59, 130, 246, 0.15); color: #60A5FA;">📦</div>
        <div class="stat-details">
          <div class="stat-label">Total Products</div>
          <div class="stat-value">${stats.totalProducts || 0}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(139, 92, 246, 0.15); color: #A78BFA;">👥</div>
        <div class="stat-details">
          <div class="stat-label">Registered Customers</div>
          <div class="stat-value">${stats.totalCustomers || 0}</div>
        </div>
      </div>
    `;
    const container = document.getElementById('dashboard-stats');
    if (container) container.innerHTML = statsHtml;
  },
  
  renderLowStock(lowStock) {
    const container = document.getElementById('low-stock-container');
    if (!container) return;
    
    if (!lowStock || lowStock.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 28px 16px;">
          <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
          <div style="font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Healthy Inventory</div>
          <div style="font-size: 13px;">All products are currently above their minimum threshold.</div>
        </div>
      `;
      return;
    }
    
    let html = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Product Details</th>
              <th>Current Stock</th>
              <th>Min Alert</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${lowStock.map(p => {
              const current = p.stock !== undefined ? p.stock : (p.current_stock !== undefined ? p.current_stock : 0);
              const min = p.minStock !== undefined ? p.minStock : (p.min_stock || 0);
              const isOut = current <= 0;
              return `
                <tr>
                  <td>
                    <div style="font-weight: 600; color: var(--text-main);">${p.name}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${p.sku || 'No SKU'}</div>
                  </td>
                  <td><strong style="color: ${isOut ? 'var(--danger-color)' : 'var(--warning-color)'}; font-family: var(--font-mono);">${current}</strong></td>
                  <td style="color: var(--text-muted); font-family: var(--font-mono);">${min}</td>
                  <td>
                    <span class="badge ${isOut ? 'badge-danger' : 'badge-warning'}">
                      ${isOut ? 'Out of Stock' : 'Low Stock'}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-primary" onclick="App.navigate('/purchases/new')">Order</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    container.innerHTML = html;
  },
  
  renderRecentActivity(activity) {
    const container = document.getElementById('recent-activity-container');
    if (!container) return;
    
    if (!activity || activity.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 28px 16px;">
          <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
          <div style="font-weight: 600; color: var(--text-main); margin-bottom: 4px;">No Recent Events</div>
          <div style="font-size: 13px;">New invoices and payments will appear here in real-time.</div>
        </div>
      `;
      return;
    }
    
    let html = `<ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;">`;
    activity.forEach(act => {
      html += `
        <li style="padding: 10px 12px; background: var(--bg-hover); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: flex; align-items: flex-start; gap: 10px;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--primary-light); margin-top: 5px; flex-shrink: 0;"></div>
          <div style="flex: 1; overflow: hidden;">
            <div style="font-weight: 600; font-size: 13px; color: var(--text-main); line-height: 1.3;">${act.description || 'Action recorded'}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${App.formatDate(act.date || act.created_at)}</div>
          </div>
        </li>
      `;
    });
    html += `</ul>`;
    container.innerHTML = html;
  }
};

window.Dashboard = Dashboard;
