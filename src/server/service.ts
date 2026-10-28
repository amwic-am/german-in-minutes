import type { NextFunction, Request, Response } from "express";
import type { CourseSummary } from "../shared/types.js";
import { many, one, uid, type Row } from "./db.js";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function handler(fn: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const courseSelect = `
  SELECT c.id, c.slug, c.title, c.level, c.description, c.cover_url,
         c.price_eur::float8 AS price_eur, c.estimated_weeks, c.status, c.featured,
         c.created_at, c.updated_at,
         (SELECT count(*)::int FROM course_modules m JOIN lessons l ON l.module_id = m.id WHERE m.course_id = c.id) AS lesson_count
  FROM courses c
`;

export function mapCourse(row: Row): CourseSummary {
  const cover = (row.cover_url as string | null) ?? null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    level: String(row.level),
    description: String(row.description ?? ""),
    price_eur: toNumber(row.price_eur),
    estimated_weeks: toNumber(row.estimated_weeks, 8),
    cover_url: cover,
    image: cover ?? "/images/learning-banner.jpg",
    status: (row.status as CourseSummary["status"]) ?? "draft",
    featured: Boolean(row.featured),
    lesson_count: toNumber(row.lesson_count),
  };
}

export async function publishedCourseSummaries() {
  const rows = await many<Row>(`${courseSelect} WHERE c.status='published' ORDER BY c.featured DESC, c.created_at ASC`);
  return rows.map(mapCourse);
}

export async function enrollmentCourseSummaries(userId: string) {
  const rows = await many<Row>(
    `${courseSelect} JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1 WHERE c.status='published' ORDER BY e.last_activity_at DESC`,
    [userId],
  );
  return rows.map(mapCourse);
}

export async function recalculateProgress(userId: string, courseId: string) {
  const totals = await one<{ total: number; done: number }>(
    `SELECT count(*)::int AS total,
            count(lp.id) FILTER (WHERE lp.completed)::int AS done
     FROM lessons l
     JOIN course_modules m ON m.id = l.module_id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $1
     WHERE m.course_id = $2 AND l.status = 'published' AND m.status = 'published'`,
    [userId, courseId],
  );
  const total = toNumber(totals?.total);
  const done = toNumber(totals?.done);
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  await many(
    `UPDATE enrollments
     SET progress_percent=$1, last_activity_at=now(),
         completed_at = CASE WHEN $1 = 100 THEN COALESCE(completed_at, now()) ELSE completed_at END
     WHERE user_id=$2 AND course_id=$3`,
    [percent, userId, courseId],
  );
  if (percent === 100) await issueCertificate(userId, courseId);
  return { total, done, percent };
}

export async function issueCertificate(userId: string, courseId: string) {
  const existing = await one<{ id: string; certificate_number: string }>(
    "SELECT id, certificate_number FROM certificates WHERE user_id=$1 AND course_id=$2",
    [userId, courseId],
  );
  if (existing) return existing;
  const course = await one<{ title: string; level: string }>("SELECT title, level FROM courses WHERE id=$1", [courseId]);
  if (!course) return null;
  const year = new Date().getFullYear();
  const issued = await many<{ certificate_number: string }>("SELECT certificate_number FROM certificates");
  const highest = issued.reduce((max, row) => {
    const match = /(\d+)$/.exec(row.certificate_number);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  let number = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `GIM-${year}-${String(highest + 1 + attempt).padStart(6, "0")}`;
    const taken = await one("SELECT id FROM certificates WHERE certificate_number=$1", [candidate]);
    if (!taken) {
      number = candidate;
      break;
    }
  }
  if (!number) number = `GIM-${year}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const id = uid("cert");
  await many(
    "INSERT INTO certificates(id,user_id,course_id,certificate_number) VALUES($1,$2,$3,$4)",
    [id, userId, courseId, number],
  );
  await many(
    "INSERT INTO notifications(id,user_id,title,message,kind) VALUES($1,$2,$3,$4,'certificate')",
    [uid("ntf"), userId, "Certificate issued", `Your certificate for ${course.title} is ready to download.`],
  );
  return { id, certificate_number: number };
}

export async function userCourseAccess(userId: string, courseId: string) {
  return one<{ id: string; progress_percent: number }>(
    "SELECT id, progress_percent FROM enrollments WHERE user_id=$1 AND course_id=$2",
    [userId, courseId],
  );
}

export function iso(value: unknown) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

export function formatDate(value: unknown) {
  const isoValue = iso(value);
  return isoValue ? new Date(isoValue).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
}

export function monthKey(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short" });
}
