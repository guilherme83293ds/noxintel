import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireAuth } from "./auth-middleware";
import { noxPool, ensureDb } from "./db";

function checkAdminKey(key: string) {
  if (!process.env.ADMIN_SECRET_KEY) throw new Error("ADMIN_SECRET_KEY não configurada no servidor");
  if (key !== process.env.ADMIN_SECRET_KEY) throw new Error("Chave de admin inválida");
}

export const listPlans = createServerFn({ method: "GET" }).handler(async () => {
  await ensureDb();
  const { rows } = await noxPool.query("SELECT * FROM plans ORDER BY sort");
  return rows;
});

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }: any) => {
    await ensureDb();
    const uid = context.userId;
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    const monthStart = today.slice(0, 7) + "-01";

    const [subRes, usageRes, rolesRes, profileRes] = await Promise.all([
      noxPool.query("SELECT s.*, row_to_json(p.*) as plans FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.user_id = $1 AND s.status = 'active' AND s.expires_at > now() ORDER BY s.expires_at DESC LIMIT 1", [uid]),
      noxPool.query("SELECT * FROM search_usage WHERE user_id = $1 ORDER BY day DESC LIMIT 31", [uid]),
      noxPool.query("SELECT role FROM user_roles WHERE user_id = $1", [uid]),
      noxPool.query("SELECT * FROM profiles WHERE id = $1", [uid]),
    ]);

    const sub = subRes.rows[0] || null;
    const usage = usageRes.rows || [];
    const isAdmin = rolesRes.rows.some((r: any) => r.role === "admin");
    const profile = profileRes.rows[0] || null;

    const fmt = (d: any) => {
      const date = typeof d === "object" && d instanceof Date ? d : new Date(String(d).slice(0, 10));
      return date.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    };
    const todayRow = usage.find((u: any) => fmt(u.day) === today);
    const monthUsage = usage.filter((u: any) => fmt(u.day) >= monthStart);
    const monthResults = monthUsage.reduce((a: number, u: any) => a + Number(u.results || 0), 0);
    const monthSearches = monthUsage.reduce((a: number, u: any) => a + Number(u.searches || 0), 0);
    const usageChronological = [...usage].reverse();

    return {
      profile,
      subscription: sub,
      isAdmin,
      today: { searches: todayRow?.searches || 0, results: todayRow?.results || 0 },
      monthResults,
      monthSearches,
      sparklineSearches: usageChronological.map((u: any) => u.searches || 0),
      sparklineResults: usageChronological.map((u: any) => u.results || 0),
    };
  });

export const listMyPayments = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }: any) => {
    await ensureDb();
    const { rows } = await noxPool.query(
      "SELECT p.*, pl.name as plan_name FROM payments p LEFT JOIN plans pl ON pl.id = p.plan_id WHERE p.user_id = $1 ORDER BY p.created_at DESC",
      [context.userId]
    );
    return rows;
  });

let bosspayToken: { token: string; expiresAt: number } | null = null;

