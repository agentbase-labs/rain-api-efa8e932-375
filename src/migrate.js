"use strict";
const { query } = require("./db");

async function runMigrations() {
  console.log("🔄 Running database migrations...");

  // Markets table
  await query(`
    CREATE TABLE IF NOT EXISTS markets (
      id SERIAL PRIMARY KEY,
      market_id VARCHAR(255) UNIQUE NOT NULL,
      workflow_id VARCHAR(255),
      question TEXT NOT NULL DEFAULT '',
      options JSONB NOT NULL DEFAULT '[]',
      tags JSONB NOT NULL DEFAULT '[]',
      market_type VARCHAR(100),
      country VARCHAR(100),
      liquidity_usdt NUMERIC(18, 6) DEFAULT 0,
      duration_days INTEGER DEFAULT 30,
      contract_address VARCHAR(255),
      transaction_hash VARCHAR(255),
      image_url VARCHAR(500),
      description TEXT DEFAULT '',
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Users table (wallet-based)
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(255) UNIQUE NOT NULL,
      workflow_id VARCHAR(255),
      display_name VARCHAR(255),
      avatar_url VARCHAR(500),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Positions table
  await query(`
    CREATE TABLE IF NOT EXISTS positions (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(255) NOT NULL,
      market_id VARCHAR(255) NOT NULL,
      option_index INTEGER NOT NULL,
      option_name VARCHAR(255),
      amount_usdt NUMERIC(18, 6) DEFAULT 0,
      transaction_hash VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(wallet_address, market_id, option_index)
    )
  `);

  // Updated-at trigger function
  await query(`
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS \$\$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    \$\$ LANGUAGE plpgsql
  `);

  await query(`
    DROP TRIGGER IF EXISTS markets_updated_at ON markets
  `);
  await query(`
    CREATE TRIGGER markets_updated_at
    BEFORE UPDATE ON markets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at()
  `);

  // Indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_markets_workflow_id ON markets(workflow_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_positions_wallet ON positions(wallet_address)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_positions_market ON positions(market_id)`);

  console.log("✅ Migrations complete");
}

module.exports = { runMigrations };
