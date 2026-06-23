// ============================================================
// middleware/auth.js — JWT Authentication & Role Guards
// ============================================================

const jwt = require('jsonwebtoken');

/**
 * authenticateToken
 * Verifies the JWT Bearer token from the Authorization header.
 * Attaches the decoded payload (user id, email, role) to req.user.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, name, email, role }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

/**
 * requireRole
 * Factory function — returns middleware that enforces a specific role.
 * Usage: router.get('/admin-route', authenticateToken, requireRole('admin'), handler)
 */
const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({
      error: `Access denied. Requires role: ${role}.`
    });
  }
  next();
};

module.exports = { authenticateToken, requireRole };
