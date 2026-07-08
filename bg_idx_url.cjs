const { Client, Pool } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_uwJ97VZOsdxk@ep-restless-water-aqmwaubm.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('=== Iniciando Build de Índice em Background (DB4) ===');

  const main = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  await main.connect();

  // 1. Limpa índices anteriores inválidos
  console.log('Limpando resquícios do idx_url antigo...');
  await main.query('DROP INDEX IF EXISTS idx_url');

  // 2. Dispara o CREATE INDEX de forma assíncrona.
  // Ajustamos o timeout do client para fechar logo após enviar o comando.
  console.log('Disparando comando CREATE INDEX no servidor Neon...');
  try {
    // Configura o timeout da query para 2 segundos e dispara o index.
    // O Postgres continuará executando na thread interna do Neon mesmo após desconectarmos.
    await main.query('SET statement_timeout = 2000');
    await main.query('CREATE INDEX idx_url ON credentials(url)');
  } catch (e) {
    if (e.message.includes('canceling statement due to statement timeout') || e.message.includes('timeout') || e.message.includes('terminated')) {
      console.log('✅ Comando enviado e conexão cortada propositalmente. O Neon está criando o índice em background!');
    } else {
      console.log('❌ Erro inesperado ao enviar:', e.message);
    }
  } finally {
    try { await main.end(); } catch (e) {}
  }

  // 3. Monitoramento em Loop Leve
  const monitorPool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    max: 1
  });

  console.log('\nMonitorando progresso no Neon (consulta leve a cada 15 segundos)...');
  const t0 = Date.now();
  let done = false;

  while (!done) {
    await sleep(15000);
    try {
      const mon = await monitorPool.connect();
      try {
        // Verifica se ainda está rodando o build do índice
        const pr = await mon.query(`
          SELECT phase, blocks_done, blocks_total, tuples_done, tuples_total
          FROM pg_stat_progress_create_index
          WHERE command = 'CREATE INDEX' LIMIT 1
        `);

        if (pr.rows.length) {
          const r = pr.rows[0];
          const pct = r.blocks_total > 0 ? (r.blocks_done / r.blocks_total * 100).toFixed(1) : '?';
          console.log(`[Progresso Neon]: ${r.phase} ${pct}% (${((Date.now() - t0)/1000)|0}s decorridos)`);
        } else {
          // Se não está listado no pg_stat_progress, pode ter terminado ou falhado.
          // Vamos consultar se o índice foi criado e está VÁLIDO.
          const checkValid = await mon.query(`
            SELECT EXISTS (
              SELECT 1 FROM pg_class c
              JOIN pg_index i ON i.indexrelid = c.oid
              JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE c.relname = 'idx_url' AND n.nspname = 'public' AND i.indisvalid = true
            ) AS exists
          `);

          if (checkValid.rows[0].exists) {
            console.log(`\n🎉 SUCESSO! O Neon concluiu a criação do idx_url com sucesso!`);
            done = true;
          } else {
            console.log(`[Aguardando iniciar...] (${((Date.now() - t0)/1000)|0}s)`);
          }
        }
      } finally {
        mon.release();
      }
    } catch (pe) {
      console.log(`[Monitor Link Error]: ${pe.message}`);
    }
  }

  await monitorPool.end();
  console.log('=== FIM ===');
  process.exit(0);
}

run();
