const { Pool } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_uwJ97VZOsdxk@ep-restless-water-aqmwaubm-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('=== Iniciando Criação de Índice por Lotes (Chunks) — DB4 ===\n');

  let client;
  try {
    client = await pool.connect();
    
    // 1. Verificar se a tabela principal existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'credentials'
      ) AS exists
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('Tabela credentials não encontrada. Criando vazia com índice...');
      await client.query(`
        CREATE TABLE credentials (
          id BIGSERIAL PRIMARY KEY,
          url TEXT,
          username TEXT,
          password TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_url ON credentials(url)`);
      console.log('✅ DB4 finalizado (vazio).');
      client.release();
      process.exit(0);
    }

    // 2. Verificar se o índice idx_url já existe e está VÁLIDO na tabela atual
    const idxCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_index i ON i.indexrelid = c.oid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_url' AND n.nspname = 'public' AND i.indisvalid = true
      ) AS exists
    `);

    if (idxCheck.rows[0].exists) {
      console.log('✅ O índice idx_url já está VÁLIDO no DB4! Nenhuma ação necessária.');
      client.release();
      process.exit(0);
    }

    // 3. Obter ID mínimo e máximo da tabela atual para paginação
    console.log('Obtendo limites da tabela...');
    const limits = await client.query('SELECT MIN(numero) as min_id, MAX(numero) as max_id FROM credentials');
    const minId = BigInt(limits.rows[0].min_id || 0);
    const maxId = BigInt(limits.rows[0].max_id || 0);
    console.log(`Faixa de IDs (numero): ${minId} até ${maxId}`);

    if (maxId === 0n) {
      console.log('Tabela vazia. Criando índice diretamente...');
      await client.query('CREATE INDEX IF NOT EXISTS idx_url ON credentials(url)');
      console.log('✅ Concluído.');
      client.release();
      process.exit(0);
    }

    // 4. Criar a nova tabela temporária estruturada
    console.log('Criando tabela de transição...');
    await client.query('DROP TABLE IF EXISTS credentials_new CASCADE');
    await client.query(`
      CREATE TABLE credentials_new (
        numero BIGINT PRIMARY KEY,
        url TEXT,
        email TEXT,
        senha TEXT,
        fonte TEXT,
        dedupe_hash TEXT,
        telefone TEXT
      )
    `);

    // 5. Criar o índice idx_url na tabela nova (estando vazia é instantâneo)
    console.log('Criando índice idx_url na tabela de transição...');
    await client.query('CREATE INDEX idx_url_new ON credentials_new(url)');

    client.release();

    // 6. Migrar por lotes (Chunks de IDs)
    const chunkSize = 2500000n; // 2.5 milhões de registros por lote
    let currentId = minId;

    const t0 = Date.now();

    while (currentId <= maxId) {
      const nextId = currentId + chunkSize;
      let success = false;
      let retries = 5;

      while (!success && retries > 0) {
        let chunkClient;
        try {
          chunkClient = await pool.connect();
          await chunkClient.query('BEGIN');
          
          // Copia o lote
          await chunkClient.query(`
            INSERT INTO credentials_new (numero, url, email, senha, fonte, dedupe_hash, telefone)
            SELECT numero, url, email, senha, fonte, dedupe_hash, telefone 
            FROM credentials 
            WHERE numero >= $1 AND numero < $2
            ON CONFLICT (numero) DO NOTHING
          `, [currentId.toString(), nextId.toString()]);
          
          await chunkClient.query('COMMIT');
          success = true;
        } catch (err) {
          console.log(`⚠️ Falha no lote [${currentId} - ${nextId}]: ${err.message}. Retentando...`);
          if (chunkClient) {
            try { await chunkClient.query('ROLLBACK'); } catch(e){}
          }
          retries--;
          await sleep(5000);
        } finally {
          if (chunkClient) chunkClient.release();
        }
      }

      if (!success) {
        console.log('💀 Erro crítico: Falha persistente ao processar lotes.');
        process.exit(1);
      }

      const elapsed = ((Date.now() - t0) / 1000) | 0;
      const progress = ((Double(currentId - minId) / Double(maxId - minId)) * 100).toFixed(2);
      console.log(`Migrado lote até ID: ${nextId} | Progresso: ${progress}% | Tempo: ${elapsed}s`);

      currentId = nextId;
    }

    // 7. Renomear as tabelas
    console.log('\nTabelas migradas! Fazendo swap de nomes...');
    let swapClient = await pool.connect();
    try {
      await swapClient.query('BEGIN');
      await swapClient.query('ALTER TABLE credentials RENAME TO credentials_old');
      await swapClient.query('ALTER TABLE credentials_new RENAME TO credentials');
      await swapClient.query('ALTER INDEX idx_url_new RENAME TO idx_url');
      await swapClient.query('COMMIT');
      
      console.log('Removendo tabela antiga...');
      await swapClient.query('DROP TABLE IF EXISTS credentials_old CASCADE');
      console.log('✅ MIGRADO COM SUCESSO! O índice está ativo e pronto.');
    } catch (swapErr) {
      console.log('Erro ao aplicar swap de tabelas:', swapErr.message);
      try { await swapClient.query('ROLLBACK'); } catch(e){}
    } finally {
      swapClient.release();
    }

  } catch (e) {
    console.log('Erro geral:', e.message);
    if (client) client.release();
  } finally {
    await pool.end();
  }
}

// Helpers para divisão segura de BigInt em decimais de progresso
function Double(bigintVal) {
  return Number(bigintVal);
}

run();
