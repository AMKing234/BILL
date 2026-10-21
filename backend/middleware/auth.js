// Auth middleware — checks session on protected routes
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Please login to continue.' });
  }
  next();
}

module.exports = { requireAuth };
