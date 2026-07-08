import pg from 'pg';
const { Pool } = pg;

// Admin database pool using Neon PostgreSQL
const adminDbUrl = process.env.DATABASE_URL_1;

if (!adminDbUrl) {
  throw new Error('No admin database URL configured (DATABASE_URL_1)');
}

export const adminPool = new Pool({
  connectionString: adminDbUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 8000,
  query_timeout: 8000,
});

// Initialize admin tables
export async function initAdminTables() {
  const client = await adminPool.connect();
  try {
    // Create plans table
    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price_brl NUMERIC(10,2) NOT NULL,
        daily_search_limit INT NOT NULL,
        monthly_result_limit INT NOT NULL,
        features JSONB NOT NULL DEFAULT '[]'::jsonb,
        sort INT NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Create license_keys table
    await client.query(`
      CREATE TABLE IF NOT EXISTS license_keys (
        key TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL REFERENCES plans(id),
        plan_name TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        user_id UUID,
        redeemed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Create profiles table (for user listing)
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY,
        email TEXT,
        full_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Create app_settings table (for any additional settings)
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Seed default plans if empty
    const { rows } = await client.query('SELECT COUNT(*) FROM plans');
    if (parseInt(rows[0].count) === 0) {
      await client.query(`
        INSERT INTO plans (id, name, price_brl, daily_search_limit, monthly_result_limit, sort, features, active) VALUES
        ('economic', 'Economic', 0, 50, 300, 1, '[]'::jsonb, true),
        ('starter', 'Starter', 0, 15, 250, 2, '[]'::jsonb, true),
        ('premium', 'Premium', 0, 50, 500, 3, '[]'::jsonb, true),
        ('advanced', 'Advanced', 0, 100, 800, 4, '[]'::jsonb, true),
        ('vip', 'VIP', 0, 200, 1000, 5, '[]'::jsonb, true),
        ('ultra15', 'Ultra 15D', 0, 500, 5000, 6, '[]'::jsonb, true),
        ('ultra30', 'Ultra 30D', 0, 500, 5000, 7, '[]'::jsonb, true),
        ('elite15', 'Elite 15D', 0, 999999, 50000, 8, '[]'::jsonb, true),
        ('elite', 'Elite', 0, 999999, 50000, 9, '[]'::jsonb, true)
        ON CONFLICT (id) DO NOTHING;
      `);
    }
  } finally {
    client.release();
  }
}

// Helper to run queries
export async function adminQuery(sql: string, params?: any[]) {
  const client = await adminPool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}