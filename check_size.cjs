const { Pool } = require('pg');
const dbs = {
  DB1: 'postgresql://neondb_owner:npg_2qlr5DCObefd@ep-curly-bird-aq64u7xj-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  DB2: 'postgresql://neondb_owner:npg_MAXar3ojY7xf@ep-red-band-adpxqg2r-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  DB3: 'postgresql://neondb_owner:npg_McGpuOwI86eC@ep-calm-unit-ai9c5j34-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  DB4: 'postgresql://neondb_owner:npg_uwJ97VZOsdxk@ep-rough-voice-aqw2284y-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
};

(async () => {
  for (const [name, url] of Object.entries(dbs)) {
    const p = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
    try {
      const r = await p.query(`
        SELECT
          pg_size_pretty(pg_database_size(current_database())) AS db_size,
          pg_size_pretty(pg_total_relation_size('credentials')) AS table_size,
          (SELECT reltuples::bigint FROM pg_class WHERE relname='credentials') AS rows_est
      `);
      const row = r.rows[0];
      console.log(`${name} | DB: ${row.db_size} | Tabela credentials: ${row.table_size} | ~${Number(row.rows_est).toLocaleString()} linhas`);
    } catch(e) {
      console.log(`${name} ERRO: ${e.message}`);
    }
    await p.end();
  }
})();
