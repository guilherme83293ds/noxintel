import pg from 'pg';
const { Pool } = pg;

export class MultiPool {
  pools: pg.Pool[];

  constructor(poolsArray: pg.Pool[]) {
    this.pools = poolsArray;
  }

  async query(sql: string, params?: any[]) {
    const results = await Promise.allSettled(
      this.pools.map(p =>
        p.query(sql, params).catch((e: any) => {
          if (e.code !== '57014') {
            console.warn('MultiPool DB Error:', e.message);
          }
          return { rows: [] };
        })
      )
    );
    let allRows: any[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value && r.value.rows) {
        allRows = allRows.concat(r.value.rows);
      }
    }
    return { rows: allRows, rowCount: allRows.length };
  }
}

const dbUrls = [
  process.env.DATABASE_URL_1,
  process.env.DATABASE_URL_2,
  process.env.DATABASE_URL_3,
  process.env.DATABASE_URL_4,
  process.env.DATABASE_URL_5
].filter(Boolean) as string[];

if (dbUrls.length === 0 && process.env.DATABASE_URL) {
  dbUrls.push(process.env.DATABASE_URL);
}

const pools = dbUrls.map(url => {
  return new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    keepAlive: true,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 8000,
    query_timeout: 8000,
  });
});

export const botMultiPool = new MultiPool(pools);

const consultaDbUrl = process.env.CONSULTA_DATABASE_URL;
export const consultaPool = consultaDbUrl
  ? new Pool({
      connectionString: consultaDbUrl,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
      statement_timeout: 10000,
      query_timeout: 10000,
    })
  : null;
