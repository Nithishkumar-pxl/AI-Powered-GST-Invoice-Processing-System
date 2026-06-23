// ============================================================
// db/seed.js — Runs init.sql and creates the default admin user
// Run with: node db/seed.js
// ============================================================

require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function seed() {
  const client = new Client({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME     || 'invoice_gst_db',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Run the SQL init script (creates tables and indexes)
    const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf-8');
    await client.query(sql);
    console.log('✅ Schema initialized from init.sql');

    // Generate a real bcrypt hash for the default admin
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123';
    const hash = await bcrypt.hash(adminPassword, 12);

    await client.query(`
      INSERT INTO users (name, email, password_hash, role, status)
      VALUES ($1, $2, $3, 'admin', 'active')
      ON CONFLICT (email) DO UPDATE SET password_hash = $3
    `, ['System Admin', 'admin@gstextract.com', hash]);

    console.log('✅ Default admin created: admin@gstextract.com / ' + adminPassword);
    console.log('\n🚀 Database seeded. You are ready to start the server.\n');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
