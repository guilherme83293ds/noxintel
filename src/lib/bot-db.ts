import pg from 'pg';
const { Pool } = pg;

const DB_URLS = [
  process.env.DATABASE_URL_1,
  process.env.DATABASE_URL_2,
  process.env.DATABASE_URL_3,
  process.env.DATABASE_URL_4,
].filter((u): u is string => Boolean(u));

const botPools = DB_URLS.map(url => new Pool({
  connectionString: url,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false },
}));

export function ensureBotIndexes() {}

async function queryPool(pool: pg.Pool, sql: string, params?: any[], timeoutMs?: number) {
  try {
    const opts: any = { text: sql, values: params };
    if (timeoutMs) opts.signal = AbortSignal.timeout(timeoutMs);
    return await pool.query(opts);
  } catch {
    return { rows: [] };
  }
}

export async function botQuery(sql: string, params?: any[], timeoutMs?: number, poolIndices?: number[]) {
  const pools = poolIndices ? poolIndices.map(i => botPools[i]) : botPools;
  const results = await Promise.allSettled(
    pools.map(pool => queryPool(pool, sql, params, timeoutMs))
  );
  const seen = new Set<string>();
  const merged = { rows: [] as any[] };
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.rows) {
      for (const row of result.value.rows) {
        const key = row.dedupe_hash || `${row.url || ""}|${row.email || ""}|${row.senha || ""}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.rows.push(row);
        }
      }
    }
  }
  return merged;
}

const consultaDbUrl = process.env.CONSULTA_DATABASE_URL || process.env.DATABASE_URL_1;
export const consultaPool = consultaDbUrl
  ? new Pool({
      connectionString: consultaDbUrl,
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    })
  : null;
