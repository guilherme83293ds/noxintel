import pg from 'pg';
const pool = new pg.Pool({connectionString:'postgresql://neondb_owner:npg_uwJ97VZOsdxk@ep-muddy-glitter-aqz2uwrd-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'});
try {
  const r = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log('Tables:', JSON.stringify(r.rows.map(x => x.table_name)));
} catch(e) {
  console.log('error:', e.message);
}
await pool.end();
