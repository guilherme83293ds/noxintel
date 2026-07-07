import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2qlr5DCObefd@ep-jolly-mountain-aq5lkd3g-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false },
});
const { rows } = await pool.query("SELECT key, value FROM app_settings WHERE key = $1", ['license_key_v2:NOX-MAX-43LYISVK-8JJM0FBM']);
if (rows.length) {
  const v = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
  console.log(JSON.stringify(v, null, 2));
} else {
  console.log('Key not found in DB');
}
await pool.end();
