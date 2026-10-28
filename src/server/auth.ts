import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import type { Role, SessionUser } from "../shared/types.js";
import { many, one, uid } from "./db.js";

const COOKIE = "gim_session";
const SESSION_DAYS = 30;

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      sessionId?: string;
    }
  }
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  current_level: string;
  preferred_language: string;
  learning_goal: string | null;
  daily_goal_minutes: number;
  streak_days: number;
  account_status: "active" | "suspended";
  preferences: unknown;
  onboarding_completed: boolean;
  created_at: string;
};

function parseJson(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export async function sessionUserForToken(token: string): Promise<SessionUser | null> {
  const session = await one<{ user_id: string; expires_at: string }>(
    "SELECT user_id, expires_at FROM sessions WHERE id=$1",
    [token],
  );
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await many("DELETE FROM sessions WHERE id=$1", [token]);
    return null;
  }
  const profile = await one<ProfileRow>("SELECT * FROM profiles WHERE id=$1", [session.user_id]);
  if (!profile) return null;
  const roleRows = await many<{ role: Role }>("SELECT role FROM user_roles WHERE user_id=$1", [session.user_id]);
  return {
    id: session.user_id,
    email: profile.email,
    full_name: profile.full_name,
    phone: profile.phone,
    roles: roleRows.map((row) => row.role),
    profile: {
      ...profile,
      preferences: parseJson(profile.preferences),
    },
  };
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await many("INSERT INTO sessions(id,user_id,expires_at) VALUES($1,$2,$3)", [token, userId, expires.toISOString()]);
  await many("DELETE FROM sessions WHERE expires_at < now()");
  return token;
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    maxAge: SESSION_DAYS * 86_400_000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE, { path: "/" });
}

export function readSessionToken(req: Request) {
  return (req.cookies as Record<string, string> | undefined)?.[COOKIE] ?? null;
}

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = readSessionToken(req);
    if (token) {
      const user = await sessionUserForToken(token);
      if (user) {
        req.user = user;
        req.sessionId = token;
      }
    }
  } catch (error) {
    console.error("[auth] session lookup failed", error);
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Sign in to continue" });
    return;
  }
  if (req.user.profile.account_status !== "active") {
    res.status(403).json({ error: "This account is suspended. Contact support." });
    return;
  }
  next();
}

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Sign in to continue" });
    return;
  }
  if (req.user.roles.length === 0) {
    res.status(403).json({ error: "Administrator access is required" });
    return;
  }
  if (req.user.profile.account_status !== "active") {
    res.status(403).json({ error: "This account is suspended. Contact support." });
    return;
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Sign in to continue" });
    return;
  }
  if (!req.user.roles.includes("super_admin")) {
    res.status(403).json({ error: "Only a super administrator can do this" });
    return;
  }
  next();
}

export function isStaff(user: SessionUser | undefined) {
  return Boolean(user && user.roles.length > 0);
}

export async function recordAudit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
) {
  await many(
    "INSERT INTO audit_logs(id,actor_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5,$6::jsonb)",
    [uid("aud"), actorId, action, entityType, entityId, JSON.stringify(details)],
  );
}

export async function recordLogin(userId: string, email: string, userAgent: string | null) {
  await many("INSERT INTO login_events(id,user_id,email,user_agent) VALUES($1,$2,$3,$4)", [
    uid("lgn"),
    userId,
    email,
    userAgent?.slice(0, 180) ?? null,
  ]);
}

export function isSameOrigin(req: Request) {
  const origin = req.get("origin");
  if (!origin) return true;
  const host = req.get("host");
  if (!host) return false;
  try {
    const originUrl = new URL(origin);
    if (originUrl.host === host) return true;
    if (originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1") return true;
    const appUrl = process.env.APP_URL;
    if (appUrl) return new URL(appUrl).origin === originUrl.origin;
    return false;
  } catch {
    return false;
  }
}
