-- ============================================================
-- Invoice GST Extraction System — Database Schema
-- PostgreSQL Initialization Script
-- ============================================================

-- Enable UUID extension for primary key generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: users
-- Stores platform user accounts, roles, and account status
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255)  NOT NULL,
    email         VARCHAR(255)  UNIQUE NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,
    role          VARCHAR(50)   DEFAULT 'user'
                                CHECK (role IN ('user', 'admin')),
    status        VARCHAR(50)   DEFAULT 'active'
                                CHECK (status IN ('active', 'suspended')),
    created_at    TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- TABLE: invoices
-- Stores extracted invoice data, linked to a user
-- raw_extracted_json holds the full Gemini response as JSONB
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID           REFERENCES users(id) ON DELETE SET NULL,
    invoice_no          VARCHAR(100),
    invoice_date        DATE,
    gstin_no            VARCHAR(15),
    vendor_name         VARCHAR(255),
    gst_rate            NUMERIC(5,2),
    taxable_amount      NUMERIC(12,2),
    raw_extracted_json  JSONB,
    file_path           TEXT,
    original_filename   VARCHAR(255),
    created_at          TIMESTAMP      DEFAULT NOW()
);

-- ============================================================
-- INDEXES: Speed up common queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_invoices_user_id    ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor_name ON invoices(vendor_name);
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);

-- ============================================================
-- SEED: Create a default admin account
-- Password: admin123 (bcrypt hash — change in production!)
-- ============================================================
INSERT INTO users (name, email, password_hash, role, status)
VALUES (
    'System Admin',
    'admin@gstextract.com',
    '$2b$10$rQZ8kHqGm1f2Z3w4Y5X6uOvWpLkJnMsTqRdCaAbBcDeEfFgGhHiI', -- placeholder hash
    'admin',
    'active'
)
ON CONFLICT (email) DO NOTHING;
