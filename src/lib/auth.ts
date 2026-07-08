import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { noxPool, profilePools, ensureDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch {
    return null;
  }
}

export async function createUser(email: string, password: string, fullName?: string) {
  await ensureDb();
  const passwordHash = await hashPassword(password);
  const { rows } = await noxPool.query(
    `INSERT INTO profiles (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, created_at`,
    [email.toLowerCase(), passwordHash, fullName || null]
  );
  return rows[0];
}

export async function authenticateUser(email: string, password: string) {
  await ensureDb();
  const results = await Promise.allSettled(
    profilePools.map((pool) =>
      pool.query(
        `SELECT id, email, password_hash, full_name FROM profiles WHERE lower(email) = lower($1)`,
        [email]
      )
    )
  );
  let user: any = null;
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.rows.length > 0) {
      user = r.value.rows[0];
      break;
    }
  }
  if (!user) return null;
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return null;
  return { id: user.id, email: user.email, full_name: user.full_name };
}

export async function getUserById(id: string) {
  await ensureDb();
  const results = await Promise.allSettled(
    profilePools.map((pool) =>
      pool.query(`SELECT id, email, full_name, created_at FROM profiles WHERE id = $1`, [id])
    )
  );
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.rows.length > 0) {
      return r.value.rows[0];
    }
  }
  return null;
}