async function getBosspayToken() {
  const clientId = process.env.BOSSPAY_CLIENT_ID;
  const clientSecret = process.env.BOSSPAY_CLIENT_SECRET;
  const apiBase = process.env.BOSSPAY_API_BASE || "https://ojawuuxiahtattnpndai.supabase.co/functions/v1/api-gateway";
  if (!clientId || !clientSecret) return null;
  if (bosspayToken && Date.now() < bosspayToken.expiresAt) return bosspayToken.token;
  const basic = btoa(`${clientId}:${clientSecret}`);
  const r = await fetch(`${apiBase}/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) return null;
  const d = await r.json();
  bosspayToken = { token: d.access_token, expiresAt: Date.now() + (d.expires_in - 60) * 1000 };
  return d.access_token;
}

export const createPixPayment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { planId: string }) => d)
  .handler(async ({ data, context }: any) => {
    await ensureDb();
    const { rows: planRows } = await noxPool.query("SELECT * FROM plans WHERE id = $1 AND active = true", [data.planId]);
    if (!planRows.length) throw new Error("Plano não encontrado");
    const plan = planRows[0];

    if (!process.env.BOSSPAY_CLIENT_ID || !process.env.BOSSPAY_CLIENT_SECRET) {
      throw new Error("BossPay não configurado — adicione BOSSPAY_CLIENT_ID e BOSSPAY_CLIENT_SECRET nas variáveis de ambiente");
    }

    const apiBase = process.env.BOSSPAY_API_BASE || "https://ojawuuxiahtattnpndai.supabase.co/functions/v1/api-gateway";
    const origin = getRequestHeader("origin") || process.env.SITE_URL || "http://localhost:8080";
    const externalId = `nox_${context.userId}_${Date.now()}`;
    const postbackUrl = origin.includes("localhost")
      ? (process.env.SITE_URL || "https://noxintel.app") + "/api/public/bosspay-webhook"
      : `${origin}/api/public/bosspay-webhook`;

    const token = await getBosspayToken();
    if (!token) throw new Error("BossPay: falha ao obter token de autenticação");

    const pixRes = await fetch(`${apiBase}/pix`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(plan.price_brl), external_id: externalId, postback_url: postbackUrl }),
      signal: AbortSignal.timeout(15000),
    });
    if (!pixRes.ok) {
      const errText = await pixRes.text().catch(() => "");
      throw new Error(`BossPay: erro ao criar PIX (${pixRes.status})${errText ? ` — ${errText}` : ""}`);
    }

    const pix = await pixRes.json();
    const { rows: paymentRows } = await noxPool.query(
      `INSERT INTO payments (user_id, plan_id, amount_brl, pix_key, pix_txid, pix_qr_code, pix_copy_paste, pix_expires_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *`,
      [context.userId, plan.id, plan.price_brl, pix.transaction_id || "bosspay", externalId, pix.qr_code || null, pix.qr_code_base64 || null, null]
    );
    return paymentRows[0];
  });

export const checkPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { paymentId: string }) => d)
  .handler(async ({ data, context }: any) => {
    await ensureDb();
    const { rows } = await noxPool.query("SELECT * FROM payments WHERE id = $1 AND user_id = $2", [data.paymentId, context.userId]);
    const p = rows[0];
    if (!p) throw new Error("not_found");
    if (p.status === "paid" || p.status === "approved") return { status: "paid" };

    const token = await getBosspayToken();
    if (!token) return { status: p.status };

    const apiBase = process.env.BOSSPAY_API_BASE || "https://ojawuuxiahtattnpndai.supabase.co/functions/v1/api-gateway";
    try {
      const statusRes = await fetch(`${apiBase}/status?external_id=${encodeURIComponent(p.pix_txid)}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      });
      if (statusRes.ok) {
        const st = await statusRes.json();
        if (st.status === "approved") {
          await noxPool.query("UPDATE payments SET status = 'paid' WHERE id = $1", [p.id]);
          const { rows: planRows } = await noxPool.query("SELECT * FROM plans WHERE id = $1", [p.plan_id]);
          if (planRows.length > 0) {
            const plan = planRows[0];
            const expiresAt = new Date();
            if (plan.period_days) expiresAt.setDate(expiresAt.getDate() + Number(plan.period_days));
            else expiresAt.setDate(expiresAt.getDate() + 30);
            await noxPool.query(
              `INSERT INTO subscriptions (user_id, plan_id, status, expires_at)
               VALUES ($1, $2, 'active', $3)
               ON CONFLICT (user_id) DO UPDATE SET plan_id = $2, status = 'active', expires_at = $3`,
              [p.user_id, p.plan_id, expiresAt.toISOString()]
            );
          }
          return { status: "paid" };
        }
        return { status: p.status, providerStatus: st.status };
      }
    } catch {}
    return { status: p.status };
  });

export const submitPaymentProof = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { paymentId: string; note: string }) => d)
  .handler(async ({ data, context }: any) => {
    await ensureDb();
    await noxPool.query("UPDATE payments SET proof_note = $1 WHERE id = $2 AND user_id = $3", [data.note, data.paymentId, context.userId]);
    return { ok: true };
  });

