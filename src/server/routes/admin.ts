import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { recordAudit, requireStaff, requireSuperAdmin } from "../auth.js";
import { many, one, uid, type Row } from "../db.js";
import {
  HttpError,
  courseSelect,
  handler,
  mapCourse,
  monthKey,
  parseJson,
  toNumber,
} from "../service.js";
import { siteContentSchema, SITE_CONTENT_KEY } from "../../shared/site-content.js";
import type { Certificate, ContentStatus, Profile, Role } from "../../shared/types.js";

export const adminRouter = Router();
adminRouter.use(requireStaff);

const ROLE_VALUES = [
  "super_admin",
  "content_admin",
  "instructor",
  "exam_admin",
  "support_admin",
  "finance_admin",
  "marketing_admin",
] as const;

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

function mapProfile(row: Row): Profile {
  return {
    id: String(row.id),
    email: String(row.email),
    full_name: String(row.full_name ?? ""),
    phone: (row.phone as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    current_level: String(row.current_level ?? "A1"),
    preferred_language: String(row.preferred_language ?? "English"),
    learning_goal: (row.learning_goal as string | null) ?? null,
    daily_goal_minutes: toNumber(row.daily_goal_minutes, 15),
    streak_days: toNumber(row.streak_days),
    account_status: (row.account_status as Profile["account_status"]) ?? "active",
    preferences: parseJson<Record<string, unknown>>(row.preferences, {}),
    onboarding_completed: Boolean(row.onboarding_completed),
    created_at: String(row.created_at),
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[äöüß]/g, (char) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" })[char] ?? char)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

async function uniqueSlug(base: string, ignoreId?: string) {
  const root = slugify(base) || "course";
  let candidate = root;
  for (let i = 2; i < 100; i++) {
    const existing = await one<{ id: string }>("SELECT id FROM courses WHERE slug=$1", [candidate]);
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${crypto.randomUUID().slice(0, 6)}`;
}

adminRouter.get(
  "/overview",
  handler(async (_req, res) => {
    const [students, newToday, new7, courses, published, revenue, pending] = await Promise.all([
      one<{ n: number }>("SELECT count(*)::int AS n FROM profiles"),
      one<{ n: number }>("SELECT count(*)::int AS n FROM profiles WHERE created_at >= date_trunc('day', now())"),
      one<{ n: number }>("SELECT count(*)::int AS n FROM profiles WHERE created_at >= now() - interval '7 days'"),
      one<{ n: number }>("SELECT count(*)::int AS n FROM courses"),
      one<{ n: number }>("SELECT count(*)::int AS n FROM courses WHERE status='published'"),
      one<{ n: number }>("SELECT coalesce(sum(amount),0)::float8 AS n FROM orders WHERE status='paid'"),
      one<{ n: number }>("SELECT count(*)::int AS n FROM orders WHERE status='pending'"),
    ]);
    const levelRows = await many<{ current_level: string; n: number }>(
      "SELECT current_level, count(*)::int AS n FROM profiles GROUP BY current_level",
    );
    const studentsByLevel = LEVELS.map((level) => ({
      name: level,
      v: toNumber(levelRows.find((row) => row.current_level === level)?.n),
    }));
    const signupRows = await many<{ created_at: string }>(
      "SELECT created_at FROM profiles WHERE created_at >= now() - interval '6 days'",
    );
    const signupSeries: { name: string; v: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      signupSeries.push({
        name: day.toLocaleDateString("en-US", { weekday: "short" }),
        v: signupRows.filter((row) => {
          const at = new Date(row.created_at).getTime();
          return at >= day.getTime() && at < next.getTime();
        }).length,
      });
    }
    const orderRows = await many<{ amount: number; created_at: string }>(
      "SELECT amount::float8 AS amount, created_at FROM orders WHERE status='paid' AND created_at >= now() - interval '6 months'",
    );
    const revenueSeries: { name: string; v: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setDate(1);
      month.setHours(0, 0, 0, 0);
      month.setMonth(month.getMonth() - i);
      const next = new Date(month);
      next.setMonth(next.getMonth() + 1);
      revenueSeries.push({
        name: monthKey(month),
        v: Math.round(
          orderRows
            .filter((row) => {
              const at = new Date(row.created_at).getTime();
              return at >= month.getTime() && at < next.getTime();
            })
            .reduce((total, row) => total + toNumber(row.amount), 0),
        ),
      });
    }
    const recentStudentRows = await many<Row>("SELECT * FROM profiles ORDER BY created_at DESC LIMIT 5");
    const recentOrderRows = await many<Row>(
      `SELECT o.*, p.full_name AS student_name, p.email AS student_email, c.title AS course_title
       FROM orders o JOIN profiles p ON p.id=o.user_id LEFT JOIN courses c ON c.id=o.course_id
       ORDER BY o.created_at DESC LIMIT 6`,
    );
    const recentLogins = await many<Row>(
      "SELECT id, email, user_agent, created_at FROM login_events ORDER BY created_at DESC LIMIT 8",
    );
    const activity = await many<Row>(
      "SELECT id, action, entity_type, entity_id, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 8",
    );
    res.json({
      totals: {
        students: toNumber(students?.n),
        newToday: toNumber(newToday?.n),
        new7: toNumber(new7?.n),
        courses: toNumber(courses?.n),
        publishedCourses: toNumber(published?.n),
        revenue: toNumber(revenue?.n),
        pendingOrders: toNumber(pending?.n),
      },
      studentBuckets: studentsByLevel,
      new7: signupSeries,
      revenue: revenueSeries,
      recentStudents: recentStudentRows.map(mapProfile),
      recentOrders: recentOrderRows.map((row) => ({
        id: String(row.id),
        user_id: String(row.user_id),
        course_id: (row.course_id as string | null) ?? null,
        amount: toNumber(row.amount),
        currency: String(row.currency),
        status: row.status as "paid",
        provider: (row.provider as string | null) ?? null,
        provider_reference: (row.provider_reference as string | null) ?? null,
        created_at: String(row.created_at),
        course_title: (row.course_title as string | null) ?? null,
        student_name: String(row.student_name ?? ""),
        student_email: String(row.student_email ?? ""),
      })),
      recentLogins: recentLogins.map((row) => ({
        id: String(row.id),
        email: (row.email as string | null) ?? null,
        user_agent: (row.user_agent as string | null) ?? null,
        created_at: String(row.created_at),
      })),
      activity: activity.map((row) => ({
        id: String(row.id),
        action: String(row.action),
        entity_type: String(row.entity_type),
        created_at: String(row.created_at),
      })),
    });
  }),
);

// ---------------------------------------------------------------- courses

adminRouter.get(
  "/courses",
  handler(async (_req, res) => {
    const rows = await many<Row>(`${courseSelect} ORDER BY c.created_at DESC`);
    res.json({ courses: rows.map(mapCourse) });
  }),
);

adminRouter.post(
  "/courses",
  handler(async (req, res) => {
    const input = z
      .object({
        title: z.string().trim().min(3).max(140),
        slug: z.string().trim().optional(),
        level: z.enum(LEVELS),
        description: z.string().trim().max(2000).optional(),
        coverUrl: z.string().trim().max(500).nullable().optional(),
        priceEur: z.number().min(0).max(10000),
        estimatedWeeks: z.number().int().min(1).max(52).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        featured: z.boolean().optional(),
      })
      .parse(req.body);
    const id = uid("crs");
    const slug = await uniqueSlug(input.slug || input.title);
    await many(
      `INSERT INTO courses(id,slug,title,level,description,cover_url,price_eur,status,estimated_weeks,featured)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        id,
        slug,
        input.title,
        input.level,
        input.description ?? "",
        input.coverUrl ?? null,
        input.priceEur,
        input.status ?? "draft",
        input.estimatedWeeks ?? 8,
        input.featured ?? false,
      ],
    );
    await recordAudit(req.user!.id, "course.created", "course", id, { title: input.title });
    const row = await one<Row>(`${courseSelect} WHERE c.id=$1`, [id]);
    res.status(201).json({ course: row ? mapCourse(row) : null });
  }),
);

