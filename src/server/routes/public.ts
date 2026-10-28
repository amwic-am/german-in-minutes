import { Router } from "express";
import { z } from "zod";
import { defaultSiteContent, parseSiteContent, SITE_CONTENT_KEY } from "../../shared/site-content.js";
import type { CourseDetail, Lesson, Module, PdfResource } from "../../shared/types.js";
import { many, one, type Row } from "../db.js";
import { HttpError, courseSelect, handler, mapCourse, parseJson, toNumber } from "../service.js";

export const publicRouter = Router();

function mapLesson(row: Row): Lesson {
  return {
    id: String(row.id),
    module_id: String(row.module_id),
    title: String(row.title),
    summary: String(row.summary ?? ""),
    kind: String(row.kind ?? "video"),
    position: toNumber(row.position),
    duration_minutes: toNumber(row.duration_minutes, 10),
    media_url: (row.media_url as string | null) ?? null,
    download_url: (row.download_url as string | null) ?? null,
    body: parseJson<Lesson["body"]>(row.body, {}),
    status: (row.status as Lesson["status"]) ?? "draft",
  };
}

publicRouter.get(
  "/site-content",
  handler(async (_req, res) => {
    const [contentRow, contactRow] = await Promise.all([
      one<{ value: unknown }>("SELECT value FROM site_settings WHERE key=$1", [SITE_CONTENT_KEY]),
      one<{ value: unknown }>("SELECT value FROM site_settings WHERE key='contact'"),
    ]);
    const content = contentRow ? parseSiteContent(contentRow.value) : defaultSiteContent;
    const contact = parseJson<Record<string, string>>(contactRow?.value, {
      supportEmail: "support@germaninminute.com",
      phone: "+251 911 000 000",
      hours: "Monday–Friday, 09:00–18:00 EAT",
      address: "Meganagna Siti Mall, 5th Floor, Addis Ababa, Ethiopia",
    });
    res.json({ content, contact });
  }),
);

publicRouter.get(
  "/courses",
  handler(async (req, res) => {
    const level = typeof req.query.level === "string" ? req.query.level.trim().toUpperCase() : "";
    const query = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const rows = await many<Row>(`${courseSelect} WHERE c.status='published' ORDER BY c.featured DESC, c.created_at ASC`);
    const courses = rows.map(mapCourse).filter((course) => {
      if (level && course.level.toUpperCase() !== level) return false;
      if (!query) return true;
      return `${course.title} ${course.description} ${course.level}`.toLowerCase().includes(query);
    });
    res.json({ courses });
  }),
);

publicRouter.get(
  "/courses/:slug",
  handler(async (req, res) => {
    const courseRow = await one<Row>(`${courseSelect} WHERE c.slug=$1 AND c.status='published'`, [req.params.slug]);
    if (!courseRow) throw new HttpError(404, "Course not found");
    const course = mapCourse(courseRow);
    const moduleRows = await many<Row>(
      "SELECT * FROM course_modules WHERE course_id=$1 AND status='published' ORDER BY position",
      [course.id],
    );
    const lessonRows = await many<Row>(
      `SELECT l.* FROM lessons l JOIN course_modules m ON m.id=l.module_id
       WHERE m.course_id=$1 AND l.status='published' ORDER BY m.position, l.position`,
      [course.id],
    );
    const modules: Module[] = moduleRows.map((row) => ({
      id: String(row.id),
      course_id: String(row.course_id),
      title: String(row.title),
      description: String(row.description ?? ""),
      position: toNumber(row.position),
      status: (row.status as Module["status"]) ?? "draft",
      lessons: lessonRows.filter((lesson) => lesson.module_id === row.id).map(mapLesson),
    }));
    const detail: CourseDetail = { ...course, modules };
    res.json({ course: detail });
  }),
);

publicRouter.get(
  "/pdfs",
  handler(async (_req, res) => {
    const rows = await many<Row>(
      `SELECT p.*, (SELECT count(*)::int FROM pdf_downloads d WHERE d.pdf_id=p.id) AS downloads
       FROM pdf_resources p WHERE p.status='published' ORDER BY p.created_at DESC`,
    );
    const pdfs: PdfResource[] = rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      description: String(row.description ?? ""),
      tag: String(row.tag ?? "German"),
      file_path: String(row.file_path),
      cover_path: String(row.cover_path),
      status: row.status as PdfResource["status"],
      created_at: String(row.created_at),
      downloads: toNumber(row.downloads),
    }));
    res.json({ pdfs });
  }),
);

publicRouter.post(
  "/newsletter",
  handler(async (req, res) => {
    const input = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email") }).parse(req.body);
    await many("INSERT INTO newsletter_subscribers(id,email) VALUES($1,$2) ON CONFLICT(email) DO NOTHING", [
      `nws_${crypto.randomUUID()}`,
      input.email,
    ]);
    res.status(201).json({ ok: true });
  }),
);

publicRouter.post(
  "/contact",
  handler(async (req, res) => {
    const input = z
      .object({
        name: z.string().trim().min(2, "Enter your name").max(80),
        email: z.string().trim().toLowerCase().email("Enter a valid email"),
        message: z.string().trim().min(10, "Tell us a little more").max(4000),
      })
      .parse(req.body);
    await many("INSERT INTO contact_messages(id,name,email,message) VALUES($1,$2,$3,$4)", [
      `msg_${crypto.randomUUID()}`,
      input.name,
      input.email,
      input.message,
    ]);
    res.status(201).json({ ok: true });
  }),
);

publicRouter.get(
  "/stats",
  handler(async (_req, res) => {
    const [students, courses, lessons, certificates] = await Promise.all([
      one<{ n: number }>("SELECT count(*)::int AS n FROM profiles"),
      one<{ n: number }>("SELECT count(*)::int AS n FROM courses WHERE status='published'"),
      one<{ n: number }>("SELECT count(*)::int AS n FROM lessons WHERE status='published'"),
      one<{ n: number }>("SELECT count(*)::int AS n FROM certificates"),
    ]);
    res.json({
      students: toNumber(students?.n),
      courses: toNumber(courses?.n),
      lessons: toNumber(lessons?.n),
      certificates: toNumber(certificates?.n),
    });
  }),
);