export const listAllPayments = createServerFn({ method: "POST" })
  .inputValidator((d: { adminKey: string }) => d)
  .handler(async ({ data }) => {
    checkAdminKey(data.adminKey);
    await ensureDb();
    const { rows } = await noxPool.query(
      "SELECT p.*, row_to_json(pl.*) as plans, row_to_json(pr.*) as profiles FROM payments p LEFT JOIN plans pl ON pl.id = p.plan_id LEFT JOIN profiles pr ON pr.id = p.user_id ORDER BY p.created_at DESC LIMIT 200"
    );
    return rows;
  });

export const adminApprovePayment = createServerFn({ method: "POST" })
  .inputValidator((d: { paymentId: string; adminKey: string }) => d)
  .handler(async ({ data }) => {
    checkAdminKey(data.adminKey);
    await ensureDb();
    const { rows } = await noxPool.query(
      `UPDATE payments SET status = 'paid' WHERE id = $1 AND status = 'pending' RETURNING user_id, plan_id`,
      [data.paymentId]
    );
    if (rows.length > 0) {
      const { user_id, plan_id } = rows[0];
      const { rows: planRows } = await noxPool.query("SELECT * FROM plans WHERE id = $1", [plan_id]);
      if (planRows.length > 0) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await noxPool.query(
          `INSERT INTO subscriptions (user_id, plan_id, status, expires_at) VALUES ($1, $2, 'active', $3)`,
          [user_id, plan_id, expiresAt.toISOString()]
        );
      }
    }
    return { ok: true };
  });

export const adminRejectPayment = createServerFn({ method: "POST" })
  .inputValidator((d: { paymentId: string; reason?: string; adminKey: string }) => d)
  .handler(async ({ data }) => {
    checkAdminKey(data.adminKey);
    await ensureDb();
    await noxPool.query("UPDATE payments SET status = 'rejected', reviewed_at = now(), proof_note = $1 WHERE id = $2", [data.reason || null, data.paymentId]);
    return { ok: true };
  });

export const getPixSettings = createServerFn({ method: "POST" })
  .inputValidator((d: { adminKey: string }) => d)
  .handler(async ({ data }) => {
    checkAdminKey(data.adminKey);
    await ensureDb();
    const { rows } = await noxPool.query("SELECT key, value FROM app_settings WHERE key IN ('pix_key','pix_receiver_name','pix_city')");
    const map: Record<string, string> = {};
    rows.forEach((r: any) => (map[r.key] = r.value));
    return {
      pix_key: map.pix_key || "",
      pix_receiver_name: map.pix_receiver_name || "NoxIntel",
      pix_city: map.pix_city || "SAO PAULO",
    };
  });

export const adminUpdatePixSettings = createServerFn({ method: "POST" })
  .inputValidator((d: { pix_key: string; pix_receiver_name: string; pix_city: string; adminKey: string }) => d)
  .handler(async ({ data }) => {
    checkAdminKey(data.adminKey);
    await ensureDb();
    const now = new Date().toISOString();
    for (const [k, v] of Object.entries({ pix_key: data.pix_key, pix_receiver_name: data.pix_receiver_name, pix_city: data.pix_city })) {
      await noxPool.query(
        `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = $3`,
        [k, v, now]
      );
    }
    return { ok: true };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }: any) => {
    await ensureDb();
    const { rows } = await noxPool.query("SELECT COUNT(*) FROM user_roles WHERE role = 'admin'");
    if (Number(rows[0].count) > 0) throw new Error("Já existe um admin");
    await noxPool.query("INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin') ON CONFLICT DO NOTHING", [context.userId]);
    return { ok: true };
  });

