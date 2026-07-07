import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/bosspay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { event, transaction_id, external_id, status, amount } = body;

          if (event === "transaction.updated" && status === "approved" && external_id) {
            const { noxPool } = await import("@/lib/db");
            await noxPool.query(
              "UPDATE payments SET status = 'approved', approved_at = NOW() WHERE pix_txid = $1 AND status = 'pending'",
              [external_id]
            );
            const { rows } = await noxPool.query(
              "SELECT user_id, plan_id FROM payments WHERE pix_txid = $1 AND status = 'approved' LIMIT 1",
              [external_id]
            );
            if (rows.length > 0) {
              const { user_id, plan_id } = rows[0];
              const { rows: planRows } = await noxPool.query(
                "SELECT daily_search_limit, monthly_result_limit FROM plans WHERE id = $1",
                [plan_id]
              );
              const plan = planRows[0];
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + 30);
              await noxPool.query(
                `INSERT INTO subscriptions (user_id, plan_id, status, expires_at)
                 VALUES ($1, $2, 'active', $3)
                 ON CONFLICT (user_id) DO UPDATE SET plan_id = $2, status = 'active', expires_at = $3`,
                [user_id, plan_id, expiresAt.toISOString()]
              );
            }
          }

          return Response.json({ received: true });
        } catch {
          return Response.json({ received: true });
        }
      },
    },
  },
});
