import { Router } from "express";
import { z } from "zod";
import { many, one, uid } from "../db.js";
import {
  clearSessionCookie,
  createSession,
  hashPassword,
  recordLogin,
  requireAuth,
  sessionUserForToken,
  setSessionCookie,
  verifyPassword,
} from "../auth.js";
import { HttpError, handler } from "../service.js";

export const authRouter = Router();

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");
const passwordSchema = z.string().min(8, "Use at least 8 characters").max(128);
const levels = ["A1", "A2", "B1", "B2", "C1"] as const;

authRouter.post(
  "/register",
  handler(async (req, res) => {
    const input = z
      .object({
        fullName: z.string().trim().min(2, "Enter your full name").max(80),
        email: emailSchema,
        password: passwordSchema,
        level: z.enum(levels).optional(),
        learningGoal: z.string().trim().max(160).optional(),
        dailyGoalMinutes: z.number().int().min(5).max(120).optional(),
      })
      .parse(req.body);

    const existing = await one("SELECT id FROM users WHERE email=$1", [input.email]);
    if (existing) throw new HttpError(409, "An account with this email already exists");

    const userId = uid("usr");
    await many("INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)", [
      userId,
      input.email,
      await hashPassword(input.password),
    ]);
    await many(
      `INSERT INTO profiles(id,email,full_name,current_level,learning_goal,daily_goal_minutes,onboarding_completed)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [userId, input.email, input.fullName, input.level ?? "A1", input.learningGoal ?? null, input.dailyGoalMinutes ?? 15, false],
    );
    const token = await createSession(userId);
    setSessionCookie(res, token);
    await recordLogin(userId, input.email, req.get("user-agent") ?? null);
    const user = await sessionUserForToken(token);
    res.status(201).json({ user });
  }),
);

authRouter.post(
  "/login",
  handler(async (req, res) => {
    const input = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password") }).parse(req.body);
    const account = await one<{ id: string; password_hash: string; account_status: string }>(
      `SELECT u.id, u.password_hash, p.account_status
       FROM users u JOIN profiles p ON p.id = u.id WHERE u.email=$1`,
      [input.email],
    );
    if (!account || !(await verifyPassword(input.password, account.password_hash))) {
      throw new HttpError(401, "Email or password is incorrect");
    }
    if (account.account_status !== "active") {
      throw new HttpError(403, "This account is suspended. Contact support.");
    }
    await many("DELETE FROM sessions WHERE user_id=$1 AND expires_at < now()", [account.id]);
    const token = await createSession(account.id);
    setSessionCookie(res, token);
    await recordLogin(account.id, input.email, req.get("user-agent") ?? null);
    res.json({ user: await sessionUserForToken(token) });
  }),
);

authRouter.post(
  "/logout",
  handler(async (req, res) => {
    const token = req.cookies?.gim_session as string | undefined;
    if (token) await many("DELETE FROM sessions WHERE id=$1", [token]);
    clearSessionCookie(res);
    res.json({ ok: true });
  }),
);

authRouter.get(
  "/me",
  handler(async (req, res) => {
    res.json({ user: req.user ?? null });
  }),
);

authRouter.patch(
  "/profile",
  requireAuth,
  handler(async (req, res) => {
    const input = z
      .object({
        fullName: z.string().trim().min(2).max(80).optional(),
        phone: z.string().trim().max(40).nullable().optional(),
        level: z.enum(levels).optional(),
        preferredLanguage: z.string().trim().max(40).optional(),
        timezone: z.string().trim().max(80).optional(),
        learningGoal: z.string().trim().max(160).nullable().optional(),
        dailyGoalMinutes: z.number().int().min(5).max(180).optional(),
        onboardingCompleted: z.boolean().optional(),
      })
      .parse(req.body);
    const userId = req.user!.id;
    await many(
      `UPDATE profiles SET
         full_name=COALESCE($2,full_name),
         phone=$3,
         current_level=COALESCE($4,current_level),
         preferred_language=COALESCE($5,preferred_language),
         timezone=COALESCE($6,timezone),
         learning_goal=$7,
         daily_goal_minutes=COALESCE($8,daily_goal_minutes),
         onboarding_completed=COALESCE($9,onboarding_completed),
         updated_at=now()
       WHERE id=$1`,
      [
        userId,
        input.fullName ?? null,
        input.phone === undefined ? req.user!.profile.phone : input.phone,
        input.level ?? null,
        input.preferredLanguage ?? null,
        input.timezone ?? null,
        input.learningGoal === undefined ? req.user!.profile.learning_goal : input.learningGoal,
        input.dailyGoalMinutes ?? null,
        input.onboardingCompleted ?? null,
      ],
    );
    const user = await sessionUserForToken(req.sessionId!);
    res.json({ user });
  }),
);

authRouter.post(
  "/password",
  requireAuth,
  handler(async (req, res) => {
    const input = z
      .object({ currentPassword: z.string().min(1), newPassword: passwordSchema })
      .parse(req.body);
    const account = await one<{ password_hash: string }>("SELECT password_hash FROM users WHERE id=$1", [req.user!.id]);
    if (!account || !(await verifyPassword(input.currentPassword, account.password_hash))) {
      throw new HttpError(400, "Current password is incorrect");
    }
    await many("UPDATE users SET password_hash=$1 WHERE id=$2", [await hashPassword(input.newPassword), req.user!.id]);
    await many("DELETE FROM sessions WHERE user_id=$1 AND id<>$2", [req.user!.id, req.sessionId]);
    res.json({ ok: true });
  }),
);

authRouter.post(
  "/forgot",
  handler(async (req, res) => {
    const input = z.object({ email: emailSchema }).parse(req.body);
    const account = await one<{ id: string }>("SELECT id FROM users WHERE email=$1", [input.email]);
    let resetToken: string | undefined;
    if (account) {
      const token = uid("rst");
      await many("INSERT INTO password_resets(id,user_id,expires_at) VALUES($1,$2,$3)", [
        token,
        account.id,
        new Date(Date.now() + 3_600_000).toISOString(),
      ]);
      // No transactional email provider is configured in this local build, so the
      // token is surfaced in development to keep the reset flow usable end to end.
      if (process.env.NODE_ENV !== "production") resetToken = token;
    }
    res.json({ ok: true, resetToken });
  }),
);

authRouter.post(
  "/reset",
  handler(async (req, res) => {
    const input = z.object({ token: z.string().min(5), password: passwordSchema }).parse(req.body);
    const record = await one<{ user_id: string; expires_at: string; used_at: string | null }>(
      "SELECT user_id, expires_at, used_at FROM password_resets WHERE id=$1",
      [input.token],
    );
    if (!record || record.used_at || new Date(record.expires_at).getTime() < Date.now()) {
      throw new HttpError(400, "This reset link has expired. Request a new one.");
    }
    await many("UPDATE users SET password_hash=$1 WHERE id=$2", [await hashPassword(input.password), record.user_id]);
    await many("UPDATE password_resets SET used_at=now() WHERE id=$1", [input.token]);
    await many("DELETE FROM sessions WHERE user_id=$1", [record.user_id]);
    res.json({ ok: true });
  }),
);
