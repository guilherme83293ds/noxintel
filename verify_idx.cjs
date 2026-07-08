const { Pool } = require('pg');
const dbs = {
  DB1: 'postgresql://neondb_owner:npg_2qlr5DCObefd@ep-curly-bird-aq64u7xj-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  DB2: 'postgresql://neondb_owner:npg_MAXar3ojY7xf@ep-small-silence-adkbslem-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  DB3: 'postgresql://neondb_owner:npg_McGpuOwI86eC@ep-little-cherry-aih99xc5-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  DB4: 'postgresql://neondb_owner:npg_uwJ97VZOsdxk@ep-restless-water-aqmwaubm-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
};
(async () => {
  for (const [name, url] of Object.entries(dbs)) {
    const p = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
    try {
      const r = await p.query(`
        SELECT indexname, indisvalid
        FROM pg_indexes
        JOIN pg_class c ON c.relname = pg_indexes.indexname
        JOIN pg_index i ON i.indexrelid = c.oid
        WHERE pg_indexes.tablename = 'credentials' AND pg_indexes.indexname = 'idx_url'
      `);
      if (r.rows.length > 0) {
        console.log(`${name}: ✅ idx_url existe — válido: ${r.rows[0].indisvalid}`);
      } else {
        console.log(`${name}: ❌ idx_url NÃO existe`);
      }
    } catch(e) { console.log(`${name}: ERRO: ${e.message}`); }
    await p.end();
  }
})();
