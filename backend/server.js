// ============================================================
// server.js — Main Express Application Entry Point
// Invoice GST Extraction System — Backend Server
// ============================================================

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

// CORS — allow the React frontend (localhost:3000 in dev)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// JSON body parsing (limit for base64 payloads)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve uploaded files statically (for the document viewer in the Extraction view)
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(path.resolve(uploadDir)));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/extract',  require('./routes/extract'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/admin',    require('./routes/admin'));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected error occurred.',
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Invoice GST Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Upload dir:  ${path.resolve(uploadDir)}\n`);
});

module.exports = app;
