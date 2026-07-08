const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_uwJ97VZOsdxk@ep-restless-water-aqmwaubm.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const res = await pool.query(`
      SELECT pid, query, state, age(clock_timestamp(), query_start) AS elapsed 
      FROM pg_stat_activity 
      WHERE (query ILIKE '%CREATE INDEX%' OR query ILIKE '%idx_url%') AND pid <> pg_backend_pid()
    `);
    console.log('Queries ativas de índice:', res.rows);
  } catch(e) {
    console.log('Erro:', e.message);
  }
  await pool.end();
})();
