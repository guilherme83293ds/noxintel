import pg from 'pg';
const { Pool } = pg;

const PROFILE_DB_URLS = [
  process.env.DATABASE_URL_1,
  process.env.DATABASE_URL_2,
  process.env.DATABASE_URL_3,
  process.env.DATABASE_URL_4,
].filter((u): u is string => Boolean(u));

if (PROFILE_DB_URLS.length === 0) {
  throw new Error("Nenhuma DATABASE_URL (1-4) configurada");
}

function makePool(connectionString: string) {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    keepAlive: true,
    application_name: "noxintel",
    ssl: { rejectUnauthorized: false },
  });
}

// Um pool por banco (fan-out igual ao bot-db)
export const profilePools = PROFILE_DB_URLS.map(makePool);

// Pool principal (DATABASE_URL_1) usado para escrita/admin/licenças
export const noxPool = profilePools[0];

// Schema SQL inline para compatibilidade com Vercel serverless
const NOX_SCHEMA_SQL = `
-- NoxIntel main database schema for Neon DB 6

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  telegram_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower ON profiles (lower(email));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_brl NUMERIC(10,2) NOT NULL,
  daily_search_limit INT NOT NULL DEFAULT 999999,
  monthly_result_limit INT NOT NULL DEFAULT 999999,
  features JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  day DATE NOT NULL,
  searches INT NOT NULL DEFAULT 0,
  results INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, day)
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  plan_id TEXT NOT NULL REFERENCES plans(id),
  amount_brl NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pix_key TEXT NOT NULL,
  pix_txid TEXT NOT NULL,
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  pix_expires_at TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  proof_note TEXT,
  proof_url TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_search_usage_user ON search_usage(user_id, day);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
`;

let initialized = false;
let initPromise: Promise<void> | null = null;

async function initPool(pool: pg.Pool) {
  await pool.query(NOX_SCHEMA_SQL);
  await pool.query(`
    INSERT INTO plans (id, name, price_brl, daily_search_limit, monthly_result_limit, sort, features, active) VALUES
    ('economic', 'Economic', 5.45, 50, 300, 1, '[]'::jsonb, true),
    ('starter', 'Starter', 4.12, 15, 250, 2, '[]'::jsonb, true),
    ('premium', 'Premium', 8.20, 50, 500, 3, '[]'::jsonb, true),
    ('advanced', 'Advanced', 10.95, 100, 800, 4, '[]'::jsonb, true),
    ('vip', 'VIP', 13.70, 200, 1000, 5, '[]'::jsonb, true),
    ('ultra15', 'Ultra 15D', 19.20, 500, 5000, 6, '[]'::jsonb, true),
    ('ultra30', 'Ultra 30D', 29.90, 500, 5000, 7, '[]'::jsonb, true),
    ('elite15', 'Elite 15D', 45.00, 999999, 50000, 8, '[]'::jsonb, true),
    ('elite', 'Elite', 82.50, 999999, 50000, 9, '[]'::jsonb, true)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_brl = EXCLUDED.price_brl, daily_search_limit = EXCLUDED.daily_search_limit, monthly_result_limit = EXCLUDED.monthly_result_limit, sort = EXCLUDED.sort;
  `);
}

export async function ensureDb() {
  if (initialized) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await Promise.all(profilePools.map(initPool));
    initialized = true;
  })();
  return initPromise;
}
