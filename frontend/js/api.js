const API = {
  _submitting: false,
  
  async request(method, url, body = null) {
    try {
      const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(url, opts);
      if (res.status === 401) {
        if (window.Auth) Auth.showLogin();
        throw new Error('Session expired. Please login again.');
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed.');
      return data;
    } catch (err) {
      throw err;
    }
  },
  
  get(url) { return this.request('GET', url); },
  post(url, body) { return this.request('POST', url, body); },
  put(url, body) { return this.request('PUT', url, body); },
  delete(url) { return this.request('DELETE', url); },
  
  // Prevent double-click submissions - supports both (btn, fn) and (method, url, body, btn)
  async submitOnce(...args) {
    if (this._submitting) return;
    let btn = null;
    let fn = null;

    if (typeof args[1] === 'function') {
      btn = args[0];
      fn = args[1];
    } else if (typeof args[0] === 'function') {
      fn = args[0];
    } else {
      const [method, url, body, button] = args;
      btn = button;
      fn = () => this.request(method, url, body);
    }

    this._submitting = true;
    if (btn && btn.nodeType) {
      btn.disabled = true;
      btn.dataset.origText = btn.textContent;
      btn.textContent = 'Saving...';
    }

    try {
      const result = await fn();
      return result;
    } finally {
      this._submitting = false;
      if (btn && btn.nodeType) {
        btn.disabled = false;
        if (btn.dataset.origText !== undefined) {
          btn.textContent = btn.dataset.origText;
        }
      }
    }
  },
  
  // Upload file
  async upload(url, formData) {
    const res = await fetch(url, { method: 'POST', body: formData });
    if (res.status === 401) { 
      if (window.Auth) Auth.showLogin(); 
      throw new Error('Session expired.'); 
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed.');
    return data;
  }
};

window.API = API;