async function adminCourseDetail(courseId: string) {
  const courseRow = await one<Row>(`${courseSelect} WHERE c.id=$1`, [courseId]);
  if (!courseRow) throw new HttpError(404, "Course not found");
  const moduleRows = await many<Row>("SELECT * FROM course_modules WHERE course_id=$1 ORDER BY position", [courseId]);
  const lessonRows = await many<Row>(
    `SELECT l.* FROM lessons l JOIN course_modules m ON m.id=l.module_id
     WHERE m.course_id=$1 ORDER BY m.position, l.position`,
    [courseId],
  );
  const quizRows = await many<Row>(
    `SELECT q.* FROM quizzes q JOIN lessons l ON l.id=q.lesson_id
     JOIN course_modules m ON m.id=l.module_id WHERE m.course_id=$1`,
    [courseId],
  );
  return {
    course: {
      ...mapCourse(courseRow),
      modules: moduleRows.map((module) => ({
        id: module.id,
        course_id: module.course_id,
        title: module.title,
        description: module.description,
        position: toNumber(module.position),
        status: module.status as ContentStatus,
        lessons: lessonRows
          .filter((lesson) => lesson.module_id === module.id)
          .map((lesson) => {
            const quiz = quizRows.find((row) => row.lesson_id === lesson.id);
            return {
              id: lesson.id,
              module_id: lesson.module_id,
              title: lesson.title,
              summary: lesson.summary,
              kind: lesson.kind,
              position: toNumber(lesson.position),
              duration_minutes: toNumber(lesson.duration_minutes),
              media_url: lesson.media_url,
              download_url: lesson.download_url,
              body: parseJson(lesson.body, {}),
              status: lesson.status as ContentStatus,
              quiz: quiz ? { id: quiz.id, title: quiz.title, status: quiz.status } : null,
            };
          }),
      })),
    },
  };
}

adminRouter.get(
  "/courses/:id",
  handler(async (req, res) => {
    res.json(await adminCourseDetail(req.params.id));
  }),
);

adminRouter.patch(
  "/courses/:id",
  handler(async (req, res) => {
    const input = z
      .object({
        title: z.string().trim().min(3).max(140).optional(),
        slug: z.string().trim().optional(),
        level: z.enum(LEVELS).optional(),
        description: z.string().trim().max(2000).optional(),
        coverUrl: z.string().trim().max(500).nullable().optional(),
        priceEur: z.number().min(0).max(10000).optional(),
        estimatedWeeks: z.number().int().min(1).max(52).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        featured: z.boolean().optional(),
      })
      .parse(req.body);
    const existing = await one<Row>("SELECT * FROM courses WHERE id=$1", [req.params.id]);
    if (!existing) throw new HttpError(404, "Course not found");
    const slug =
      input.slug && slugify(input.slug) !== existing.slug
        ? await uniqueSlug(input.slug, req.params.id)
        : String(existing.slug);
    await many(
      `UPDATE courses SET title=$1, slug=$2, level=$3, description=$4, cover_url=$5, price_eur=$6,
         estimated_weeks=$7, status=$8, featured=$9, updated_at=now() WHERE id=$10`,
      [
        input.title ?? existing.title,
        slug,
        input.level ?? existing.level,
        input.description ?? existing.description,
        input.coverUrl === undefined ? existing.cover_url : input.coverUrl,
        input.priceEur ?? existing.price_eur,
        input.estimatedWeeks ?? existing.estimated_weeks,
        input.status ?? existing.status,
        input.featured ?? existing.featured,
        req.params.id,
      ],
    );
    await recordAudit(req.user!.id, "course.updated", "course", req.params.id, input as Record<string, unknown>);
    const row = await one<Row>(`${courseSelect} WHERE c.id=$1`, [req.params.id]);
    res.json({ course: row ? mapCourse(row) : null });
  }),
);

