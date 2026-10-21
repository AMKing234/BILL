const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { db, DB_PATH, saveToDisk, reload } = require('../database/database');
const { requireAuth } = require('../middleware/auth');

const BACKUPS_DIR = path.join(path.dirname(DB_PATH), 'backups');
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Helper for audit logs
const logAudit = (userId, action, entityType, entityId, details) => {
  try {
    const stmt = db.prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))');
    stmt.run(userId, action, entityType, entityId, details);
  } catch (err) {
    try {
        const stmtFallback = db.prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)');
        stmtFallback.run(userId, action, entityType, entityId, details);
    } catch(e) {}
  }
};

const formatDate = (date) => {
  const pad = (n) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
};

router.get('/list', requireAuth, (req, res) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.sqlite'))
      .map(filename => {
        const stats = fs.statSync(path.join(BACKUPS_DIR, filename));
        return {
          filename,
          size: stats.size,
          date: stats.mtime
        };
      })
      .sort((a, b) => b.date - a.date); // Newest first
      
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

router.post('/create', requireAuth, (req, res) => {
  try {
    // 1. Flush memory to disk
    saveToDisk();
    
    // 2. Copy database.sqlite
    const timestamp = formatDate(new Date());
    const backupFilename = `backup_${timestamp}.sqlite`;
    const backupPath = path.join(BACKUPS_DIR, backupFilename);
    
    fs.copyFileSync(DB_PATH, backupPath);
    
    // 3. Audit log
    logAudit(req.session.userId || 1, 'CREATE_BACKUP', 'system', null, JSON.stringify({ filename: backupFilename }));
    
    const stats = fs.statSync(backupPath);
    
    // 4. Return info
    res.json({
      filename: backupFilename,
      size: stats.size,
      date: stats.mtime
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create backup', details: err.message });
  }
});

router.post('/restore', requireAuth, async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    
    const backupPath = path.join(BACKUPS_DIR, filename);
    
    // Validate file exists and is inside backups dir
    if (!fs.existsSync(backupPath) || !path.normalize(backupPath).startsWith(path.normalize(BACKUPS_DIR))) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    // Create a safety backup
    const timestamp = formatDate(new Date());
    const safetyFilename = `backup_safety_${timestamp}.sqlite`;
    const safetyPath = path.join(BACKUPS_DIR, safetyFilename);
    
    saveToDisk();
    fs.copyFileSync(DB_PATH, safetyPath);
    
    // Copy the selected backup over database.sqlite
    fs.copyFileSync(backupPath, DB_PATH);
    
    // Reload database into memory
    await reload();
    
    logAudit(req.session.userId || 1, 'RESTORE_BACKUP', 'system', null, JSON.stringify({ filename }));
    
    res.json({ 
      success: true, 
      message: 'Backup restored successfully!' 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore backup', details: err.message });
  }
});

module.exports = router;
