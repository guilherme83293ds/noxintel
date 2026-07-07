import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2qlr5DCObefd@ep-jolly-mountain-aq5lkd3g-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false },
});
const { rows } = await pool.query("SELECT key, value FROM app_settings WHERE key LIKE 'license_key_v2:%' ORDER BY updated_at DESC LIMIT 5");
for (const r of rows) {
  const v = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
  console.log('Key:', v.key, '| Active:', v.active, '| User:', v.user_id || 'null');
}
await pool.end();
