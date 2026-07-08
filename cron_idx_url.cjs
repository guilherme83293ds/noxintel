const { Client, Pool } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_uwJ97VZOsdxk@ep-restless-water-aqmwaubm.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('=== Iniciando Criação de Índice Assíncrona no Neon (DB4) ===');

  const main = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  await main.connect();

  console.log('Limpando resquícios de tentativas anteriores...');
  await main.query('DROP INDEX IF EXISTS idx_url');

  // Habilita pg_cron se não estiver habilitado
  console.log('Habilitando pg_cron se necessário...');
  try {
    await main.query('CREATE EXTENSION IF NOT EXISTS pg_cron');
  } catch (e) {
    console.log('Aviso ao criar extensão (pode requerer privilégios de superuser):', e.message);
  }

  // Agendamos o CREATE INDEX para rodar imediatamente em background no Neon
  console.log('Agendando a criação do índice no cron interno do Neon...');
  let jobName = 'build_idx_url_' + Date.now();
  let jobCreated = false;
  try {
    // Roda uma vez em background e se remove
    await main.query(`
      SELECT cron.schedule_in_database(
        $1,
        '* * * * *',
        'CREATE INDEX idx_url ON credentials(url)',
        'neondb'
      )
    `, [jobName]);
    jobCreated = true;
    console.log(`✅ Agendado com sucesso no Neon (Job: ${jobName})!`);
  } catch (e) {
    console.log('Falha ao agendar no cron:', e.message);
  }

  // Caso o pg_cron não esteja disponível no seu plano Neon, usaremos o fallback de injeção assíncrona pura
  if (!jobCreated) {
    console.log('⚠️ pg_cron indisponível. Usando fallback de conexão persistente tunada...');
  }

  await main.end();

  // Monitoramento
  const monitorPool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    max: 1
  });

  const t0 = Date.now();
  let done = false;

  console.log('\nMonitorando progresso no Neon (queries curtas de verificação)...');
  while (!done) {
    await sleep(10000);
    try {
      const mon = await monitorPool.connect();
      try {
        // Verifica se o índice ficou pronto e válido
        const idxCheck = await mon.query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_index i ON i.indexrelid = c.oid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = 'idx_url' AND n.nspname = 'public' AND i.indisvalid = true
          ) AS exists
        `);

        if (idxCheck.rows[0].exists) {
          console.log(`\n🎉 SUCESSO! O índice idx_url foi construído e está VÁLIDO no DB4!`);
          done = true;
          
          // Limpa o cron se tiver sido criado
          if (jobCreated) {
            console.log('Limpando agendamento temporário do cron...');
            try {
              await mon.query("SELECT cron.unschedule($1)", [jobName]);
            } catch (ce) {}
          }
          break;
        }

        // Se ainda não estiver pronto, verifica o progresso ativo no Postgres
        const pr = await mon.query(`
          SELECT phase, blocks_done, blocks_total, tuples_done, tuples_total
          FROM pg_stat_progress_create_index
          WHERE command = 'CREATE INDEX' LIMIT 1
        `);

        if (pr.rows.length) {
          const r = pr.rows[0];
          const pct = r.blocks_total > 0 ? (r.blocks_done / r.blocks_total * 100).toFixed(1) : '?';
          console.log(`[DB4 Progresso]: ${r.phase} ${pct}% (${((Date.now() - t0)/1000)|0}s)`);
        } else {
          // Se não há progresso ativo e não está pronto, ou falhou ou ainda não disparou o cron
          if (jobCreated) {
            console.log(`[Aguardando disparo do cron no Neon...] (${((Date.now() - t0)/1000)|0}s)`);
          } else {
            // Se falhou o cron, executa o fallback direto de forma limpa
            console.log('Iniciando indexador em modo síncrono tunado...');
            const fallbackClient = new Client({
              connectionString: connStr,
              ssl: { rejectUnauthorized: false }
            });
            await fallbackClient.connect();
            try {
              await fallbackClient.query(`SET maintenance_work_mem = '2GB'`);
              await fallbackClient.query(`SET max_parallel_maintenance_workers = 4`);
              await fallbackClient.query(`CREATE INDEX idx_url ON credentials(url)`);
            } catch (fe) {
              console.log('Erro no fallback:', fe.message);
            } finally {
              await fallbackClient.end();
            }
          }
        }
      } finally {
        mon.release();
      }
    } catch (pe) {
      console.log(`Erro de conexão temporário no monitoramento (tentando novamente): ${pe.message}`);
    }
  }

  await monitorPool.end();
  process.exit(0);
}

run();
