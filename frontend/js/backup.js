window.Backup = {
    render() {
        return `
            <div class="page-header">
                <h2>Backup & Restore</h2>
            </div>
            
            <div class="card mt-4" style="max-width: 600px; margin: 0 auto 20px;">
                <div class="card-header">
                    <h3>Create Backup</h3>
                </div>
                <div class="card-body text-center">
                    <p class="mb-4">Create a manual backup of your entire database and files.</p>
                    <button class="btn btn-primary" id="btn-create-backup" onclick="Backup.createBackup()">Create Backup Now</button>
                </div>
            </div>

            <div class="card" style="max-width: 1000px; margin: 0 auto;">
                <div class="card-header">
                    <h3>Backup History</h3>
                </div>
                <div class="card-body">
                    <div class="table-responsive" id="backup-table-container">
                        <p>Loading backups...</p>
                    </div>
                </div>
            </div>
        `;
    },

    async init() {
        this.loadList();
    },

    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    async loadList() {
        const container = document.getElementById('backup-table-container');
        if (!container) return;

        try {
            const res = await API.get('/api/backup/list');
            const backups = Array.isArray(res) ? res : (res.data || []);
            
            if (backups.length === 0) {
                container.innerHTML = '<div class="empty-state">No backups available. Click "Create Backup Now" above.</div>';
                return;
            }

            let html = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Filename</th>
                            <th>Date</th>
                            <th>Size</th>
                            <th style="text-align:right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            backups.forEach(b => {
                html += `
                    <tr>
                        <td><strong>${b.filename}</strong></td>
                        <td>${App.formatDate(b.date || b.created_at)}</td>
                        <td>${this.formatBytes(b.size)}</td>
                        <td style="text-align:right">
                            <button class="btn btn-sm btn-secondary" onclick="Backup.restore('${b.filename}')">Restore</button>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table>`;
            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = '<div class="empty-state">Error loading backup history.</div>';
        }
    },

    async createBackup() {
        const btn = document.getElementById('btn-create-backup');
        try {
            const res = await API.submitOnce(btn, () => API.post('/api/backup/create'));
            App.toast(`Backup created successfully: ${res.filename || ''}`, 'success');
            this.loadList();
        } catch (err) {
            App.toast(err.message || 'Error creating backup', 'error');
        }
    },

    async restore(filename) {
        App.confirm('WARNING: Restoring will overwrite all current data. Are you sure you want to proceed?', async () => {
            try {
                App.toast('Restoring backup...', 'warning');
                await API.post('/api/backup/restore', { filename });
                App.toast('Backup restored successfully! Reloading...', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                App.toast(err.message || 'Error restoring backup', 'error');
            }
        });
    }
};
