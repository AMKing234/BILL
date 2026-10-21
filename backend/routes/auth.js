const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../database/database');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    if (!user.active) {
      return res.status(401).json({ error: 'This account is disabled.' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.name = user.name;
    req.session.role = user.role;

    // Audit log
    db.prepare(
      'INSERT INTO audit_logs (user_id, action, entity_type, details) VALUES (?, ?, ?, ?)'
    ).run(user.id, 'LOGIN', 'user', 'User logged in');

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  try {
    if (req.session && req.session.userId) {
      db.prepare(
        'INSERT INTO audit_logs (user_id, action, entity_type, details) VALUES (?, ?, ?, ?)'
      ).run(req.session.userId, 'LOGOUT', 'user', 'User logged out');
    }
    req.session.destroy(() => {
      res.json({ message: 'Logged out successfully.' });
    });
  } catch (err) {
    res.json({ message: 'Logged out.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, name, role, email, phone FROM users WHERE id = ?').get(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user info.' });
  }
});

// PUT /api/auth/password
router.put('/password', requireAuth, (req, res) => {
  try {
    const currentPassword = req.body.currentPassword || req.body.current_password;
    const newPassword = req.body.newPassword || req.body.new_password;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const valid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now","localtime") WHERE id = ?').run(hash, user.id);

    db.prepare(
      'INSERT INTO audit_logs (user_id, action, entity_type, details) VALUES (?, ?, ?, ?)'
    ).run(user.id, 'PASSWORD_CHANGED', 'user', 'Password changed');

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('[Auth] Password change error:', err.message);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

module.exports = router;
