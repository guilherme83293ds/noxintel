const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_uwJ97VZOsdxk@ep-restless-water-aqmwaubm-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();

(async () => {
  console.log('Monitorando build do idx_url no DB4 via console Neon...\n');
  while (true) {
    try {
      const pr = await pool.query(`
        SELECT phase, blocks_done, blocks_total
        FROM pg_stat_progress_create_index
        WHERE command = 'CREATE INDEX' LIMIT 1
      `);
      if (pr.rows.length) {
        const r = pr.rows[0];
        const pct = r.blocks_total > 0 ? (r.blocks_done / r.blocks_total * 100).toFixed(1) : '?';
        console.log(`[${((Date.now()-t0)/1000)|0}s] ${r.phase} ${pct}%`);
      } else {
        const done = await pool.query(`
          SELECT EXISTS(
            SELECT 1 FROM pg_class c
            JOIN pg_index i ON i.indexrelid = c.oid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = 'idx_url' AND n.nspname = 'public' AND i.indisvalid = true
          ) AS ok
        `);
        if (done.rows[0].ok) {
          console.log(`\n🎉 PRONTO! idx_url criado com sucesso no DB4!`);
          await pool.end();
          process.exit(0);
        } else {
          console.log(`[${((Date.now()-t0)/1000)|0}s] aguardando inicio...`);
        }
      }
    } catch(e) { console.log('Erro monitoramento:', e.message); }
    await sleep(10000);
  }
})();
