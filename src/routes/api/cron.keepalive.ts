import { json } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

async function pingDb(pool: any): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      return true;
    } finally {
      client.release();
    }
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/cron/keepalive")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization") || "";
        const expected = process.env.ADMIN_SECRET_KEY;
        if (expected && auth !== `Bearer ${expected}`) {
          return json({ ok: false, error: "Unauthorized" }, 401);
        }

        const results: Record<string, boolean> = {};
        try {
          const { profilePools } = await import("@/lib/db");
          for (let i = 0; i < profilePools.length; i++) {
            results[`db_${i + 1}`] = await pingDb(profilePools[i]);
          }
        } catch (e) {
          console.error("Keepalive error:", e);
        }

        const allOk = Object.values(results).every(Boolean);
        return json({ ok: allOk, results, ts: Date.now() });
      },
    },
  },
});