adminRouter.delete(
  "/courses/:id",
  handler(async (req, res) => {
    const existing = await one<{ title: string }>("SELECT title FROM courses WHERE id=$1", [req.params.id]);
    if (!existing) throw new HttpError(404, "Course not found");
    await many("DELETE FROM courses WHERE id=$1", [req.params.id]);
    await recordAudit(req.user!.id, "course.deleted", "course", req.params.id, { title: existing.title });
    res.json({ ok: true });
  }),
);

adminRouter.post(
  "/courses/:id/modules",
  handler(async (req, res) => {
    const input = z
      .object({
        title: z.string().trim().min(2).max(140),
        description: z.string().trim().max(2000).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        position: z.number().int().min(1).optional(),
      })
      .parse(req.body);
    const course = await one("SELECT id FROM courses WHERE id=$1", [req.params.id]);
    if (!course) throw new HttpError(404, "Course not found");
    const max = await one<{ p: number }>("SELECT coalesce(max(position),0)::int AS p FROM course_modules WHERE course_id=$1", [
      req.params.id,
    ]);
    const id = uid("mod");
    await many(
      "INSERT INTO course_modules(id,course_id,title,description,position,status) VALUES($1,$2,$3,$4,$5,$6)",
      [id, req.params.id, input.title, input.description ?? "", input.position ?? toNumber(max?.p) + 1, input.status ?? "draft"],
    );
    await recordAudit(req.user!.id, "module.created", "module", id, { courseId: req.params.id, title: input.title });
    res.status(201).json({ module: { id, title: input.title } });
  }),
);

adminRouter.patch(
  "/modules/:id",
  handler(async (req, res) => {
    const input = z
      .object({
        title: z.string().trim().min(2).max(140).optional(),
        description: z.string().trim().max(2000).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        position: z.number().int().min(1).optional(),
      })
      .parse(req.body);
    const existing = await one<Row>("SELECT * FROM course_modules WHERE id=$1", [req.params.id]);
    if (!existing) throw new HttpError(404, "Module not found");
    await many(
      "UPDATE course_modules SET title=$1, description=$2, status=$3, position=$4, updated_at=now() WHERE id=$5",
      [
        input.title ?? existing.title,
        input.description ?? existing.description,
        input.status ?? existing.status,
        input.position ?? existing.position,
        req.params.id,
      ],
    );
    await recordAudit(req.user!.id, "module.updated", "module", req.params.id, input as Record<string, unknown>);
    res.json({ ok: true });
  }),
);

adminRouter.delete(
  "/modules/:id",
  handler(async (req, res) => {
    await many("DELETE FROM course_modules WHERE id=$1", [req.params.id]);
    await recordAudit(req.user!.id, "module.deleted", "module", req.params.id);
    res.json({ ok: true });
  }),
);

adminRouter.post(
  "/modules/:id/lessons",
  handler(async (req, res) => {
    const input = z
      .object({
        title: z.string().trim().min(2).max(160),
        summary: z.string().trim().max(600).optional(),
        kind: z.string().trim().max(40).optional(),
        durationMinutes: z.number().int().min(1).max(600).optional(),
        mediaUrl: z.string().trim().max(500).nullable().optional(),
        downloadUrl: z.string().trim().max(500).nullable().optional(),
        body: z.record(z.string(), z.unknown()).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
      })
      .parse(req.body);
    const module = await one<{ id: string; course_id: string }>("SELECT id, course_id FROM course_modules WHERE id=$1", [
      req.params.id,
    ]);
    if (!module) throw new HttpError(404, "Module not found");
    const max = await one<{ p: number }>("SELECT coalesce(max(position),0)::int AS p FROM lessons WHERE module_id=$1", [
      req.params.id,
    ]);
    const id = uid("les");
    await many(
      `INSERT INTO lessons(id,module_id,title,summary,kind,position,duration_minutes,media_url,download_url,body,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)`,
      [
        id,
        req.params.id,
        input.title,
        input.summary ?? "",
        input.kind ?? "video",
        toNumber(max?.p) + 1,
        input.durationMinutes ?? 10,
        input.mediaUrl ?? null,
        input.downloadUrl ?? null,
        JSON.stringify(input.body ?? {}),
        input.status ?? "draft",
      ],
    );
    await recordAudit(req.user!.id, "lesson.created", "lesson", id, { moduleId: req.params.id, title: input.title });
    res.status(201).json({ lesson: { id, title: input.title } });
  }),
);

