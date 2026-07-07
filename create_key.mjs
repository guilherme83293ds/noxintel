import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2qlr5DCObefd@ep-jolly-mountain-aq5lkd3g-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false },
});
const rand = () => Math.random().toString(36).substring(2, 10).toUpperCase();
const key = 'NOX-MAX-' + rand() + '-' + rand();
const now = new Date();
const expiresAt = new Date(now.getTime() + 3650 * 86400000);
const value = JSON.stringify({
  key, plan_id: 'elite', plan_name: 'Elite', expires_at: expiresAt.toISOString(),
  created_at: now.toISOString(), active: true, user_id: null, redeemed_at: null,
});
await pool.query(
  "INSERT INTO plans (id, name, price_brl, daily_search_limit, monthly_result_limit, features, active, sort) VALUES ($1, $2, 0, 999999, 999999, '[]', true, 0) ON CONFLICT (id) DO UPDATE SET name = $2, daily_search_limit = 999999, monthly_result_limit = 999999",
  ['elite', 'Elite']
);
await pool.query(
  "INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = $3",
  ['license_key_v2:' + key, value, now.toISOString()]
);
console.log('CHAVE CRIADA: ' + key);
console.log('Plano: Elite (999999 buscas/dia)');
console.log('Expira: ' + expiresAt.toISOString());
await pool.end();