export const redeemLicenseKey = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { key: string }) => d)
  .handler(async ({ data, context }: any) => {
    await ensureDb();
    const { rows: lkRows } = await noxPool.query(
      "SELECT value FROM app_settings WHERE key = $1",
      ["license_key_v2:" + data.key.trim()]
    );
    if (!lkRows.length) throw new Error("Chave inválida");
    const lk = lkRows[0].value;
    if (!lk.active) throw new Error("Chave já resgatada ou inativa");
    if (lk.user_id) throw new Error("Chave já resgatada");

    // Find existing active subscription
    const { rows: subRows } = await noxPool.query(
      "SELECT expires_at FROM subscriptions WHERE user_id = $1 AND status = 'active' AND expires_at > now() ORDER BY expires_at DESC LIMIT 1",
      [context.userId]
    );
    let baseDate = new Date();
    if (subRows.length > 0) baseDate = new Date(subRows[0].expires_at);
    const newExpires = new Date(baseDate.getTime() + (new Date(lk.expires_at).getTime() - new Date(lk.created_at).getTime()));

    await noxPool.query(
      "INSERT INTO subscriptions (user_id, plan_id, status, expires_at) VALUES ($1, $2, 'active', $3)",
      [context.userId, lk.plan_id, newExpires.toISOString()]
    );

    lk.active = false;
    lk.user_id = context.userId;
    lk.redeemed_at = new Date().toISOString();
    await noxPool.query(
      "UPDATE app_settings SET value = $1, updated_at = now() WHERE key = $2",
      [JSON.stringify(lk), "license_key_v2:" + data.key.trim()]
    );

    return { ok: true, plan_id: lk.plan_id, expires_at: newExpires.toISOString() };
  });

const PLAN_META: Record<string, { name: string; daily: number; monthly: number }> = {
  economic:  { name: "Economic",  daily: 50,   monthly: 300 },
  starter:   { name: "Starter",   daily: 15,   monthly: 250 },
  premium:   { name: "Premium",   daily: 50,   monthly: 500 },
  advanced:  { name: "Advanced",  daily: 100,  monthly: 800 },
  vip:       { name: "VIP",       daily: 200,  monthly: 1000 },
  ultra15:   { name: "Ultra 15D", daily: 500,  monthly: 5000 },
  ultra30:   { name: "Ultra 30D", daily: 500,  monthly: 5000 },
  elite15:   { name: "Elite 15D", daily: 999999, monthly: 50000 },
  elite:     { name: "Elite",     daily: 999999, monthly: 50000 },
};

export const createLicenseKey = createServerFn({ method: "POST" })
  .inputValidator((d: { adminKey: string; planId: string; durationDays: number }) => d)
  .handler(async ({ data }) => {
    checkAdminKey(data.adminKey);
    await ensureDb();
    const meta = PLAN_META[data.planId];
    if (!meta) throw new Error("Plano não encontrado");

    // Seed plan into DB so consume_search can find it
    await noxPool.query(
      `INSERT INTO plans (id, name, price_brl, daily_search_limit, monthly_result_limit, features, active, sort)
       VALUES ($1, $2, 0, $3, $4, '[]', true, 0)
       ON CONFLICT (id) DO UPDATE SET name = $2, daily_search_limit = $3, monthly_result_limit = $4`,
      [data.planId, meta.name, meta.daily, meta.monthly]
    );

    const rand = () => Math.random().toString(36).substring(2, 10).toUpperCase();
    const key = `NOX-${rand()}-${rand()}`;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + data.durationDays * 86400000);

    const value = JSON.stringify({
      key,
      plan_id: data.planId,
      plan_name: meta.name,
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
      active: true,
      user_id: null,
      redeemed_at: null,
    });

    await noxPool.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = $3`,
      ["license_key_v2:" + key, value, now.toISOString()]
    );

    return JSON.parse(value);
  });

export const listLicenseKeys = createServerFn({ method: "POST" })
  .inputValidator((d: { adminKey: string }) => d)
  .handler(async ({ data }) => {
    checkAdminKey(data.adminKey);
    await ensureDb();
    const { rows } = await noxPool.query(
      "SELECT value FROM app_settings WHERE key LIKE 'license_key_v2:%' ORDER BY updated_at DESC"
    );
    return rows.map((r: any) => r.value);
  });

export const verifyAdminKey = createServerFn({ method: "POST" })
  .inputValidator((d: { key: string }) => d)
  .handler(async ({ data }) => {
    const envKey = process.env.ADMIN_SECRET_KEY;
    if (!envKey) return { ok: false, error: "ADMIN_SECRET_KEY não configurada no servidor" };
    return { ok: data.key === envKey };
  });

export const listAllUsers = createServerFn({ method: "POST" })
  .inputValidator((d: { adminKey: string }) => d)
  .handler(async ({ data }) => {
    checkAdminKey(data.adminKey);
    await ensureDb();
    const { rows } = await noxPool.query("SELECT id, email, full_name, created_at FROM profiles ORDER BY created_at DESC");
    return rows;
  });
