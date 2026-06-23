// ============================================================
// routes/admin.js — Admin-Only User Management Endpoints
// All routes guarded by: authenticateToken + requireRole('admin')
// ============================================================

const express  = require('express');
const bcrypt   = require('bcryptjs');
const pool     = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router   = express.Router();

// Apply auth + admin guard to ALL routes in this file
router.use(authenticateToken, requireRole('admin'));

/**
 * GET /api/admin/users
 * Returns all users with an aggregated count of invoices processed.
 * Uses a LEFT JOIN + GROUP BY to attach invoice counts.
 */
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.created_at,
        COUNT(i.id)::INTEGER AS invoices_processed
      FROM users u
      LEFT JOIN invoices i ON i.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    res.json({ users: result.rows });
  } catch (err) {
    console.error('GET /admin/users error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

/**
 * POST /api/admin/users
 * Creates a new platform user with a hashed password.
 * Admin can set the role at creation time.
 */
router.post('/users', async (req, res) => {
  const { name, email, password, role = 'user' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'user' or 'admin'." });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, name, email, role, status, created_at`,
      [name, email, password_hash, role]
    );

    res.status(201).json({ message: 'User created.', user: result.rows[0] });
  } catch (err) {
    console.error('POST /admin/users error:', err);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Updates user name, role, or status (active/suspended).
 * Does NOT allow direct password update via this route for security.
 */
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, role, status } = req.body;

  // Prevent admin from suspending their own account
  if (req.user.id === id && status === 'suspended') {
    return res.status(400).json({ error: 'You cannot suspend your own account.' });
  }

  if (role && !['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'user' or 'admin'." });
  }

  if (status && !['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: "Status must be 'active' or 'suspended'." });
  }

  try {
    // Build dynamic SET clause from provided fields
    const fields = [];
    const values = [];
    let idx = 1;

    if (name)   { fields.push(`name = $${idx++}`);   values.push(name); }
    if (role)   { fields.push(`role = $${idx++}`);   values.push(role); }
    if (status) { fields.push(`status = $${idx++}`); values.push(status); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, role, status, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'User updated.', user: result.rows[0] });
  } catch (err) {
    console.error('PUT /admin/users error:', err);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Removes a user account. Invoices remain (user_id set to NULL via FK).
 * Prevents admin from deleting their own account.
 */
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  if (req.user.id === id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, name, email',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'User deleted.', deleted: result.rows[0] });
  } catch (err) {
    console.error('DELETE /admin/users error:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

module.exports = router;
