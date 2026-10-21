const App = {
  currentRoute: '',
  
  // Route definitions mapping hash to module
  routes: {
    '/dashboard': { title: 'Dashboard', module: 'Dashboard' },
    '/customers': { title: 'Customers', module: 'Customers' },
    '/products': { title: 'Products', module: 'Products' },
    '/inventory': { title: 'Inventory', module: 'Inventory', action: 'current' },
    '/inventory/current': { title: 'Inventory', module: 'Inventory', action: 'current' },
    '/inventory/low': { title: 'Low Stock Inventory', module: 'Inventory', action: 'low' },
    '/inventory/history': { title: 'Stock History', module: 'Inventory', action: 'history' },
    '/inventory/adjust': { title: 'Adjust Stock', module: 'Inventory', action: 'adjust' },
    '/invoices': { title: 'Invoices', module: 'Invoices' },
    '/invoices/new': { title: 'New Invoice', module: 'Invoices', action: 'new' },
    '/payments': { title: 'Payments', module: 'Payments' },
    '/due': { title: 'Udari / Due', module: 'Payments', action: 'due' },
    '/ledger': { title: 'Ledger Book / खाता बही', module: 'Ledger' },
    '/ledger/customer': { title: 'Customer Khata (ग्राहक खाता)', module: 'Ledger', action: 'customer' },
    '/ledger/supplier': { title: 'Supplier Khata (सप्लायर खाता)', module: 'Ledger', action: 'supplier' },
    '/ledger/daybook': { title: 'Daily Cashbook (रोजनामचा)', module: 'Ledger', action: 'daybook' },
    '/purchases': { title: 'Purchases', module: 'Purchases' },
    '/purchases/new': { title: 'New Purchase', module: 'Purchases', action: 'new' },
    '/suppliers': { title: 'Suppliers', module: 'Suppliers' },
    '/expenses': { title: 'Expenses', module: 'Expenses' },
    '/returns': { title: 'Sales Returns', module: 'Returns', action: 'sales' },
    '/returns/sales': { title: 'Sales Returns', module: 'Returns', action: 'sales' },
    '/returns/purchases': { title: 'Purchase Returns', module: 'Returns', action: 'purchases' },
    '/reports': { title: 'Reports', module: 'Reports' },
    '/settings': { title: 'Settings', module: 'Settings' },
    '/settings/business': { title: 'Settings - Business', module: 'Settings', action: 'business' },
    '/settings/invoice': { title: 'Settings - Invoice', module: 'Settings', action: 'invoice' },
    '/settings/tax': { title: 'Settings - Tax', module: 'Settings', action: 'tax' },
    '/settings/appearance': { title: 'Settings - Appearance', module: 'Settings', action: 'appearance' },
    '/settings/password': { title: 'Settings - Password', module: 'Settings', action: 'password' },
    '/settings/audit': { title: 'Activity Log', module: 'Settings', action: 'audit' },
    '/backup': { title: 'Backup & Restore', module: 'Backup' },
    '/audit': { title: 'Activity Log', module: 'Settings', action: 'audit' },
    '/audit-log': { title: 'Activity Log', module: 'Settings', action: 'audit' },
  },
  
  init() {
    this.initTheme();
    this.initClock();
    // Listen for hash changes
    window.addEventListener('hashchange', () => this.navigate());
    // Set initial route
    if (!location.hash || location.hash === '#' || location.hash === '#/') {
      location.hash = '#/dashboard';
    } else {
      this.navigate();
    }
  },
  
  navigate(targetPath) {
    if (typeof targetPath === 'string' && targetPath.length > 0) {
      let clean = targetPath.startsWith('#') ? targetPath.slice(1) : targetPath;
      if (!clean.startsWith('/')) clean = '/' + clean;
      if (location.hash !== '#' + clean) {
        location.hash = '#' + clean;
        return;
      }
    }

    let rawHash = (location.hash.slice(1) || '/dashboard').split('?')[0];
    if (!rawHash.startsWith('/')) rawHash = '/' + rawHash;
    let route = this.routes[rawHash];

    // Fallback matching for subpaths like /customers/:id or /inventory/:tab
    if (!route) {
      const parts = rawHash.split('/').filter(Boolean);
      const basePath = '/' + (parts[0] || 'dashboard');
      if (this.routes[basePath]) {
        route = {
          ...this.routes[basePath],
          action: parts.length > 1 ? parts[1] : this.routes[basePath].action
        };
      }
    }

    if (!route) {
      location.hash = '#/dashboard';
      return;
    }

    // Update page title
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = route.title;
    
    // Update active nav item
    const rootNav = '/' + (rawHash.split('/').filter(Boolean)[0] || 'dashboard');
    document.querySelectorAll('.nav-item').forEach(el => {
      const routeAttr = el.getAttribute('data-route');
      el.classList.toggle('active', routeAttr === rawHash || routeAttr === rootNav);
    });
    
    // Call module render
    const module = window[route.module];
    const contentEl = document.getElementById('app-content');
    if (contentEl) {
      contentEl.scrollTop = 0;
      if (module && module.render) {
        contentEl.innerHTML = module.render(route.action);
        if (module.init) module.init(route.action);
      } else if (window.Dashboard && window.Dashboard.render) {
        contentEl.innerHTML = window.Dashboard.render();
        if (window.Dashboard.init) window.Dashboard.init();
      }
    }
    this.currentRoute = rawHash;
    // Close mobile sidebar
    this.closeSidebar();
  },
  
  // Theme management
  setTheme(theme) {
    if (window.ThemeEngine) {
      if (theme === 'light') {
        window.ThemeEngine.applyTheme('modern-executive');
      } else if (theme === 'dark') {
        window.ThemeEngine.applyTheme('midnight-obsidian');
      } else {
        window.ThemeEngine.applyTheme(window.ThemeEngine.config.themeId || 'midnight-obsidian');
      }
      return;
    }
    localStorage.setItem('theme', theme);
    const resolvedTheme = (theme === 'system') 
      ? ((window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light')
      : theme;
    
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    
    // Toggle sun / moon icons
    const darkIcon = document.querySelector('.theme-toggle-btn .dark-icon');
    const lightIcon = document.querySelector('.theme-toggle-btn .light-icon');
    if (darkIcon && lightIcon) {
      if (resolvedTheme === 'dark') {
        darkIcon.classList.remove('hidden');
        lightIcon.classList.add('hidden');
      } else {
        darkIcon.classList.add('hidden');
        lightIcon.classList.remove('hidden');
      }
    }
  },
  
  getTheme() {
    if (window.ThemeEngine) {
      return window.ThemeEngine.isCurrentThemeDark() ? 'dark' : 'light';
    }
    return localStorage.getItem('theme') || 'dark';
  },
  
  initTheme() {
    if (window.ThemeEngine) {
      window.ThemeEngine.init();
    } else {
      const theme = this.getTheme();
      this.setTheme(theme);
    }
  },

  // Live real-time status clock
  initClock() {
    const updateTime = () => {
      const clockEl = document.getElementById('current-time-text');
      if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    };
    updateTime();
    if (!this._clockInterval) {
      this._clockInterval = setInterval(updateTime, 10000);
    }
  },
  
  // Toast notifications
  toast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const toastClass = type === 'danger' ? 'toast-danger toast-error' : (type === 'error' ? 'toast-error' : `toast-${type}`);
    toast.className = `toast ${toastClass}`;
    toast.innerHTML = `<span>${message}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { 
      toast.classList.remove('show'); 
      setTimeout(() => toast.remove(), 300); 
    }, duration);
  },
  
  // Modal helpers - supports element ID, full HTML string, or (title, bodyHtml, footerHtml)
  showModal(title, bodyHtml = '', footerHtml = '') {
    // 1. Element ID passed (e.g. 'expense-modal', 'return-modal')
    if (typeof title === 'string' && !bodyHtml && !footerHtml) {
      const el = document.getElementById(title);
      if (el) {
        el.style.display = 'flex';
        setTimeout(() => el.classList.add('active'), 10);
        return;
      }
    }

    // Prepare container
    let container = document.getElementById('modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modal-container';
      document.body.appendChild(container);
    }

    // 2. Full HTML fragment passed
    if (typeof title === 'string' && !bodyHtml && (title.includes('<') || title.includes('modal'))) {
      let content = title;
      if (!content.includes('modal-overlay')) {
        content = `
          <div class="modal-overlay active" onclick="if(event.target===this)App.closeModal()">
            <div class="modal" onclick="event.stopPropagation()">
              ${content}
            </div>
          </div>
        `;
      } else {
        content = content.replace(/class=["']modal-overlay["']/, 'class="modal-overlay active"');
      }
      container.innerHTML = content;
      container.style.display = 'block';
      const overlayEl = container.querySelector('.modal-overlay');
      if (overlayEl) {
        overlayEl.style.display = 'flex';
        setTimeout(() => overlayEl.classList.add('active'), 10);
      }
      return;
    }

    // 3. (title, bodyHtml, footerHtml) format
    container.innerHTML = `
      <div class="modal-overlay active" onclick="if(event.target===this)App.closeModal()">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="btn-icon" onclick="App.closeModal()">&times;</button>
          </div>
          <div class="modal-body">${bodyHtml}</div>
          ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
        </div>
      </div>
    `;
    container.style.display = 'block';
    const overlayEl = container.querySelector('.modal-overlay');
    if (overlayEl) {
      overlayEl.style.display = 'flex';
      setTimeout(() => overlayEl.classList.add('active'), 10);
    }
  },
  
  closeModal(id) {
    if (id) {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('active');
        el.style.display = 'none';
      }
    }
    const container = document.getElementById('modal-container');
    if (container) {
      container.style.display = 'none';
      container.innerHTML = '';
    }
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
      m.style.display = 'none';
    });
  },
  
  // Confirm dialog - supports both await App.confirm(msg) AND App.confirm(msg, callback)
  confirm(message, callback) {
    return new Promise(resolve => {
      this._confirmHandler = (confirmed) => {
        resolve(confirmed);
        if (confirmed && typeof callback === 'function') {
          callback();
        }
      };
      this.showModal('Confirm', `<p style="margin: 10px 0 20px;">${message}</p>`,
        `<button class="btn btn-secondary" onclick="App.closeModal(); if(App._confirmHandler) App._confirmHandler(false)">Cancel</button>
         <button class="btn btn-danger" onclick="App.closeModal(); if(App._confirmHandler) App._confirmHandler(true)">Confirm</button>`);
    });
  },
  
  // Format currency
  currency(amount) {
    const num = parseFloat(amount) || 0;
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  
  // Format date
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  
  // Debounce
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  },
  
  // Pagination HTML helper
  paginationHtml(page, totalPages, onClickFn) {
    if (totalPages <= 1) return '';
    let html = '<div class="pagination">';
    html += `<button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="${onClickFn}(${page - 1})" data-page="${page - 1}">&laquo;</button>`;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
        html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="${onClickFn}(${i})" data-page="${i}">${i}</button>`;
      } else if (i === page - 3 || i === page + 3) {
        html += '<span class="page-dots">...</span>';
      }
    }
    html += `<button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="${onClickFn}(${page + 1})" data-page="${page + 1}">&raquo;</button>`;
    html += '</div>';
    return html;
  },
  
  // Toggle mobile sidebar
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
  },
  
  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
  }
};

window.App = App;
