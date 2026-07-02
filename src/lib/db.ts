import pg from 'pg';
const { Pool } = pg;

const url = process.env.DATABASE_URL_6;
if (!url) throw new Error("DATABASE_URL_6 não configurada");

export const noxPool = new Pool({
  connectionString: url,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false },
});

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

export async function ensureDb() {
  if (initialized) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await noxPool.query(NOX_SCHEMA_SQL);
    initialized = true;
  })();
  return initPromise;
}
