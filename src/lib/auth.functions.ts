import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { createUser, authenticateUser, signToken, getUserById } from "./auth";
import { requireAuth } from "./auth-middleware";
import { noxPool, ensureDb } from "./db";

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
  });
  const json = await res.json();
  return json.success === true;
}

export const doSignup = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string; fullName?: string }) => d)
  .handler(async ({ data }) => {
    await ensureDb();
    const user = await createUser(data.email, data.password, data.fullName);
    const token = signToken({ userId: user.id, email: user.email });
    setResponseHeader("Set-Cookie", `nox_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
    return { token, user: { id: user.id, email: user.email, full_name: user.full_name } };
  });

export const doLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    await ensureDb();
    const user = await authenticateUser(data.email, data.password);
    if (!user) throw new Error("Credenciais inválidas");
    const token = signToken({ userId: user.id, email: user.email });
    setResponseHeader("Set-Cookie", `nox_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
    return { token, user: { id: user.id, email: user.email, full_name: user.full_name } };
  });

export const doGetMe = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }: any) => {
    return { id: context.userId, email: context.email, profile: context.profile };
  });

export const doListAllUsers = createServerFn({ method: "POST" })
  .inputValidator((d: { adminKey: string }) => d)
  .handler(async ({ data }) => {
    if (!process.env.ADMIN_SECRET_KEY) throw new Error("ADMIN_SECRET_KEY não configurada");
    if (data.adminKey !== process.env.ADMIN_SECRET_KEY) throw new Error("Chave de admin inválida");
    await ensureDb();
    const { rows } = await noxPool.query("SELECT id, email, full_name, telegram_id, created_at FROM profiles ORDER BY created_at DESC");
    return rows;
  });