adminRouter.patch(
  "/lessons/:id",
  handler(async (req, res) => {
    const input = z
      .object({
        title: z.string().trim().min(2).max(160).optional(),
        summary: z.string().trim().max(600).optional(),
        kind: z.string().trim().max(40).optional(),
        durationMinutes: z.number().int().min(1).max(600).optional(),
        mediaUrl: z.string().trim().max(500).nullable().optional(),
        downloadUrl: z.string().trim().max(500).nullable().optional(),
        body: z.record(z.string(), z.unknown()).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
      })
      .parse(req.body);
    const existing = await one<Row>("SELECT * FROM lessons WHERE id=$1", [req.params.id]);
    if (!existing) throw new HttpError(404, "Lesson not found");
    await many(
      `UPDATE lessons SET title=$1, summary=$2, kind=$3, duration_minutes=$4, media_url=$5, download_url=$6,
         body=$7::jsonb, status=$8, updated_at=now() WHERE id=$9`,
      [
        input.title ?? existing.title,
        input.summary ?? existing.summary,
        input.kind ?? existing.kind,
        input.durationMinutes ?? existing.duration_minutes,
        input.mediaUrl === undefined ? existing.media_url : input.mediaUrl,
        input.downloadUrl === undefined ? existing.download_url : input.downloadUrl,
        JSON.stringify(input.body ?? parseJson(existing.body, {})),
        input.status ?? existing.status,
        req.params.id,
      ],
    );
    await recordAudit(req.user!.id, "lesson.updated", "lesson", req.params.id, input as Record<string, unknown>);
    res.json({ ok: true });
  }),
);

adminRouter.delete(
  "/lessons/:id",
  handler(async (req, res) => {
    await many("DELETE FROM lessons WHERE id=$1", [req.params.id]);
    await recordAudit(req.user!.id, "lesson.deleted", "lesson", req.params.id);
    res.json({ ok: true });
  }),
);

adminRouter.get(
  "/lessons/:id/quiz",
  handler(async (req, res) => {
    const quiz = await one<Row>("SELECT * FROM quizzes WHERE lesson_id=$1", [req.params.id]);
    if (!quiz) {
      res.json({ quiz: null });
      return;
    }
    const questions = await many<Row>("SELECT * FROM quiz_questions WHERE quiz_id=$1 ORDER BY position", [quiz.id]);
    const options = await many<Row>(
      `SELECT o.* FROM quiz_options o JOIN quiz_questions q ON q.id=o.question_id WHERE q.quiz_id=$1 ORDER BY o.position`,
      [quiz.id],
    );
    res.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        passing_score: toNumber(quiz.passing_score, 70),
        time_limit_minutes: quiz.time_limit_minutes ? toNumber(quiz.time_limit_minutes) : null,
        attempts_allowed: toNumber(quiz.attempts_allowed, 3),
        status: quiz.status,
        questions: questions.map((question) => ({
          id: question.id,
          prompt: question.prompt,
          points: toNumber(question.points, 1),
          options: options
            .filter((option) => option.question_id === question.id)
            .map((option) => ({ id: option.id, label: option.label, is_correct: Boolean(option.is_correct) })),
        })),
      },
    });
  }),
);

const quizInput = z.object({
  title: z.string().trim().min(3).max(160),
  passingScore: z.number().int().min(1).max(100).optional(),
  timeLimitMinutes: z.number().int().min(1).max(180).nullable().optional(),
  attemptsAllowed: z.number().int().min(1).max(20).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  questions: z
    .array(
      z.object({
        prompt: z.string().trim().min(3).max(600),
        points: z.number().int().min(1).max(20).optional(),
        options: z
          .array(z.object({ label: z.string().trim().min(1).max(300), isCorrect: z.boolean() }))
          .min(2, "Each question needs at least two options")
          .max(8),
      }),
    )
    .min(1, "Add at least one question"),
});

