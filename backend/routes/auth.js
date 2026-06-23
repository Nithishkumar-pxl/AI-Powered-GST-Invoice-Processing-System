// ============================================================
// routes/auth.js — Login & Registration Endpoints
// ============================================================

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../config/db');
const router   = express.Router();

/**
 * POST /api/auth/register
 * Creates a new user account with a hashed password.
 * Default role is 'user'; admin accounts are created via admin panel.
 */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  try {
    // Check if email already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Hash password with bcrypt (12 salt rounds)
    const password_hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ($1, $2, $3, 'user', 'active')
       RETURNING id, name, email, role, status, created_at`,
      [name, email, password_hash]
    );

    res.status(201).json({ message: 'Account created successfully.', user: result.rows[0] });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

/**
 * POST /api/auth/login
 * Validates credentials and returns a signed JWT token.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Contact administrator.' });
    }

    // Compare provided password with stored hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Sign JWT — payload carries identity and role for middleware checks
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id:        user.id,
        name:      user.name,
        email:     user.email,
        role:      user.role,
        status:    user.status,
        createdAt: user.created_at,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

module.exports = router;
