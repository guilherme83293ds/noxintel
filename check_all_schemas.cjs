const { Pool } = require('pg');
const dbs = {
  DB1: 'postgresql://neondb_owner:npg_2qlr5DCObefd@ep-curly-bird-aq64u7xj-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  DB2: 'postgresql://neondb_owner:npg_MAXar3ojY7xf@ep-small-silence-adkbslem-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  DB3: 'postgresql://neondb_owner:npg_McGpuOwI86eC@ep-little-cherry-aih99xc5-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  DB4: 'postgresql://neondb_owner:npg_uwJ97VZOsdxk@ep-restless-water-aqmwaubm-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
};

(async () => {
  for (const [name, url] of Object.entries(dbs)) {
    const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
    try {
      const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'credentials'
      `);
      console.log(`${name} colunas:`, res.rows.map(r => r.column_name));
    } catch(e) {
      console.log(`${name} erro:`, e.message);
    }
    await pool.end();
  }
})();
