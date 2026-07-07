import pg from 'pg';
const { Pool } = pg;

const DB_URLS = [
  "postgresql://neondb_owner:npg_2qlr5DCObefd@ep-jolly-mountain-aq5lkd3g-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  "postgresql://neondb_owner:npg_uwJ97VZOsdxk@ep-muddy-glitter-aqz2uwrd-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  "postgresql://neondb_owner:npg_McGpuOwI86eC@ep-withered-sound-aidv3w3g-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  "postgresql://neondb_owner:npg_MAXar3ojY7xf@ep-tiny-band-ad5cksgf-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
];

const botPools = DB_URLS.map(url => new Pool({
  connectionString: url,
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false },
}));

export function ensureBotIndexes() {}

async function queryPool(pool: pg.Pool, sql: string, params?: any[]) {
  try {
    return await pool.query({ text: sql, values: params });
  } catch {
    return { rows: [] };
  }
}

export async function botQuery(sql: string, params?: any[]) {
  const results = await Promise.allSettled(
    botPools.map(pool => queryPool(pool, sql, params))
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

const consultaDbUrl = process.env.CONSULTA_DATABASE_URL;
export const consultaPool = consultaDbUrl
  ? new Pool({
      connectionString: consultaDbUrl,
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    })
  : null;