adminRouter.put(
  "/lessons/:id/quiz",
  handler(async (req, res) => {
    const input = quizInput.parse(req.body);
    const lesson = await one<{ id: string; title: string }>("SELECT id, title FROM lessons WHERE id=$1", [req.params.id]);
    if (!lesson) throw new HttpError(404, "Lesson not found");
    for (const question of input.questions) {
      if (!question.options.some((option) => option.isCorrect)) {
        throw new HttpError(400, "Every question needs one correct answer");
      }
    }
    const existing = await one<{ id: string }>("SELECT id FROM quizzes WHERE lesson_id=$1", [req.params.id]);
    const quizId = existing?.id ?? uid("qiz");
    if (existing) {
      await many(
        `UPDATE quizzes SET title=$1, passing_score=$2, time_limit_minutes=$3, attempts_allowed=$4, status=$5 WHERE id=$6`,
        [
          input.title,
          input.passingScore ?? 70,
          input.timeLimitMinutes ?? null,
          input.attemptsAllowed ?? 3,
          input.status ?? "published",
          quizId,
        ],
      );
      await many("DELETE FROM quiz_questions WHERE quiz_id=$1", [quizId]);
    } else {
      await many(
        `INSERT INTO quizzes(id,lesson_id,title,passing_score,time_limit_minutes,attempts_allowed,status)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [
          quizId,
          req.params.id,
          input.title,
          input.passingScore ?? 70,
          input.timeLimitMinutes ?? null,
          input.attemptsAllowed ?? 3,
          input.status ?? "published",
        ],
      );
    }
    for (let q = 0; q < input.questions.length; q++) {
      const question = input.questions[q]!;
      const questionId = uid("qq");
      await many("INSERT INTO quiz_questions(id,quiz_id,prompt,position,points) VALUES($1,$2,$3,$4,$5)", [
        questionId,
        quizId,
        question.prompt,
        q + 1,
        question.points ?? 1,
      ]);
      for (let o = 0; o < question.options.length; o++) {
        const option = question.options[o]!;
        await many("INSERT INTO quiz_options(id,question_id,label,is_correct,position) VALUES($1,$2,$3,$4,$5)", [
          uid("qo"),
          questionId,
          option.label,
          option.isCorrect,
          o + 1,
        ]);
      }
    }
    await recordAudit(req.user!.id, "quiz.saved", "quiz", quizId, { lessonId: req.params.id });
    res.json({ quizId });
  }),
);

adminRouter.delete(
  "/lessons/:id/quiz",
  handler(async (req, res) => {
    await many("DELETE FROM quizzes WHERE lesson_id=$1", [req.params.id]);
    await recordAudit(req.user!.id, "quiz.deleted", "lesson", req.params.id);
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------- students

adminRouter.get(
  "/students",
  handler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const level = typeof req.query.level === "string" ? req.query.level.trim().toUpperCase() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const rows = await many<Row>(
      `SELECT p.*,
        (SELECT string_agg(r.role, ',') FROM user_roles r WHERE r.user_id=p.id) AS roles,
        (SELECT count(*)::int FROM enrollments e WHERE e.user_id=p.id) AS enrollment_count,
        (SELECT coalesce(sum(o.amount),0)::float8 FROM orders o WHERE o.user_id=p.id AND o.status='paid') AS spend
       FROM profiles p
       WHERE ($1='' OR p.full_name ILIKE '%' || $1 || '%' OR p.email ILIKE '%' || $1 || '%')
         AND ($2='' OR p.current_level=$2)
         AND ($3='' OR p.account_status=$3)
       ORDER BY p.created_at DESC`,
      [q, level, status],
    );
    res.json({
      students: rows.map((row) => ({
        ...mapProfile(row),
        roles: row.roles ? String(row.roles).split(",") : [],
        enrollment_count: toNumber(row.enrollment_count),
        spend: toNumber(row.spend),
      })),
    });
  }),
);

adminRouter.get(
  "/students/:id",
  handler(async (req, res) => {
    const row = await one<Row>("SELECT * FROM profiles WHERE id=$1", [req.params.id]);
    if (!row) throw new HttpError(404, "Student not found");
    const [roles, enrollments, orders, certificates, tickets, logins] = await Promise.all([
      many<{ role: Role }>("SELECT role FROM user_roles WHERE user_id=$1", [req.params.id]),
      many<Row>(
        `SELECT e.*, c.title, c.level, c.slug FROM enrollments e JOIN courses c ON c.id=e.course_id
         WHERE e.user_id=$1 ORDER BY e.last_activity_at DESC`,
        [req.params.id],
      ),
      many<Row>(
        `SELECT o.*, c.title AS course_title FROM orders o LEFT JOIN courses c ON c.id=o.course_id
         WHERE o.user_id=$1 ORDER BY o.created_at DESC`,
        [req.params.id],
      ),
      many<Row>(
        `SELECT c.*, co.title AS course_title FROM certificates c JOIN courses co ON co.id=c.course_id
         WHERE c.user_id=$1 ORDER BY c.issued_at DESC`,
        [req.params.id],
      ),
      many<Row>("SELECT * FROM support_tickets WHERE user_id=$1 ORDER BY created_at DESC", [req.params.id]),
      many<Row>("SELECT id, email, user_agent, created_at FROM login_events WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10", [
        req.params.id,
      ]),
    ]);
    res.json({
      student: {
        ...mapProfile(row),
        roles: roles.map((role) => role.role),
        enrollments: enrollments.map((enrollment) => ({
          id: enrollment.id,
          course_id: enrollment.course_id,
          title: enrollment.title,
          level: enrollment.level,
          slug: enrollment.slug,
          progress_percent: toNumber(enrollment.progress_percent),
          enrolled_at: enrollment.enrolled_at,
          completed_at: enrollment.completed_at,
        })),
        orders: orders.map((order) => ({
          id: order.id,
          amount: toNumber(order.amount),
          currency: order.currency,
          status: order.status,
          provider: order.provider,
          reference: order.provider_reference,
          created_at: order.created_at,
          course_title: order.course_title,
        })),
        certificates: certificates.map((certificate) => ({
          id: certificate.id,
          certificate_number: certificate.certificate_number,
          issued_at: certificate.issued_at,
          course_title: certificate.course_title,
        })),
        tickets: tickets.map((ticket) => ({
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          created_at: ticket.created_at,
        })),
        logins: logins.map((login) => ({
          id: login.id,
          email: login.email,
          user_agent: login.user_agent,
          created_at: login.created_at,
        })),
      },
    });
  }),
);

adminRouter.patch(
  "/students/:id",
  handler(async (req, res) => {
    const input = z
      .object({
        fullName: z.string().trim().min(2).max(80).optional(),
        phone: z.string().trim().max(40).nullable().optional(),
        level: z.enum(LEVELS).optional(),
        dailyGoalMinutes: z.number().int().min(5).max(180).optional(),
        accountStatus: z.enum(["active", "suspended"]).optional(),
      })
      .parse(req.body);
    const existing = await one<Row>("SELECT * FROM profiles WHERE id=$1", [req.params.id]);
    if (!existing) throw new HttpError(404, "Student not found");
    await many(
      `UPDATE profiles SET full_name=$1, phone=$2, current_level=$3, daily_goal_minutes=$4, account_status=$5, updated_at=now()
       WHERE id=$6`,
      [
        input.fullName ?? existing.full_name,
        input.phone === undefined ? existing.phone : input.phone,
        input.level ?? existing.current_level,
        input.dailyGoalMinutes ?? existing.daily_goal_minutes,
        input.accountStatus ?? existing.account_status,
        req.params.id,
      ],
    );
    if (input.accountStatus === "suspended") {
      await many("DELETE FROM sessions WHERE user_id=$1", [req.params.id]);
    }
    await recordAudit(req.user!.id, "student.updated", "student", req.params.id, input as Record<string, unknown>);
    res.json({ ok: true });
  }),
);

adminRouter.post(
  "/students/:id/roles",
  requireSuperAdmin,
  handler(async (req, res) => {
    const input = z.object({ role: z.enum(ROLE_VALUES) }).parse(req.body);
    const account = await one("SELECT id FROM profiles WHERE id=$1", [req.params.id]);
    if (!account) throw new HttpError(404, "Student not found");
    await many("INSERT INTO user_roles(id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(user_id,role) DO NOTHING", [
      uid("rol"),
      req.params.id,
      input.role,
    ]);
    await recordAudit(req.user!.id, "role.granted", "student", req.params.id, { role: input.role });
    res.status(201).json({ ok: true });
  }),
);

adminRouter.delete(
  "/students/:id/roles/:role",
  requireSuperAdmin,
  handler(async (req, res) => {
    const role = z.enum(ROLE_VALUES).parse(req.params.role);
    if (role === "super_admin") {
      const count = await one<{ n: number }>("SELECT count(*)::int AS n FROM user_roles WHERE role='super_admin'");
      if (toNumber(count?.n) <= 1) throw new HttpError(400, "At least one super administrator must remain");
    }
    await many("DELETE FROM user_roles WHERE user_id=$1 AND role=$2", [req.params.id, role]);
    await recordAudit(req.user!.id, "role.revoked", "student", req.params.id, { role });
    res.json({ ok: true });
  }),
);

adminRouter.get(
  "/staff",
  handler(async (_req, res) => {
    const rows = await many<Row>(
      `SELECT p.*, (SELECT string_agg(r.role, ',') FROM user_roles r WHERE r.user_id=p.id) AS roles
       FROM profiles p WHERE EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id=p.id)
       ORDER BY p.created_at ASC`,
    );
    res.json({
      staff: rows.map((row) => ({
        ...mapProfile(row),
        roles: row.roles ? String(row.roles).split(",") : [],
      })),
    });
  }),
);

adminRouter.post(
  "/staff",
  requireSuperAdmin,
  handler(async (req, res) => {
    const input = z.object({ email: z.string().trim().toLowerCase().email(), role: z.enum(ROLE_VALUES) }).parse(req.body);
    const account = await one<{ id: string }>(
      "SELECT p.id FROM profiles p WHERE p.email=$1",
      [input.email],
    );
    if (!account) throw new HttpError(404, "No account uses that email address");
    await many("INSERT INTO user_roles(id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(user_id,role) DO NOTHING", [
      uid("rol"),
      account.id,
      input.role,
    ]);
    await recordAudit(req.user!.id, "role.granted", "student", account.id, { role: input.role, email: input.email });
    res.status(201).json({ ok: true });
  }),
);

// ---------------------------------------------------------------- orders

adminRouter.get(
  "/orders",
  handler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const rows = await many<Row>(
      `SELECT o.*, p.full_name AS student_name, p.email AS student_email, c.title AS course_title
       FROM orders o JOIN profiles p ON p.id=o.user_id LEFT JOIN courses c ON c.id=o.course_id
       WHERE ($1='' OR o.status=$1) ORDER BY o.created_at DESC`,
      [status],
    );
    res.json({
      orders: rows.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        course_id: row.course_id,
        amount: toNumber(row.amount),
        currency: row.currency,
        status: row.status,
        provider: row.provider,
        provider_reference: row.provider_reference,
        created_at: row.created_at,
        updated_at: row.updated_at,
        course_title: row.course_title,
        student_name: row.student_name,
        student_email: row.student_email,
      })),
    });
  }),
);

adminRouter.patch(
  "/orders/:id",
  handler(async (req, res) => {
    const input = z.object({ status: z.enum(["pending", "paid", "refunded", "failed"]) }).parse(req.body);
    const order = await one<Row>("SELECT * FROM orders WHERE id=$1", [req.params.id]);
    if (!order) throw new HttpError(404, "Order not found");
    await many("UPDATE orders SET status=$1, updated_at=now() WHERE id=$2", [input.status, req.params.id]);
    if (input.status === "paid" && order.course_id) {
      await many(
        `INSERT INTO enrollments(id,user_id,course_id,progress_percent) VALUES($1,$2,$3,0)
         ON CONFLICT(user_id,course_id) DO NOTHING`,
        [uid("enr"), order.user_id, order.course_id],
      );
    }
    await many(
      "INSERT INTO notifications(id,user_id,title,message,kind) VALUES($1,$2,$3,$4,'order')",
      [uid("ntf"), order.user_id, "Order updated", `Your order status changed to ${input.status}.`],
    );
    await recordAudit(req.user!.id, "order.updated", "order", req.params.id, { status: input.status });
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------- certificates

adminRouter.get(
  "/certificates",
  handler(async (_req, res) => {
    const rows = await many<Row>(
      `SELECT c.*, p.full_name, p.email, co.title AS course_title, co.level AS course_level
       FROM certificates c JOIN profiles p ON p.id=c.user_id JOIN courses co ON co.id=c.course_id
       ORDER BY c.issued_at DESC`,
    );
    const certificates: Certificate[] = rows.map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      course_id: String(row.course_id),
      certificate_number: String(row.certificate_number),
      issued_at: String(row.issued_at),
      course_title: String(row.course_title),
      course_level: String(row.course_level),
      student_name: String(row.full_name),
    }));
    res.json({ certificates });
  }),
);

adminRouter.delete(
  "/certificates/:id",
  handler(async (req, res) => {
    const certificate = await one<Row>("SELECT * FROM certificates WHERE id=$1", [req.params.id]);
    if (!certificate) throw new HttpError(404, "Certificate not found");
    await many("DELETE FROM certificates WHERE id=$1", [req.params.id]);
    await recordAudit(req.user!.id, "certificate.revoked", "certificate", req.params.id);
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------- support

adminRouter.get(
  "/support",
  handler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const rows = await many<Row>(
      `SELECT t.*, p.full_name AS student_name, p.email AS student_email
       FROM support_tickets t JOIN profiles p ON p.id=t.user_id
       WHERE ($1='' OR t.status=$1) ORDER BY t.created_at DESC`,
      [status],
    );
    res.json({
      tickets: rows.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        subject: row.subject,
        message: row.message,
        category: row.category,
        status: row.status,
        priority: row.priority,
        admin_reply: row.admin_reply,
        created_at: row.created_at,
        updated_at: row.updated_at,
        student_name: row.student_name,
        student_email: row.student_email,
      })),
    });
  }),
);

adminRouter.patch(
  "/support/:id",
  handler(async (req, res) => {
    const input = z
      .object({
        status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        reply: z.string().trim().max(4000).optional(),
      })
      .parse(req.body);
    const ticket = await one<Row>("SELECT * FROM support_tickets WHERE id=$1", [req.params.id]);
    if (!ticket) throw new HttpError(404, "Ticket not found");
    await many(
      `UPDATE support_tickets SET status=$1, priority=$2, admin_reply=$3, updated_at=now() WHERE id=$4`,
      [
        input.status ?? ticket.status,
        input.priority ?? ticket.priority,
        input.reply === undefined ? ticket.admin_reply : input.reply,
        req.params.id,
      ],
    );
    if (input.reply) {
      await many(
        "INSERT INTO notifications(id,user_id,title,message,kind) VALUES($1,$2,$3,$4,'support')",
        [uid("ntf"), ticket.user_id, "Support replied", `Re: ${ticket.subject} — ${input.reply}`],
      );
    }
    await recordAudit(req.user!.id, "support.updated", "ticket", req.params.id, { status: input.status });
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------- PDF library

const uploadRoot = path.resolve(process.cwd(), ".data", "uploads");
const pdfDir = path.join(uploadRoot, "pdfs");
const coverDir = path.join(uploadRoot, "covers");
fs.mkdirSync(pdfDir, { recursive: true });
fs.mkdirSync(coverDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, file, cb) => cb(null, file.fieldname === "cover" ? coverDir : pdfDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 8) || (file.fieldname === "cover" ? ".jpg" : ".pdf");
    cb(null, `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === "cover") {
      if (!file.mimetype.startsWith("image/")) return cb(new Error("Cover must be an image"));
      return cb(null, true);
    }
    if (file.mimetype !== "application/pdf") return cb(new Error("Upload a PDF file"));
    cb(null, true);
  },
});

