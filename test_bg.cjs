const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_uwJ97VZOsdxk@ep-restless-water-aqmwaubm.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const res = await pool.query(`
      SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname='pg_background_launch') AS bg,
             EXISTS(SELECT 1 FROM pg_extension WHERE extname='dblink') AS dblink
    `);
    console.log('Resultados:', res.rows[0]);
  } catch(e) {
    console.log('Erro:', e.message);
  }
  await pool.end();
})();
