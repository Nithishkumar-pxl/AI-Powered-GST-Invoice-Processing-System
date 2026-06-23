// ============================================================
// routes/invoices.js — Invoice History, Search, Stats, Delete
// ============================================================

const express = require('express');
const fs      = require('fs');
const pool    = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router  = express.Router();

// All invoice routes require authentication
router.use(authenticateToken);

/**
 * GET /api/invoices
 * Returns paginated invoice history for the current user (admins see all).
 * Supports search by vendor name, invoice number, or GSTIN.
 */
router.get('/', async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    // Admins see all invoices; regular users see only their own
    const isAdmin = req.user.role === 'admin';

    let query, params;

    if (search) {
      const term = `%${search}%`;
      query = isAdmin
        ? `SELECT i.*, u.name as user_name FROM invoices i
           LEFT JOIN users u ON i.user_id = u.id
           WHERE (i.vendor_name ILIKE $1 OR i.invoice_no ILIKE $1 OR i.gstin_no ILIKE $1)
           ORDER BY i.created_at DESC LIMIT $2 OFFSET $3`
        : `SELECT i.*, u.name as user_name FROM invoices i
           LEFT JOIN users u ON i.user_id = u.id
           WHERE i.user_id = $1 AND (i.vendor_name ILIKE $2 OR i.invoice_no ILIKE $2 OR i.gstin_no ILIKE $2)
           ORDER BY i.created_at DESC LIMIT $3 OFFSET $4`;

      params = isAdmin ? [term, limit, offset] : [req.user.id, term, limit, offset];
    } else {
      query = isAdmin
        ? `SELECT i.*, u.name as user_name FROM invoices i
           LEFT JOIN users u ON i.user_id = u.id
           ORDER BY i.created_at DESC LIMIT $1 OFFSET $2`
        : `SELECT i.*, u.name as user_name FROM invoices i
           LEFT JOIN users u ON i.user_id = u.id
           WHERE i.user_id = $1 ORDER BY i.created_at DESC LIMIT $2 OFFSET $3`;

      params = isAdmin ? [limit, offset] : [req.user.id, limit, offset];
    }

    const result = await pool.query(query, params);

    // Get total count for pagination
    const countQuery = isAdmin
      ? 'SELECT COUNT(*) FROM invoices'
      : 'SELECT COUNT(*) FROM invoices WHERE user_id = $1';
    const countResult = await pool.query(countQuery, isAdmin ? [] : [req.user.id]);

    res.json({
      invoices: result.rows,
      total:    parseInt(countResult.rows[0].count),
      page:     parseInt(page),
      limit:    parseInt(limit),
    });
  } catch (err) {
    console.error('GET /invoices error:', err);
    res.status(500).json({ error: 'Failed to fetch invoices.' });
  }
});

/**
 * GET /api/invoices/:id
 * Returns a single invoice by ID including its raw JSONB payload.
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, u.name as user_name FROM invoices i
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const invoice = result.rows[0];

    // Non-admins can only access their own invoices
    if (req.user.role !== 'admin' && invoice.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ invoice });
  } catch (err) {
    console.error('GET /invoices/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch invoice.' });
  }
});

/**
 * PUT /api/invoices/:id
 * Updates editable fields on an invoice (after human correction in Extraction view).
 */
router.put('/:id', async (req, res) => {
  const { invoice_no, invoice_date, gstin_no, vendor_name, gst_rate, taxable_amount } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    if (req.user.role !== 'admin' && existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Build updated raw JSON reflecting manual corrections
    const updatedJson = {
      invoice_no, invoice_date, gstin_no, vendor_name, gst_rate, taxable_amount
    };

    const result = await pool.query(
      `UPDATE invoices
       SET invoice_no=$1, invoice_date=$2, gstin_no=$3, vendor_name=$4,
           gst_rate=$5, taxable_amount=$6, raw_extracted_json=$7
       WHERE id=$8
       RETURNING *`,
      [invoice_no, invoice_date || null, gstin_no, vendor_name, gst_rate, taxable_amount,
       JSON.stringify(updatedJson), req.params.id]
    );

    res.json({ message: 'Invoice updated.', invoice: result.rows[0] });
  } catch (err) {
    console.error('PUT /invoices/:id error:', err);
    res.status(500).json({ error: 'Failed to update invoice.' });
  }
});

/**
 * DELETE /api/invoices/:id
 * Removes invoice record and deletes the uploaded file from disk.
 */
router.delete('/:id', async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    if (req.user.role !== 'admin' && existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Delete the physical file
    if (existing.rows[0].file_path && fs.existsSync(existing.rows[0].file_path)) {
      fs.unlinkSync(existing.rows[0].file_path);
    }

    await pool.query('DELETE FROM invoices WHERE id = $1', [req.params.id]);

    res.json({ message: 'Invoice deleted.' });
  } catch (err) {
    console.error('DELETE /invoices/:id error:', err);
    res.status(500).json({ error: 'Failed to delete invoice.' });
  }
});

/**
 * GET /api/invoices/stats/dashboard
 * Returns aggregate stats for the dashboard module.
 */
router.get('/stats/dashboard', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';

    const userFilter = isAdmin ? '' : 'WHERE i.user_id = $1';
    const params = isAdmin ? [] : [req.user.id];

    const [totalResult, gstResult, recentResult, userCount] = await Promise.all([
      pool.query(`SELECT COUNT(*)::INTEGER as total FROM invoices i ${userFilter}`, params),
      pool.query(`SELECT COALESCE(SUM(taxable_amount * gst_rate / 100), 0)::FLOAT as total_gst
                  FROM invoices i ${userFilter}`, params),
      pool.query(`SELECT i.*, u.name as user_name FROM invoices i
                  LEFT JOIN users u ON i.user_id = u.id
                  ${userFilter} ORDER BY i.created_at DESC LIMIT 5`, params),
      isAdmin
        ? pool.query("SELECT COUNT(*)::INTEGER as count FROM users WHERE status='active'")
        : Promise.resolve({ rows: [{ count: 0 }] })
    ]);

    res.json({
      totalInvoices:  totalResult.rows[0].total,
      totalGst:       parseFloat(gstResult.rows[0].total_gst).toFixed(2),
      recentInvoices: recentResult.rows,
      activeUsers:    userCount.rows[0].count,
    });
  } catch (err) {
    console.error('GET /invoices/stats/dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
});

module.exports = router;
