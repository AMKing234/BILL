const Auth = {
  async checkSession() {
    try {
      const user = await API.get('/api/auth/me');
      this.showApp(user);
    } catch (err) {
      this.showLogin();
    }
  },

  showLogin() {
    const appSection = document.getElementById('app-section');
    const loginSection = document.getElementById('login-section');
    if (appSection) { appSection.classList.add('hidden'); appSection.classList.remove('active'); }
    if (loginSection) { loginSection.classList.add('active'); loginSection.classList.remove('hidden'); }
  },

  showApp(user) {
    const appSection = document.getElementById('app-section');
    const loginSection = document.getElementById('login-section');
    if (loginSection) { loginSection.classList.add('hidden'); loginSection.classList.remove('active'); }
    if (appSection) { appSection.classList.add('active'); appSection.classList.remove('hidden'); }

    // Update sidebar user info
    const nameEl = document.querySelector('.user-name');
    if (nameEl && user) nameEl.textContent = user.name || user.username;
    const avatarEl = document.querySelector('.avatar');
    if (avatarEl && user) avatarEl.textContent = (user.name || user.username || 'A').charAt(0).toUpperCase();

    if (window.App) {
      App.initTheme();
      App.init();
    }
  },

  async login(username, password) {
    const errorEl = document.getElementById('login-error');
    const btn = document.querySelector('#login-form button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }

    try {
      const user = await API.post('/api/auth/login', { username, password });
      if (errorEl) errorEl.textContent = '';
      if (window.App) App.toast(`Welcome back, ${user.name}!`, 'success');
      this.showApp(user);
    } catch (err) {
      if (errorEl) errorEl.textContent = err.message || 'Login failed. Please try again.';
      if (window.App) App.toast(err.message || 'Login failed', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
    }
  },

  async logout() {
    try {
      await API.post('/api/auth/logout', {});
      if (window.App) App.toast('Logged out successfully.', 'info');
    } catch (err) {
      console.error(err);
    } finally {
      this.showLogin();
    }
  },

  showChangePasswordModal() {
    const bodyHtml = `
      <form id="change-password-form" onsubmit="event.preventDefault(); Auth.changePassword();">
        <div class="form-group">
          <label class="form-label">Current Password</label>
          <input type="password" id="cp-current" class="form-input" required>
        </div>
        <div class="form-group">
          <label class="form-label">New Password</label>
          <input type="password" id="cp-new" class="form-input" required minlength="6">
        </div>
        <div class="form-group">
          <label class="form-label">Confirm New Password</label>
          <input type="password" id="cp-confirm" class="form-input" required minlength="6">
        </div>
      </form>
    `;
    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button type="submit" form="change-password-form" class="btn btn-primary" id="btn-change-pwd">Change Password</button>
    `;
    if (window.App) App.showModal('Change Password', bodyHtml, footerHtml);
  },

  async changePassword() {
    const currentPassword = document.getElementById('cp-current').value;
    const newPassword = document.getElementById('cp-new').value;
    const confirmPassword = document.getElementById('cp-confirm').value;

    if (newPassword !== confirmPassword) {
      return App.toast('New passwords do not match.', 'error');
    }
    if (newPassword.length < 6) {
      return App.toast('Password must be at least 6 characters.', 'error');
    }

    const btn = document.getElementById('btn-change-pwd');
    try {
      await API.submitOnce('PUT', '/api/auth/password', { currentPassword, newPassword }, btn);
      App.toast('Password changed successfully.', 'success');
      App.closeModal();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  bindEvents() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        if (username && password) this.login(username, password);
      });
    }

    // Password toggle
    const toggleBtn = document.querySelector('.toggle-password');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const pwdInput = document.getElementById('password');
        if (pwdInput) {
          const isPassword = pwdInput.type === 'password';
          pwdInput.type = isPassword ? 'text' : 'password';
          toggleBtn.textContent = isPassword ? '🙈' : '👁️';
        }
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    // Mobile menu
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => App.toggleSidebar());
    }

    // Sidebar overlay
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => App.closeSidebar());
    }

    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = App.getTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        App.setTheme(next);
      });
    }
  }
};

window.Auth = Auth;

document.addEventListener('DOMContentLoaded', () => {
  Auth.bindEvents();
  Auth.checkSession();
});
