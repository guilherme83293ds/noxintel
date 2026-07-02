import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sig = request.headers.get("stripe-signature");
        const body = await request.text();
        const secret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!secret) {
          return new Response("STRIPE_WEBHOOK_SECRET not configured", { status: 500 });
        }

        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" as any });

        let event: any;
        try {
          if (sig) {
            event = await stripe.webhooks.constructEventAsync(body, sig, secret);
          } else {
            return new Response("Missing stripe-signature header", { status: 401 });
          }
        } catch (e: any) {
          return new Response(`Invalid signature: ${e.message}`, { status: 400 });
        }

        const { noxPool } = await import("@/lib/db");

        if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
          const session: any = event.data.object;
          const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
          if (pi) {
            await noxPool.query("UPDATE payments SET stripe_payment_intent_id = $1 WHERE pix_txid = $2", [pi, session.id]);
            await noxPool.query("UPDATE payments SET status = 'approved', approved_at = NOW() WHERE stripe_payment_intent_id = $1 AND status = 'pending'", [pi]);
            await noxPool.query(`
              INSERT INTO subscriptions (user_id, plan_id, status, started_at, expires_at)
              SELECT p.user_id, p.plan_id, 'active', NOW(), NOW() + INTERVAL '30 days'
              FROM payments p WHERE p.stripe_payment_intent_id = $1 AND p.status = 'approved'
              ON CONFLICT (user_id) DO UPDATE SET plan_id = EXCLUDED.plan_id, status = 'active', expires_at = NOW() + INTERVAL '30 days'
            `, [pi]);
          }
        }

        if (event.type === "payment_intent.succeeded") {
          const pi = event.data.object;
          await noxPool.query("UPDATE payments SET status = 'approved', approved_at = NOW() WHERE stripe_payment_intent_id = $1 AND status = 'pending'", [pi.id]);
          await noxPool.query(`
            INSERT INTO subscriptions (user_id, plan_id, status, started_at, expires_at)
            SELECT p.user_id, p.plan_id, 'active', NOW(), NOW() + INTERVAL '30 days'
            FROM payments p WHERE p.stripe_payment_intent_id = $1 AND p.status = 'approved'
            ON CONFLICT (user_id) DO UPDATE SET plan_id = EXCLUDED.plan_id, status = 'active', expires_at = NOW() + INTERVAL '30 days'
          `, [pi.id]);
        }

        return Response.json({ received: true });
      },
    },
  },
});
