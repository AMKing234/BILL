window.Settings = {
    state: {
        activeTab: 'business'
    },

    render(action) {
        if (action === 'audit') {
            return this.renderAuditLog();
        }

        if (action && ['business', 'invoice', 'tax', 'upi', 'appearance', 'password'].includes(action)) {
            this.state.activeTab = action;
        }

        const tabs = `
            <div class="tabs">
                <button class="tab-item ${this.state.activeTab === 'business' ? 'active' : ''}" data-tab="business">Business</button>
                <button class="tab-item ${this.state.activeTab === 'invoice' ? 'active' : ''}" data-tab="invoice">Invoice</button>
                <button class="tab-item ${this.state.activeTab === 'tax' ? 'active' : ''}" data-tab="tax">Tax</button>
                <button class="tab-item ${this.state.activeTab === 'upi' ? 'active' : ''}" data-tab="upi">⚡ UPI</button>
                <button class="tab-item ${this.state.activeTab === 'appearance' ? 'active' : ''}" data-tab="appearance">Appearance</button>
                <button class="tab-item ${this.state.activeTab === 'password' ? 'active' : ''}" data-tab="password">Password</button>
            </div>
        `;

        let content = '';
        if (this.state.activeTab === 'business') content = this.renderBusiness();
        else if (this.state.activeTab === 'invoice') content = this.renderInvoice();
        else if (this.state.activeTab === 'tax') content = this.renderTax();
        else if (this.state.activeTab === 'upi') content = this.renderUpi();
        else if (this.state.activeTab === 'appearance') content = this.renderAppearance();
        else if (this.state.activeTab === 'password') content = this.renderPassword();

        return `
            <div class="page-header">
                <h2>Settings</h2>
                <button class="btn btn-secondary" onclick="App.navigate('/settings/audit')">View Audit Log</button>
            </div>
            ${tabs}
            <div class="card mt-4">
                <div class="card-body" id="settings-content">
                    ${content}
                </div>
            </div>
        `;
    },

    renderBusiness() {
        return `
            <form id="settings-business-form" style="max-width: 600px;">
                <div class="form-group">
                    <label class="form-label">Business Name</label>
                    <input type="text" class="form-input" id="bus-name" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Owner Name</label>
                    <input type="text" class="form-input" id="bus-owner">
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex:1">
                        <label class="form-label">Phone</label>
                        <input type="text" class="form-input" id="bus-phone">
                    </div>
                    <div class="form-group" style="flex:1">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" id="bus-email">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Address</label>
                    <textarea class="form-textarea" id="bus-address"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Logo</label>
                    <input type="file" class="form-input" id="bus-logo" accept="image/*">
                </div>
                <button type="submit" class="btn btn-primary" id="btn-save-bus">Save Business Settings</button>
            </form>
        `;
    },

    renderInvoice() {
        return `
            <form id="settings-invoice-form" style="max-width: 600px;">
                <div class="form-row">
                    <div class="form-group" style="flex:1">
                        <label class="form-label">Invoice Prefix</label>
                        <input type="text" class="form-input" id="inv-prefix" placeholder="INV-">
                    </div>
                    <div class="form-group" style="flex:1">
                        <label class="form-label">Starting Number</label>
                        <input type="number" class="form-input" id="inv-start" min="1">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Terms & Conditions</label>
                    <textarea class="form-textarea" id="inv-terms" rows="4"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Footer Text</label>
                    <input type="text" class="form-input" id="inv-footer">
                </div>
                <div class="form-group">
                    <label class="form-label">Signature Text</label>
                    <input type="text" class="form-input" id="inv-signature">
                </div>
                <button type="submit" class="btn btn-primary" id="btn-save-inv">Save Invoice Settings</button>
            </form>
        `;
    },

    renderTax() {
        return `
            <form id="settings-tax-form" style="max-width: 600px;">
                <div class="form-group">
                    <label class="form-label" style="display:flex; align-items:center; gap:10px;">
                        <input type="checkbox" id="tax-enabled"> Enable GST
                    </label>
                </div>
                <div class="form-group">
                    <label class="form-label">GSTIN</label>
                    <input type="text" class="form-input" id="tax-gstin">
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex:1">
                        <label class="form-label">Default CGST Rate (%)</label>
                        <input type="number" step="0.1" class="form-input" id="tax-cgst">
                    </div>
                    <div class="form-group" style="flex:1">
                        <label class="form-label">Default SGST Rate (%)</label>
                        <input type="number" step="0.1" class="form-input" id="tax-sgst">
                    </div>
                    <div class="form-group" style="flex:1">
                        <label class="form-label">Default IGST Rate (%)</label>
                        <input type="number" step="0.1" class="form-input" id="tax-igst">
                    </div>
                </div>
                <button type="submit" class="btn btn-primary" id="btn-save-tax">Save Tax Settings</button>
            </form>
        `;
    },

    renderUpi() {
        const cfg = this._upiCache || { enabled: false, upi_id: '', payee_name: '', merchant_code: '', note: '', show_on_invoice: true, show_on_thermal: true, qr_size: 220, currency: 'INR' };
        const previewUpi = cfg.upi_id || 'yourname@upi';
        const previewName = cfg.payee_name || 'Your Business';
        const previewUrl = `upi://pay?pa=${encodeURIComponent(previewUpi)}&pn=${encodeURIComponent(previewName)}&am=100.00&cu=${cfg.currency || 'INR'}&tn=Preview`;
        const qrPreview = `https://api.qrserver.com/v1/create-qr-code/?size=${cfg.qr_size || 220}x${cfg.qr_size || 220}&data=${encodeURIComponent(previewUrl)}`;

        return `
            <div style="max-width: 880px;">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:24px;">
                    <div style="width:48px; height:48px; border-radius:14px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display:flex; align-items:center; justify-content:center; font-size:24px; color:#fff; flex-shrink:0;">⚡</div>
                    <div>
                        <h3 style="margin:0; font-family: var(--font-display);">UPI Payment Configuration</h3>
                        <p style="color: var(--text-muted); font-size:13px; margin:2px 0 0 0;">Configure your UPI ID, QR codes, and payment display preferences</p>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 300px; gap:28px; align-items:start;">
                    <form id="settings-upi-form">
                        <!-- Master Enable -->
                        <div style="background: var(--bg-hover); border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; display:flex; align-items:center; justify-content:space-between;">
                            <div>
                                <strong style="font-size:15px;">Enable UPI Payments</strong>
                                <div style="color: var(--text-muted); font-size:12px; margin-top:2px;">Show UPI QR codes on invoices and payment modals</div>
                            </div>
                            <label style="position:relative; width:52px; height:28px; cursor:pointer;">
                                <input type="checkbox" id="upi-enabled" ${cfg.enabled ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                                <span style="position:absolute; top:0; left:0; right:0; bottom:0; background: ${cfg.enabled ? 'var(--primary-color)' : '#cbd5e1'}; border-radius:14px; transition:0.3s;"></span>
                                <span style="position:absolute; top:2px; ${cfg.enabled ? 'left:26px' : 'left:2px'}; width:24px; height:24px; background:#fff; border-radius:50%; transition:0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></span>
                            </label>
                        </div>

                        <!-- Core UPI Details -->
                        <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                            <h4 style="margin:0 0 16px 0; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; color: var(--text-muted);">💳 UPI Account Details</h4>
                            <div class="form-group">
                                <label class="form-label">UPI ID / VPA *</label>
                                <input type="text" class="form-input" id="upi-id" value="${this._escHtml(cfg.upi_id)}" placeholder="yourname@upi / 9876543210@paytm" style="font-family: var(--font-mono); font-size: 15px; letter-spacing: 0.5px;">
                                <small style="color: var(--text-muted); font-size:11px;">Your UPI Virtual Payment Address (e.g., shop@okaxis, 9988776655@ybl)</small>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Payee / Business Name *</label>
                                <input type="text" class="form-input" id="upi-payee" value="${this._escHtml(cfg.payee_name)}" placeholder="Bhai Bhai Communication">
                            </div>
                            <div class="form-row" style="gap:16px;">
                                <div class="form-group" style="flex:1">
                                    <label class="form-label">Merchant Category Code</label>
                                    <input type="text" class="form-input" id="upi-mcc" value="${this._escHtml(cfg.merchant_code)}" placeholder="5411 (Retail)">
                                    <small style="color: var(--text-muted); font-size:11px;">Optional NPCI MCC code</small>
                                </div>
                                <div class="form-group" style="flex:1">
                                    <label class="form-label">Currency</label>
                                    <select class="form-input" id="upi-currency">
                                        <option value="INR" ${cfg.currency === 'INR' ? 'selected' : ''}>₹ INR (Indian Rupee)</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Default Payment Note</label>
                                <input type="text" class="form-input" id="upi-note" value="${this._escHtml(cfg.note)}" placeholder="Payment for Invoice #">
                            </div>
                        </div>

                        <!-- Display Preferences -->
                        <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                            <h4 style="margin:0 0 16px 0; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; color: var(--text-muted);">🖨️ Display & Print Options</h4>
                            <div style="display:flex; flex-direction:column; gap:14px;">
                                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                                    <input type="checkbox" id="upi-show-invoice" ${cfg.show_on_invoice ? 'checked' : ''}>
                                    <div>
                                        <strong>Show QR on Invoice Print</strong>
                                        <div style="color: var(--text-muted); font-size:12px;">Add a scannable UPI QR code to A4 invoice prints</div>
                                    </div>
                                </label>
                                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                                    <input type="checkbox" id="upi-show-thermal" ${cfg.show_on_thermal ? 'checked' : ''}>
                                    <div>
                                        <strong>Show QR on Thermal Slip</strong>
                                        <div style="color: var(--text-muted); font-size:12px;">Add a small QR to 58mm/80mm POS thermal receipts</div>
                                    </div>
                                </label>
                            </div>
                            <div class="form-group" style="margin-top: 16px; max-width: 200px;">
                                <label class="form-label">QR Code Size (px)</label>
                                <input type="number" class="form-input" id="upi-qr-size" value="${cfg.qr_size}" min="100" max="400" step="10">
                            </div>
                        </div>

                        <div style="display:flex; gap:12px; align-items:center;">
                            <button type="submit" class="btn btn-primary" id="btn-save-upi" style="min-width:180px;">💾 Save UPI Settings</button>
                            <button type="button" class="btn btn-secondary" onclick="Settings.testUpiQr()">📱 Test QR Modal</button>
                        </div>
                    </form>

                    <!-- Live Preview Sidebar -->
                    <div style="position:sticky; top:80px;">
                        <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 24px; text-align:center;">
                            <div style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color: var(--text-muted); margin-bottom:12px; font-weight:600;">Live QR Preview</div>
                            <div style="background:#fff; border-radius:12px; padding:14px; display:inline-block; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                                <img id="upi-qr-preview" src="${qrPreview}" alt="UPI QR" style="width:${Math.min(cfg.qr_size, 200)}px; height:${Math.min(cfg.qr_size, 200)}px; display:block;" onerror="this.style.display='none'">
                            </div>
                            <div style="margin-top:14px; font-size:13px; color: var(--text-secondary);">
                                <div style="font-family: var(--font-mono); font-weight:700; color: var(--primary-color); font-size:14px;">${previewUpi}</div>
                                <div style="margin-top:2px;">${previewName}</div>
                                <div style="font-size:11px; color: var(--text-muted); margin-top:6px;">₹ 100.00 (sample)</div>
                            </div>
                            <div style="margin-top:16px; padding-top:14px; border-top: 1px solid var(--border-color);">
                                <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                                    <span style="background: var(--bg-hover); padding:3px 8px; border-radius:6px; font-size:11px;">PhonePe</span>
                                    <span style="background: var(--bg-hover); padding:3px 8px; border-radius:6px; font-size:11px;">GPay</span>
                                    <span style="background: var(--bg-hover); padding:3px 8px; border-radius:6px; font-size:11px;">Paytm</span>
                                    <span style="background: var(--bg-hover); padding:3px 8px; border-radius:6px; font-size:11px;">BHIM</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    _escHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    },

    renderAppearance() {
        const cur = window.ThemeEngine ? window.ThemeEngine.config : {
            themeId: 'midnight-obsidian',
            sidebarMode: 'expanded',
            density: 'cozy',
            radius: 'modern',
            glass: 'frosted',
            sounds: true
        };

        return `
            <div class="appearance-settings-wrapper" style="max-width: 900px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                    <div>
                        <h3 style="font-family: var(--font-display); margin:0;">🎨 Visual Themes & Layout System</h3>
                        <p style="color: var(--text-muted); font-size:13px; margin:4px 0 0 0;">Select from 105+ high-fidelity themes, adaptive layouts, and POS ergonomics.</p>
                    </div>
                    <button class="btn btn-primary btn-lg" onclick="ThemeEngine.openStudio()">
                        🚀 Open 105+ Theme Studio
                    </button>
                </div>

                <div class="layout-controls-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                    <!-- Navigation Architecture -->
                    <div class="layout-card">
                        <h3>Navigation Architecture</h3>
                        <p class="layout-card-sub">Choose sidebar or top navigation</p>
                        <div class="option-button-group">
                            <button class="opt-btn ${cur.sidebarMode === 'expanded' ? 'active' : ''}" onclick="ThemeEngine.selectSidebar('expanded'); Settings.render('appearance');">
                                <span class="opt-icon">📑</span>
                                <div><strong>Full Sidebar</strong><small>260px with labels & badges</small></div>
                            </button>
                            <button class="opt-btn ${cur.sidebarMode === 'compact' ? 'active' : ''}" onclick="ThemeEngine.selectSidebar('compact'); Settings.render('appearance');">
                                <span class="opt-icon">📌</span>
                                <div><strong>Mini Sidebar</strong><small>68px icon bar (spacious workspace)</small></div>
                            </button>
                            <button class="opt-btn ${cur.sidebarMode === 'topbar' ? 'active' : ''}" onclick="ThemeEngine.selectSidebar('topbar'); Settings.render('appearance');">
                                <span class="opt-icon">🧭</span>
                                <div><strong>Top Navigation</strong><small>Horizontal navbar</small></div>
                            </button>
                        </div>
                    </div>

                    <!-- Density -->
                    <div class="layout-card">
                        <h3>Information Density</h3>
                        <p class="layout-card-sub">Adjust spacing for retail & invoicing</p>
                        <div class="option-button-group">
                            <button class="opt-btn ${cur.density === 'compact' ? 'active' : ''}" onclick="ThemeEngine.selectDensity('compact'); Settings.render('appearance');">
                                <span class="opt-icon">⚡</span>
                                <div><strong>High Density</strong><small>Compact tables & lists (Retail POS)</small></div>
                            </button>
                            <button class="opt-btn ${cur.density === 'cozy' ? 'active' : ''}" onclick="ThemeEngine.selectDensity('cozy'); Settings.render('appearance');">
                                <span class="opt-icon">☕</span>
                                <div><strong>Cozy Balanced</strong><small>Modern standard layout</small></div>
                            </button>
                            <button class="opt-btn ${cur.density === 'spacious' ? 'active' : ''}" onclick="ThemeEngine.selectDensity('spacious'); Settings.render('appearance');">
                                <span class="opt-icon">📱</span>
                                <div><strong>Touch POS</strong><small>Large touch targets</small></div>
                            </button>
                        </div>
                    </div>

                    <!-- Corner Geometry -->
                    <div class="layout-card">
                        <h3>Corner Geometry</h3>
                        <p class="layout-card-sub">Shape of cards, buttons, and inputs</p>
                        <div class="option-button-group">
                            <button class="opt-btn ${cur.radius === 'sharp' ? 'active' : ''}" onclick="ThemeEngine.selectRadius('sharp'); Settings.render('appearance');">
                                <span class="opt-icon">⬛</span>
                                <div><strong>Sharp 0px</strong><small>Industrial Brutalist</small></div>
                            </button>
                            <button class="opt-btn ${cur.radius === 'modern' ? 'active' : ''}" onclick="ThemeEngine.selectRadius('modern'); Settings.render('appearance');">
                                <span class="opt-icon">◻️</span>
                                <div><strong>Modern 12px</strong><small>Soft contemporary</small></div>
                            </button>
                            <button class="opt-btn ${cur.radius === 'pill' ? 'active' : ''}" onclick="ThemeEngine.selectRadius('pill'); Settings.render('appearance');">
                                <span class="opt-icon">⭕</span>
                                <div><strong>Pill 22px</strong><small>Fluid organic curves</small></div>
                            </button>
                        </div>
                    </div>

                    <!-- Sensory & Sound -->
                    <div class="layout-card">
                        <h3>Sound & Sensory Feedback</h3>
                        <p class="layout-card-sub">Offline WebAudio feedback effects</p>
                        <div class="toggle-row" style="margin-bottom: 12px;">
                            <div>
                                <strong>POS Sound Effects</strong>
                                <small>Cash register chime & scan beeps</small>
                            </div>
                            <button class="btn btn-sm ${cur.sounds ? 'btn-success' : 'btn-secondary'}" onclick="ThemeEngine.toggleSounds(); Settings.render('appearance');">
                                ${cur.sounds ? '🔊 Audio ON' : '🔇 Muted'}
                            </button>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button class="btn btn-sm btn-secondary" onclick="ThemeEngine.audio.playChime()">🔔 Test Cash Register</button>
                            <button class="btn btn-sm btn-secondary" onclick="ThemeEngine.audio.playBeep()">📡 Test Barcode Beep</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderPassword() {
        return `
            <form id="settings-password-form" style="max-width: 500px;">
                <div class="form-group">
                    <label class="form-label">Current Password</label>
                    <input type="password" class="form-input" id="pwd-current" required>
                </div>
                <div class="form-group">
                    <label class="form-label">New Password</label>
                    <input type="password" class="form-input" id="pwd-new" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Confirm New Password</label>
                    <input type="password" class="form-input" id="pwd-confirm" required>
                </div>
                <button type="submit" class="btn btn-primary" id="btn-save-pwd">Change Password</button>
            </form>
        `;
    },

    renderAuditLog() {
        return `
            <div class="page-header">
                <h2>Audit Log</h2>
                <button class="btn btn-secondary" onclick="App.navigate('/settings')">Back to Settings</button>
            </div>
            <div class="card mt-4">
                <div class="card-body">
                    <div class="table-responsive" id="audit-table-container">
                        <p>Loading...</p>
                    </div>
                </div>
            </div>
        `;
    },

    async init(action) {
        if (action === 'audit') {
            this.loadAuditLogs(1);
            this.bindAuditEvents();
            return;
        }

        this.bindEvents();
        if (this.state.activeTab === 'business') await this.loadBusiness();
        else if (this.state.activeTab === 'invoice') await this.loadInvoice();
        else if (this.state.activeTab === 'tax') await this.loadTax();
        else if (this.state.activeTab === 'upi') await this.loadUpi();
        else if (this.state.activeTab === 'appearance') this.loadAppearance();
    },

    bindEvents() {
        const appContent = document.getElementById('app-content');
        
        appContent.addEventListener('click', (e) => {
            if (e.target.closest('.tab-item')) {
                const tab = e.target.closest('.tab-item').dataset.tab;
                App.navigate('/settings/' + tab);
            }
        });

        appContent.addEventListener('submit', async (e) => {
            if (e.target.id === 'settings-business-form') {
                e.preventDefault();
                await this.saveBusiness();
            } else if (e.target.id === 'settings-invoice-form') {
                e.preventDefault();
                await this.saveInvoice();
            } else if (e.target.id === 'settings-tax-form') {
                e.preventDefault();
                await this.saveTax();
            } else if (e.target.id === 'settings-upi-form') {
                e.preventDefault();
                await this.saveUpi();
            } else if (e.target.id === 'settings-password-form') {
                e.preventDefault();
                await this.savePassword();
            }
        });
    },

    bindAuditEvents() {
        const appContent = document.getElementById('app-content');
        appContent.addEventListener('click', (e) => {
            if (e.target.closest('.page-btn')) {
                const btn = e.target.closest('.page-btn');
                const page = btn.dataset.page;
                if (page) this.loadAuditLogs(parseInt(page));
            }
        });
    },

    async loadBusiness() {
        try {
            const res = await API.get('/api/settings/business');
            if (res) {
                document.getElementById('bus-name').value = res.name || '';
                document.getElementById('bus-owner').value = res.owner_name || '';
                document.getElementById('bus-phone').value = res.phone || '';
                document.getElementById('bus-email').value = res.email || '';
                document.getElementById('bus-address').value = res.address || '';
            }
        } catch(e) {}
    },

    async saveBusiness() {
        const btn = document.getElementById('btn-save-bus');
        const data = {
            name: document.getElementById('bus-name').value,
            owner_name: document.getElementById('bus-owner').value,
            phone: document.getElementById('bus-phone').value,
            email: document.getElementById('bus-email').value,
            address: document.getElementById('bus-address').value
        };

        try {
            await API.submitOnce(btn, () => API.put('/api/settings/business', data));
            
            // Handle logo upload separately if selected
            const fileInput = document.getElementById('bus-logo');
            if (fileInput.files.length > 0) {
                const formData = new FormData();
                formData.append('logo', fileInput.files[0]);
                // Assuming API.upload exists in api.js as a wrapper for fetch with FormData
                if (API.upload) {
                    await API.upload('/api/settings/business/logo', formData);
                } else {
                    const token = localStorage.getItem('token');
                    await fetch('/api/settings/business/logo', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + token },
                        body: formData
                    });
                }
            }
            
            App.toast('Business settings saved', 'success');
        } catch (e) {
            App.toast(e.message || 'Error saving settings', 'error');
        }
    },

    async loadInvoice() {
        try {
            const res = await API.get('/api/settings/invoice');
            if (res) {
                document.getElementById('inv-prefix').value = res.prefix || '';
                document.getElementById('inv-start').value = res.starting_number || '';
                document.getElementById('inv-terms').value = res.terms || '';
                document.getElementById('inv-footer').value = res.footer || '';
                document.getElementById('inv-signature').value = res.signature || '';
            }
        } catch(e) {}
    },

    async saveInvoice() {
        const btn = document.getElementById('btn-save-inv');
        const data = {
            prefix: document.getElementById('inv-prefix').value,
            starting_number: parseInt(document.getElementById('inv-start').value),
            terms: document.getElementById('inv-terms').value,
            footer: document.getElementById('inv-footer').value,
            signature: document.getElementById('inv-signature').value
        };
        try {
            await API.submitOnce(btn, () => API.put('/api/settings/invoice', data));
            App.toast('Invoice settings saved', 'success');
        } catch (e) {
            App.toast('Error saving settings', 'error');
        }
    },

    async loadTax() {
        try {
            const res = await API.get('/api/settings/tax');
            if (res) {
                document.getElementById('tax-enabled').checked = res.gst_enabled;
                document.getElementById('tax-gstin').value = res.gstin || '';
                document.getElementById('tax-cgst').value = res.cgst_rate || '';
                document.getElementById('tax-sgst').value = res.sgst_rate || '';
                document.getElementById('tax-igst').value = res.igst_rate || '';
            }
        } catch(e) {}
    },

    async saveTax() {
        const btn = document.getElementById('btn-save-tax');
        const data = {
            gst_enabled: document.getElementById('tax-enabled').checked,
            gstin: document.getElementById('tax-gstin').value,
            cgst_rate: parseFloat(document.getElementById('tax-cgst').value) || 0,
            sgst_rate: parseFloat(document.getElementById('tax-sgst').value) || 0,
            igst_rate: parseFloat(document.getElementById('tax-igst').value) || 0
        };
        try {
            await API.submitOnce(btn, () => API.put('/api/settings/tax', data));
            App.toast('Tax settings saved', 'success');
        } catch (e) {
            App.toast('Error saving settings', 'error');
        }
    },

    loadAppearance() {
        const theme = localStorage.getItem('theme') || 'system';
        const radio = document.querySelector(`input[name="theme"][value="${theme}"]`);
        if (radio) radio.checked = true;
    },

    saveAppearance() {
        const themeRadio = document.querySelector('input[name="theme"]:checked');
        const theme = themeRadio ? themeRadio.value : 'system';
        if (App.setTheme) {
            App.setTheme(theme);
        } else {
            localStorage.setItem('theme', theme);
            document.body.className = theme === 'system' ? '' : `theme-${theme}`;
        }
        App.toast('Appearance saved', 'success');
    },

    async loadUpi() {
        try {
            const res = await API.get('/api/settings/upi');
            if (res) {
                this._upiCache = res;
                // Populate form fields
                const el = (id) => document.getElementById(id);
                if (el('upi-enabled')) el('upi-enabled').checked = res.enabled;
                if (el('upi-id')) el('upi-id').value = res.upi_id || '';
                if (el('upi-payee')) el('upi-payee').value = res.payee_name || '';
                if (el('upi-mcc')) el('upi-mcc').value = res.merchant_code || '';
                if (el('upi-currency')) el('upi-currency').value = res.currency || 'INR';
                if (el('upi-note')) el('upi-note').value = res.note || '';
                if (el('upi-show-invoice')) el('upi-show-invoice').checked = res.show_on_invoice;
                if (el('upi-show-thermal')) el('upi-show-thermal').checked = res.show_on_thermal;
                if (el('upi-qr-size')) el('upi-qr-size').value = res.qr_size || 220;
                // Save to localStorage for offline access by other modules
                localStorage.setItem('upi_config', JSON.stringify(res));
            }
        } catch (e) { console.warn('UPI load error:', e); }
    },

    async saveUpi() {
        const btn = document.getElementById('btn-save-upi');
        const data = {
            enabled: document.getElementById('upi-enabled').checked,
            upi_id: document.getElementById('upi-id').value.trim(),
            payee_name: document.getElementById('upi-payee').value.trim(),
            merchant_code: (document.getElementById('upi-mcc').value || '').trim(),
            note: (document.getElementById('upi-note').value || '').trim(),
            currency: document.getElementById('upi-currency').value,
            show_on_invoice: document.getElementById('upi-show-invoice').checked,
            show_on_thermal: document.getElementById('upi-show-thermal').checked,
            qr_size: parseInt(document.getElementById('upi-qr-size').value) || 220
        };

        if (data.enabled && !data.upi_id) {
            return App.toast('Please enter a valid UPI ID to enable UPI payments', 'error');
        }

        try {
            await API.submitOnce(btn, () => API.put('/api/settings/upi', data));
            this._upiCache = data;
            localStorage.setItem('upi_config', JSON.stringify(data));
            App.toast('UPI settings saved successfully! ⚡', 'success');
        } catch (e) {
            App.toast(e.message || 'Error saving UPI settings', 'error');
        }
    },

    testUpiQr() {
        const cfg = this.getUpiConfig();
        if (!cfg.upi_id) {
            return App.toast('Please save a UPI ID first', 'error');
        }
        if (window.ThemeEngine && ThemeEngine.showUpiModal) {
            ThemeEngine.showUpiModal(250, 'TEST-001', 'Test Customer');
        } else {
            App.toast('ThemeEngine not available', 'error');
        }
    },

    /** Static helper: returns the current UPI config from cache/localStorage */
    getUpiConfig() {
        if (this._upiCache) return this._upiCache;
        try {
            const stored = localStorage.getItem('upi_config');
            if (stored) {
                this._upiCache = JSON.parse(stored);
                return this._upiCache;
            }
        } catch(e) {}
        return { enabled: false, upi_id: '', payee_name: '', merchant_code: '', note: '', show_on_invoice: true, show_on_thermal: true, qr_size: 220, currency: 'INR' };
    },


    async savePassword() {
        const current = document.getElementById('pwd-current').value;
        const newPwd = document.getElementById('pwd-new').value;
        const confirm = document.getElementById('pwd-confirm').value;

        if (newPwd !== confirm) {
            return App.toast('New passwords do not match', 'error');
        }

        const btn = document.getElementById('btn-save-pwd');
        try {
            await API.submitOnce(btn, () => API.put('/api/auth/password', { current_password: current, new_password: newPwd }));
            App.toast('Password updated successfully', 'success');
            document.getElementById('settings-password-form').reset();
        } catch (e) {
            App.toast(e.message || 'Error updating password', 'error');
        }
    },

    async loadAuditLogs(page = 1) {
        const container = document.getElementById('audit-table-container');
        if (!container) return;
        
        try {
            const res = await API.get(`/api/settings/audit-logs?page=${page}`);
            const logs = res.data || res.logs || (Array.isArray(res) ? res : []);
            if (logs.length === 0) {
                container.innerHTML = '<div class="empty-state">No audit logs found.</div>';
                return;
            }

            let html = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>User</th>
                            <th>Action</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            logs.forEach(log => {
                html += `
                    <tr>
                        <td>${App.formatDate(log.created_at)}</td>
                        <td><strong>${log.username || 'System'}</strong></td>
                        <td><span class="badge badge-secondary">${log.action}</span></td>
                        <td>${log.details || '-'}</td>
                    </tr>
                `;
            });

            html += `</tbody></table>`;
            const totalPages = (res.pagination && res.pagination.totalPages) || res.totalPages || res.pages || 1;
            html += App.paginationHtml(page, totalPages, 'Settings.loadAuditLogs');
            container.innerHTML = html;
        } catch (e) {
            container.innerHTML = '<div class="empty-state">Error loading audit logs.</div>';
        }
    }
};
