const { Pool, Client } = require('pg');

const dbs = {
  DB1: 'postgresql://neondb_owner:npg_2qlr5DCObefd@ep-curly-bird-aq64u7xj-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  DB2: 'postgresql://neondb_owner:npg_MAXar3ojY7xf@ep-small-silence-adkbslem-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  DB3: 'postgresql://neondb_owner:npg_McGpuOwI86eC@ep-little-cherry-aih99xc5-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  DB4: 'postgresql://neondb_owner:npg_uwJ97VZOsdxk@ep-restless-water-aqmwaubm.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require',
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function enableKeepalive(client) {
  try {
    const stream = client.connection && client.connection.stream;
    if (stream && stream.setKeepAlive) {
      stream.setKeepAlive(true, 5000); 
      if (stream.socket && stream.socket.setKeepAlive) {
        stream.socket.setKeepAlive(true, 5000);
      }
    }
  } catch (e) {}
}

async function fixDb(name, connStr) {
  const main = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    query_timeout: 0,
    statement_timeout: 0,
  });

  let mainErr = null;
  main.on('error', (e) => { mainErr = e; });

  await main.connect();
  enableKeepalive(main);
  console.log(`\n[${name}] ✅ Conectado`);

  // Verifica validade
  const idxCheck = await main.query(`
    SELECT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_index i ON i.indexrelid = c.oid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'idx_url' AND n.nspname = 'public' AND i.indisvalid = true
    ) AS exists
  `);

  if (idxCheck.rows[0].exists) {
    console.log(`[${name}] ✅ idx_url já existe e está VÁLIDO. Pulando.`);
    await main.end();
    return;
  }

  console.log(`[${name}] ⚙️ Limpando possíveis resquícios de índice inválido...`);
  await main.query(`DROP INDEX IF EXISTS idx_url`);

  console.log(`[${name}] ⚙️ Iniciando build suave e seguro do idx_url...`);

  // Configuração segura e com baixo paralelismo (para não sofrer throttling por uso de CPU)
  try { await main.query(`SET maintenance_work_mem = '1GB'`); } catch (e) {}
  try { await main.query(`SET max_parallel_maintenance_workers = 2`); } catch (e) {}
  try { await main.query(`SET max_parallel_workers = 2`); } catch (e) {}
  try { await main.query(`SET statement_timeout = 0`); } catch (e) {}

  const t0 = Date.now();
  let done = false;
  let idxErr = null;

  const idxPromise = main.query('CREATE INDEX idx_url ON credentials(url)');
  idxPromise
    .then(() => { done = true; })
    .catch((e) => { idxErr = e; done = true; });

  const monPool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  monPool.on('error', () => {});

  while (!done) {
    await sleep(8000);

    if (mainErr) {
      idxErr = mainErr;
      done = true;
      break;
    }

    try {
      const mon = await monPool.connect();
      try {
        const pr = await mon.query(`
          SELECT phase, blocks_done, blocks_total, tuples_done, tuples_total
          FROM pg_stat_progress_create_index
          WHERE command='CREATE INDEX' LIMIT 1
        `);
        if (pr.rows.length) {
          const r = pr.rows[0];
          const pct = r.blocks_total > 0 ? (r.blocks_done / r.blocks_total * 100).toFixed(1) : '?';
          console.log(`[${name}] ${r.phase} ${pct}% (${((Date.now() - t0)/1000)|0}s)`);
        } else {
          console.log(`[${name}] Processando... (${((Date.now() - t0)/1000)|0}s)`);
        }
      } finally {
        mon.release();
      }
    } catch (pe) {}
  }

  await monPool.end();

  if (idxErr) {
    try { await main.end(); } catch(e){}
    throw idxErr;
  }

  console.log(`[${name}] ✅ idx_url criado com sucesso em ${((Date.now() - t0)/1000)|0}s!`);
  try { await main.end(); } catch(e){}
}

(async () => {
  console.log('=== Fix idx_url — Safe Resource Performance ===\n');
  for (const [name, url] of Object.entries(dbs)) {
    let retries = 3;
    while (retries >= 0) {
      try {
        await fixDb(name, url);
        break;
      } catch (e) {
        console.log(`[${name}] ❌ Erro: ${e.message}`);
        if (retries > 0) {
          console.log(`[${name}] ⚠️ Aguardando 15s para tentar novamente... (${retries} retries restantes)`);
          await sleep(15000);
          retries--;
        } else {
          console.log(`[${name}] 💀 Falhou definitivamente.`);
          process.exit(1);
        }
      }
    }
  }
  console.log('\n=== CONCLUÍDO COM SUCESSO EM TODOS OS BANCOS ===');
  process.exit(0);
})();
