import pg from 'pg';
const pool = new pg.Pool({connectionString:'postgresql://neondb_owner:npg_uwJ97VZOsdxk@ep-muddy-glitter-aqz2uwrd-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'});
try {
  const r = await pool.query('SELECT column_name,data_type FROM information_schema.columns WHERE table_name = $1', ['credentials']);
  console.log(JSON.stringify(r.rows, null, 2));
} catch(e) {
  console.log('error:', e.message);
}
await pool.end();