adminRouter.get(
  "/pdfs",
  handler(async (_req, res) => {
    const rows = await many<Row>(
      `SELECT p.*, (SELECT count(*)::int FROM pdf_downloads d WHERE d.pdf_id=p.id) AS downloads
       FROM pdf_resources p ORDER BY p.created_at DESC`,
    );
    res.json({
      pdfs: rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        tag: row.tag,
        file_path: row.file_path,
        cover_path: row.cover_path,
        status: row.status,
        created_at: row.created_at,
        downloads: toNumber(row.downloads),
      })),
    });
  }),
);

adminRouter.post(
  "/pdfs",
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  handler(async (req, res) => {
    const input = z
      .object({
        name: z.string().trim().min(2).max(140),
        description: z.string().trim().max(1000).optional(),
        tag: z.string().trim().max(40).optional(),
        status: z.enum(["published", "pending", "archived"]).optional(),
      })
      .parse(req.body);
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const file = files?.file?.[0];
    const cover = files?.cover?.[0];
    if (!file) throw new HttpError(400, "Choose a PDF file to upload");
    const id = uid("pdf");
    const filePath = path.join("uploads", "pdfs", file.filename).replace(/\\/g, "/");
    const coverPath = cover ? `/uploads/covers/${cover.filename}` : "/images/learning-banner.jpg";
    await many(
      `INSERT INTO pdf_resources(id,name,description,tag,file_path,cover_path,status,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, input.name, input.description ?? "", input.tag ?? "German", filePath, coverPath, input.status ?? "published", req.user!.id],
    );
    await recordAudit(req.user!.id, "pdf.created", "pdf", id, { name: input.name });
    res.status(201).json({ id });
  }),
);

adminRouter.patch(
  "/pdfs/:id",
  handler(async (req, res) => {
    const input = z
      .object({
        name: z.string().trim().min(2).max(140).optional(),
        description: z.string().trim().max(1000).optional(),
        tag: z.string().trim().max(40).optional(),
        status: z.enum(["published", "pending", "archived"]).optional(),
      })
      .parse(req.body);
    const existing = await one<Row>("SELECT * FROM pdf_resources WHERE id=$1", [req.params.id]);
    if (!existing) throw new HttpError(404, "PDF not found");
    await many(
      `UPDATE pdf_resources SET name=$1, description=$2, tag=$3, status=$4, updated_at=now() WHERE id=$5`,
      [input.name ?? existing.name, input.description ?? existing.description, input.tag ?? existing.tag, input.status ?? existing.status, req.params.id],
    );
    await recordAudit(req.user!.id, "pdf.updated", "pdf", req.params.id, input as Record<string, unknown>);
    res.json({ ok: true });
  }),
);

adminRouter.delete(
  "/pdfs/:id",
  handler(async (req, res) => {
    const existing = await one<Row>("SELECT * FROM pdf_resources WHERE id=$1", [req.params.id]);
    if (!existing) throw new HttpError(404, "PDF not found");
    const dataRoot = path.resolve(process.cwd(), ".data");
    const removeIfInside = (relative: string) => {
      if (relative.startsWith("/uploads/")) {
        const absolute = path.resolve(dataRoot, relative.slice(1));
        if (absolute.startsWith(dataRoot + path.sep) && fs.existsSync(absolute)) fs.unlinkSync(absolute);
      }
    };
    removeIfInside(String(existing.file_path));
    removeIfInside(String(existing.cover_path));
    await many("DELETE FROM pdf_resources WHERE id=$1", [req.params.id]);
    await recordAudit(req.user!.id, "pdf.deleted", "pdf", req.params.id);
    res.json({ ok: true });
  }),
);

adminRouter.get(
  "/pdf-downloads",
  handler(async (_req, res) => {
    const rows = await many<Row>(
      `SELECT d.id, d.created_at, p.name AS pdf_name, pr.full_name, pr.email
       FROM pdf_downloads d JOIN pdf_resources p ON p.id=d.pdf_id JOIN profiles pr ON pr.id=d.user_id
       ORDER BY d.created_at DESC LIMIT 50`,
    );
    res.json({
      downloads: rows.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        pdf_name: row.pdf_name,
        student_name: row.full_name,
        student_email: row.email,
      })),
    });
  }),
);

// ---------------------------------------------------------------- site content & messages

adminRouter.get(
  "/site-content",
  handler(async (_req, res) => {
    const [contentRow, contactRow] = await Promise.all([
      one<{ value: unknown }>("SELECT value FROM site_settings WHERE key=$1", [SITE_CONTENT_KEY]),
      one<{ value: unknown }>("SELECT value FROM site_settings WHERE key='contact'"),
    ]);
    res.json({
      content: contentRow?.value ? parseJson(contentRow.value, null) : null,
      contact: parseJson<Record<string, string>>(contactRow?.value, {
        supportEmail: "support@germaninminute.com",
        phone: "+251 911 000 000",
        hours: "Monday–Friday, 09:00–18:00 EAT",
        address: "Meganagna Siti Mall, 5th Floor, Addis Ababa, Ethiopia",
      }),
    });
  }),
);

adminRouter.put(
  "/site-content",
  handler(async (req, res) => {
    const input = z.object({ content: siteContentSchema }).parse(req.body);
    await many(
      `INSERT INTO site_settings(key,value) VALUES($1,$2::jsonb)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=now()`,
      [SITE_CONTENT_KEY, JSON.stringify(input.content)],
    );
    await recordAudit(req.user!.id, "site_content.updated", "settings", SITE_CONTENT_KEY);
    res.json({ ok: true });
  }),
);

adminRouter.put(
  "/contact",
  handler(async (req, res) => {
    const input = z
      .object({
        supportEmail: z.string().trim().email(),
        phone: z.string().trim().max(60),
        hours: z.string().trim().max(120),
        address: z.string().trim().max(240),
      })
      .parse(req.body);
    await many(
      `INSERT INTO site_settings(key,value) VALUES('contact',$1::jsonb)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=now()`,
      [JSON.stringify(input)],
    );
    await recordAudit(req.user!.id, "contact.updated", "settings", "contact");
    res.json({ ok: true });
  }),
);

adminRouter.get(
  "/newsletter",
  handler(async (_req, res) => {
    const subscribers = await many<Row>("SELECT * FROM newsletter_subscribers ORDER BY created_at DESC");
    const messages = await many<Row>("SELECT * FROM contact_messages ORDER BY created_at DESC");
    res.json({
      subscribers: subscribers.map((row) => ({
        id: row.id,
        email: row.email,
        created_at: row.created_at,
      })),
      messages: messages.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        message: row.message,
        created_at: row.created_at,
      })),
    });
  }),
);

adminRouter.post(
  "/email",
  handler(async (req, res) => {
    const input = z
      .object({
        audience: z.enum(["all", "students", "level"]),
        level: z.enum(LEVELS).optional(),
        subject: z.string().trim().min(3).max(140),
        message: z.string().trim().min(10).max(4000),
      })
      .parse(req.body);
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (input.audience === "students") {
      clauses.push("NOT EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id=p.id)");
    }
    if (input.audience === "level") {
      if (!input.level) throw new HttpError(400, "Choose a level for this audience");
      params.push(input.level);
      clauses.push(`p.current_level=$${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const recipients = await many<{ id: string }>(`SELECT p.id FROM profiles p ${where}`, params);
    for (const recipient of recipients) {
      await many(
        "INSERT INTO notifications(id,user_id,title,message,kind) VALUES($1,$2,$3,$4,'email')",
        [uid("ntf"), recipient.id, input.subject, input.message],
      );
    }
    await recordAudit(req.user!.id, "email.sent", "broadcast", null, {
      audience: input.audience,
      level: input.level,
      recipients: recipients.length,
      subject: input.subject,
    });
    res.json({ recipients: recipients.length });
  }),
);

adminRouter.get(
  "/audit",
  handler(async (req, res) => {
    const limit = Math.min(500, Math.max(1, toNumber(req.query.limit, 100)));
    const rows = await many<Row>(
      `SELECT a.*, p.full_name AS actor_name FROM audit_logs a LEFT JOIN profiles p ON p.id=a.actor_id
       ORDER BY a.created_at DESC LIMIT $1`,
      [limit],
    );
    res.json({
      logs: rows.map((row) => ({
        id: row.id,
        actor_id: row.actor_id,
        actor_name: row.actor_name,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        details: parseJson(row.details, {}),
        created_at: row.created_at,
      })),
    });
  }),
);
