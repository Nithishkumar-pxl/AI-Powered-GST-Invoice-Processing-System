// ============================================================
// config/db.js — PostgreSQL Connection Pool
// Uses the native `pg` client with a connection pool
// ============================================================

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'invoice_gst_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Connection pool settings
  max: 10,                  // max simultaneous connections
  idleTimeoutMillis: 30000, // close idle clients after 30s
  connectionTimeoutMillis: 2000, // error if cannot connect in 2s
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.stack);
  } else {
    console.log('✅ PostgreSQL connected successfully');
    release();
  }
});

module.exports = pool;
