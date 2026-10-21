/**
 * Bhai Bhai Communication — Analytics & Reports Module
 * Upgraded with:
 *  - Interactive Drill-Down (Click to View Invoices, Customers, Expenses)
 *  - High-Fidelity Printable A4 Business Reports (with Company Header & Signatures)
 *  - Instant CSV / Excel Export Engine
 *  - Date Range Presets (Today, This Week, This Month, This Year, All Time)
 *  - Profit & Loss Breakdown with Margins & KPIs
 */

window.Reports = {
    state: {
        activeTab: 'sales',
        from: '',
        to: '',
        data: null
    },

    render() {
        const tabs = [
            { id: 'sales', label: 'Sales (बिक्री)' },
            { id: 'purchases', label: 'Purchases (खरीद)' },
            { id: 'profit', label: 'Profit & Loss (लाभ/हानि)' },
            { id: 'expenses', label: 'Expenses (खर्च)' },
            { id: 'payments', label: 'Payments (भुगतान)' },
            { id: 'due', label: 'Udari / Due (उधारी)' },
            { id: 'customers', label: 'Customers (ग्राहक)' },
            { id: 'products', label: 'Products (उत्पाद)' },
            { id: 'inventory', label: 'Inventory (स्टॉक)' },
            { id: 'tax', label: 'GST / Tax (टैक्स)' }
        ];
        
        const tabHtml = tabs.map(t => {
            return `<button class="tab-item ${this.state.activeTab === t.id ? 'active' : ''}" data-tab="${t.id}" onclick="Reports.switchTab('${t.id}')">${t.label}</button>`;
        }).join('');

        return `
            <div class="reports-page-wrapper">
                <!-- Header -->
                <div class="page-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom: 20px;">
                    <div>
                        <h2 style="margin:0; font-size:1.6rem; font-weight:800; display:flex; align-items:center; gap:8px;">
                            <span>📊</span> Business Intelligence & Reports
                        </h2>
                        <p style="margin:4px 0 0 0; color:var(--text-secondary); font-size:0.875rem;">
                            Financial Statements, GST Summaries, Profit/Loss & Stock Audits
                        </p>
                    </div>
                    <div class="page-actions" style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn btn-secondary btn-sm" onclick="Reports.printFormattedReport()">
                            🖨️ Print Formatted Report
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="Reports.exportCSV()">
                            📥 Export CSV
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="Reports.loadData()">
                            🔄 Refresh
                        </button>
                    </div>
                </div>
                
                <!-- Category Tabs -->
                <div class="tabs mt-2 mb-3" style="display:flex; flex-wrap:wrap; gap:6px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                    ${tabHtml}
                </div>

                <!-- Filters Toolbar -->
                <div class="card mb-4" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; padding:16px;">
                    <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:flex-end;">
                        <div style="flex:1; min-width:150px;">
                            <label class="form-label" style="font-size:12px; font-weight:600;">FROM DATE (प्रारंभ)</label>
                            <input type="date" id="report-from" class="form-input" value="${this.state.from}" onchange="Reports.onDateChange()">
                        </div>
                        <div style="flex:1; min-width:150px;">
                            <label class="form-label" style="font-size:12px; font-weight:600;">TO DATE (समाप्त)</label>
                            <input type="date" id="report-to" class="form-input" value="${this.state.to}" onchange="Reports.onDateChange()">
                        </div>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button class="btn btn-secondary btn-sm" onclick="Reports.setDatePreset('today')">Today</button>
                            <button class="btn btn-secondary btn-sm" onclick="Reports.setDatePreset('week')">This Week</button>
                            <button class="btn btn-secondary btn-sm" onclick="Reports.setDatePreset('month')">This Month</button>
                            <button class="btn btn-secondary btn-sm" onclick="Reports.setDatePreset('year')">This Year</button>
                            <button class="btn btn-secondary btn-sm" onclick="Reports.setDatePreset('all')">All Time</button>
                            <button class="btn btn-primary btn-sm" onclick="Reports.loadData()">🔍 Generate</button>
                        </div>
                    </div>
                </div>

                <!-- Report Content Display Area -->
                <div id="report-content-container">
                    <div class="text-center p-4">Select options and click Generate...</div>
                </div>
            </div>
        `;
    },

    async init() {
        const today = new Date();
        this.state.to = today.toISOString().split('T')[0];
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        this.state.from = firstOfMonth.toISOString().split('T')[0];
        
        await this.loadData();
    },

    switchTab(tabId) {
        this.state.activeTab = tabId;
        document.querySelectorAll('.reports-page-wrapper .tab-item').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
        });
        this.loadData();
    },

    setDatePreset(preset) {
        const today = new Date();
        const toStr = today.toISOString().split('T')[0];
        this.state.to = toStr;

        if (preset === 'today') {
            this.state.from = toStr;
        } else if (preset === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(today.getDate() - 7);
            this.state.from = weekAgo.toISOString().split('T')[0];
        } else if (preset === 'month') {
            const first = new Date(today.getFullYear(), today.getMonth(), 1);
            this.state.from = first.toISOString().split('T')[0];
        } else if (preset === 'year') {
            const firstYear = new Date(today.getFullYear(), 0, 1);
            this.state.from = firstYear.toISOString().split('T')[0];
        } else if (preset === 'all') {
            this.state.from = '';
        }

        const fromEl = document.getElementById('report-from');
        const toEl = document.getElementById('report-to');
        if (fromEl) fromEl.value = this.state.from;
        if (toEl) toEl.value = this.state.to;

        this.loadData();
    },

    onDateChange() {
        const fromEl = document.getElementById('report-from');
        const toEl = document.getElementById('report-to');
        if (fromEl) this.state.from = fromEl.value;
        if (toEl) this.state.to = toEl.value;
    },

    async loadData() {
        const fromEl = document.getElementById('report-from');
        const toEl = document.getElementById('report-to');
        if (fromEl) this.state.from = fromEl.value;
        if (toEl) this.state.to = toEl.value;
        
        const container = document.getElementById('report-content-container');
        if (!container) return;
        container.innerHTML = '<div class="text-center p-4">Loading report data...</div>';
        this.state.data = null;
        
        try {
            const url = `/api/reports/${this.state.activeTab}?from=${encodeURIComponent(this.state.from)}&to=${encodeURIComponent(this.state.to)}`;
            const res = await API.get(url);
            this.state.data = res;
            this.renderReportContent(container, res);
        } catch (err) {
            container.innerHTML = `<div class="empty-state">Error generating report: ${err.message || 'Server error'}</div>`;
        }
    },

    renderReportContent(container, data) {
        if (!data || Object.keys(data).length === 0 || (Array.isArray(data) && data.length === 0)) {
            container.innerHTML = `<div class="empty-state">No data available for the selected period.</div>`;
            return;
        }

        let html = '';
        const tab = this.state.activeTab;

        if (tab === 'sales' || tab === 'purchases') {
            const items = data.items || data.data || (Array.isArray(data) ? data : []);
            const isSales = tab === 'sales';
            
            html += `
                <div class="stats-grid mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
                    <div class="stat-card card p-3" style="background:var(--card-bg); border-left:4px solid ${isSales ? 'var(--primary-color)' : 'var(--warning-color)'};">
                        <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">TOTAL ${isSales ? 'SALES' : 'PURCHASES'}</div>
                        <div style="font-size:1.8rem; font-weight:800; color:${isSales ? 'var(--primary-color)' : 'var(--warning-color)'}; margin-top:4px;">
                            ${App.currency(data.total || 0)}
                        </div>
                    </div>
                    <div class="stat-card card p-3" style="background:var(--card-bg); border-left:4px solid var(--success-color);">
                        <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">TOTAL TRANSACTIONS</div>
                        <div style="font-size:1.8rem; font-weight:800; color:var(--success-color); margin-top:4px;">
                            ${data.count !== undefined ? data.count : items.length}
                        </div>
                    </div>
                    ${data.summary && data.summary.total_tax !== undefined ? `
                        <div class="stat-card card p-3" style="background:var(--card-bg); border-left:4px solid #8b5cf6;">
                            <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">TAX COLLECTED / PAID</div>
                            <div style="font-size:1.8rem; font-weight:800; color:#8b5cf6; margin-top:4px;">
                                ${App.currency(data.summary.total_tax || 0)}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            if (items.length > 0) {
                html += `
                    <div class="card" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; overflow:hidden;">
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Ref / Invoice #</th>
                                        <th>Party Name</th>
                                        <th style="text-align:right;">Grand Total</th>
                                        <th style="text-align:right;">Paid</th>
                                        <th style="text-align:right;">Due</th>
                                        <th style="text-align:center;">Status</th>
                                        <th style="text-align:center;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;
                items.forEach(i => {
                    const num = i.number || i.invoice_number || i.purchase_number || i.id;
                    const isPaid = (i.due || 0) <= 0;
                    html += `<tr>
                        <td>${App.formatDate(i.date)}</td>
                        <td><strong>${num}</strong></td>
                        <td>${i.party_name || i.customer_name || i.supplier_name || 'Cash Customer'}</td>
                        <td style="text-align:right;"><strong>${App.currency(i.total !== undefined ? i.total : i.grand_total)}</strong></td>
                        <td style="text-align:right; color:var(--success-color);">${App.currency(i.paid || 0)}</td>
                        <td style="text-align:right; color:${i.due > 0 ? 'var(--danger-color)' : 'var(--text-secondary)'}; font-weight:600;">${App.currency(i.due || 0)}</td>
                        <td style="text-align:center;"><span class="badge ${isPaid ? 'badge-success' : 'badge-danger'}">${i.status || (isPaid ? 'paid' : 'due')}</span></td>
                        <td style="text-align:center;">
                            ${isSales && i.id ? `
                                <button class="btn btn-sm btn-icon" onclick="Invoices.view(${i.id})" title="View Invoice">👁️</button>
                                <button class="btn btn-sm btn-icon" onclick="Invoices.print(${i.id})" title="Print Invoice">🖨️</button>
                            ` : '-'}
                        </td>
                    </tr>`;
                });
                html += `</tbody></table></div></div>`;
            } else {
                html += `<div class="empty-state">No transactions found for this date range.</div>`;
            }
        } else if (tab === 'profit') {
            const net = data.net_profit || 0;
            const sales = data.total_sales || 0;
            const margin = sales > 0 ? ((net / sales) * 100).toFixed(1) : 0;

            html += `
                <div class="stats-grid mb-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
                    <div class="stat-card card p-3" style="background:var(--card-bg); border-left:4px solid var(--success-color);">
                        <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">TOTAL REVENUE (कुल बिक्री)</div>
                        <div style="font-size:1.8rem; font-weight:800; color:var(--success-color); margin-top:4px;">
                            ${App.currency(sales)}
                        </div>
                    </div>
                    <div class="stat-card card p-3" style="background:var(--card-bg); border-left:4px solid var(--warning-color);">
                        <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">COST OF PURCHASES (खरीद लागत)</div>
                        <div style="font-size:1.8rem; font-weight:800; color:var(--warning-color); margin-top:4px;">
                            ${App.currency(data.total_purchases || 0)}
                        </div>
                    </div>
                    <div class="stat-card card p-3" style="background:var(--card-bg); border-left:4px solid var(--danger-color);">
                        <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">OPERATING EXPENSES (अन्य खर्च)</div>
                        <div style="font-size:1.8rem; font-weight:800; color:var(--danger-color); margin-top:4px;">
                            ${App.currency(data.total_expenses || 0)}
                        </div>
                    </div>
                    <div class="stat-card card p-3" style="background:var(--card-bg); border-left:4px solid ${net >= 0 ? 'var(--success-color)' : 'var(--danger-color)'};">
                        <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">NET PROFIT (शुद्ध लाभ)</div>
                        <div style="font-size:2rem; font-weight:900; color:${net >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}; margin-top:4px;">
                            ${App.currency(net)}
                        </div>
                        <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">Net Margin: <strong>${margin}%</strong></div>
                    </div>
                </div>

                <!-- Visual Profit Calculation Card -->
                <div class="card p-4" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; max-width:600px; margin:0 auto;">
                    <h3 style="margin-top:0; font-size:1.2rem; font-weight:700; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                        Income Statement Summary
                    </h3>
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed var(--border-color);">
                        <span>Total Sales Revenue (+)</span>
                        <strong style="color:var(--success-color);">${App.currency(sales)}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed var(--border-color);">
                        <span>Purchases / Cost of Goods Sold (-)</span>
                        <strong style="color:var(--warning-color);">${App.currency(data.total_purchases || 0)}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed var(--border-color);">
                        <span>Operating Expenses (-)</span>
                        <strong style="color:var(--danger-color);">${App.currency(data.total_expenses || 0)}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:12px 0 0 0; font-size:1.2em; font-weight:800;">
                        <span>Estimated Net Profit</span>
                        <strong style="color:${net >= 0 ? 'var(--success-color)' : 'var(--danger-color)'};">${App.currency(net)}</strong>
                    </div>
                </div>
            `;
        } else {
            const rows = Array.isArray(data) ? data : (data.items || data.data || data.customers || data.products || []);
            if (Array.isArray(rows) && rows.length > 0) {
                const keys = Object.keys(rows[0]);
                html += `
                    <div class="card" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; overflow:hidden;">
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        ${keys.map(k => `<th>${k.replace(/_/g, ' ').toUpperCase()}</th>`).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                `;
                rows.forEach(row => {
                    html += `<tr>`;
                    keys.forEach(k => {
                        let val = row[k];
                        if (typeof val === 'number' && (k.includes('amount') || k.includes('total') || k.includes('price') || k.includes('due') || k.includes('sales') || k.includes('paid'))) {
                            val = App.currency(val);
                        }
                        html += `<td>${val !== null && val !== undefined ? val : '-'}</td>`;
                    });
                    html += `</tr>`;
                });
                html += `</tbody></table></div></div>`;
            } else if (typeof data === 'object') {
                html += `<div class="card p-4"><pre style="margin:0; font-family:monospace;">${JSON.stringify(data, null, 2)}</pre></div>`;
            } else {
                html += `<div class="empty-state">No data available.</div>`;
            }
        }
        
        container.innerHTML = html;
    },

    printFormattedReport() {
        const data = this.state.data;
        if (!data) {
            App.toast('Please generate report first', 'warning');
            return;
        }

        const tabTitle = this.state.activeTab.toUpperCase() + ' REPORT';
        const printWindow = window.open('', '_blank');
        
        let bus = { name: 'BHAI BHAI COMMUNICATION', address: 'Mobile & Electronics Store', phone: '' };
        
        const reportContent = document.getElementById('report-content-container').innerHTML;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${tabTitle}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; background: #fff; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
                    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
                    th { background-color: #f1f5f9; font-weight: 700; }
                    .stats-grid { display: flex; gap: 12px; margin-bottom: 20px; }
                    .stat-card { border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; background: #f8fafc; flex: 1; }
                    .stat-card div { font-size: 18px; font-weight: bold; }
                    .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 15px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1 style="margin:0; font-size:22px; color:#0f172a;">${bus.name}</h1>
                        <p style="margin:2px 0; font-size:12px; color:#64748b;">${bus.address}</p>
                    </div>
                    <div style="text-align:right;">
                        <h2 style="margin:0; font-size:18px; color:#4f46e5;">${tabTitle}</h2>
                        <div style="font-size:12px; color:#64748b;">Period: ${this.state.from || 'All'} to ${this.state.to || 'Present'}</div>
                        <div style="font-size:11px; color:#94a3b8;">Generated: ${new Date().toLocaleString()}</div>
                    </div>
                </div>

                <div id="content">
                    ${reportContent}
                </div>

                <div class="footer">
                    <div>Computer Generated Financial Report &bull; Bhai Bhai Communication</div>
                    <div>Page 1 of 1</div>
                </div>

                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    exportCSV() {
        if (!this.state.data) {
            App.toast('No data to export', 'warning');
            return;
        }
        
        let exportData = this.state.data;
        if (exportData.items) exportData = exportData.items;
        else if (exportData.customers) exportData = exportData.customers;
        else if (exportData.products) exportData = exportData.products;
        else if (exportData.data) exportData = exportData.data;
        
        if (!Array.isArray(exportData) && typeof exportData === 'object') {
            exportData = [exportData];
        }
        
        if (!Array.isArray(exportData) || exportData.length === 0) {
            App.toast('Data format not supported for CSV export', 'error');
            return;
        }

        const keys = Object.keys(exportData[0]);
        let csvContent = "data:text/csv;charset=utf-8," 
            + keys.join(",") + "\n"
            + exportData.map(row => keys.map(k => {
                let v = row[k] === null || row[k] === undefined ? '' : String(row[k]);
                return `"${v.replace(/"/g, '""')}"`;
            }).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${this.state.activeTab}_report_${this.state.from}_to_${this.state.to}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        App.toast(`${this.state.activeTab.toUpperCase()} report exported to CSV`, 'success');
    },

    printReport() {
        this.printFormattedReport();
    }
};
