import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, isStaff, recordAudit } from "../auth.js";
import { many, one, uid, type Row } from "../db.js";
import { certificatePdf, bookletPdf, receiptPdf } from "../pdf.js";
import {
  HttpError,
  courseSelect,
  handler,
  issueCertificate,
  mapCourse,
  parseJson,
  recalculateProgress,
  toNumber,
  userCourseAccess,
} from "../service.js";
import type {
  Certificate,
  CourseDetail,
  DashboardData,
  Enrollment,
  Lesson,
  Module,
  Notification,
  Order,
  PdfResource,
  SupportTicket,
} from "../../shared/types.js";

export const studentRouter = Router();
studentRouter.use(requireAuth);

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

async function courseDetail(courseId: string) {
  const courseRow = await one<Row>(`${courseSelect} WHERE c.id=$1`, [courseId]);
  if (!courseRow) throw new HttpError(404, "Course not found");
  const course = mapCourse(courseRow);
  const moduleRows = await many<Row>(
    "SELECT * FROM course_modules WHERE course_id=$1 AND status='published' ORDER BY position",
    [courseId],
  );
  const lessonRows = await many<Row>(
    `SELECT l.* FROM lessons l JOIN course_modules m ON m.id=l.module_id
     WHERE m.course_id=$1 AND l.status='published' ORDER BY m.position, l.position`,
    [courseId],
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
  return { course: detail, lessonRows };
}

async function enrollmentAccess(userId: string, roles: string[], courseId: string) {
  const enrollment = await userCourseAccess(userId, courseId);
  if (!enrollment && roles.length === 0) {
    throw new HttpError(403, "Enrol in this course to open its lessons");
  }
  return enrollment;
}

async function lessonContext(lessonId: string) {
  const row = await one<Row>(
    `SELECT l.*, m.course_id, m.title AS module_title FROM lessons l
     JOIN course_modules m ON m.id = l.module_id WHERE l.id=$1`,
    [lessonId],
  );
  if (!row) throw new HttpError(404, "Lesson not found");
  return row;
}

async function markLessonComplete(userId: string, lessonId: string, courseId: string) {
  await many(
    `INSERT INTO lesson_progress(id,user_id,lesson_id,completed,completed_at)
     VALUES($1,$2,$3,true,now())
     ON CONFLICT(user_id,lesson_id) DO UPDATE
       SET completed=true, completed_at=COALESCE(lesson_progress.completed_at, now()), updated_at=now()`,
    [uid("prg"), userId, lessonId],
  );
  await many("UPDATE enrollments SET last_lesson_id=$1 WHERE user_id=$2 AND course_id=$3", [lessonId, userId, courseId]);
  return recalculateProgress(userId, courseId);
}

studentRouter.get(
  "/me/dashboard",
  handler(async (req, res) => {
    const user = req.user!;
    const [enrollmentRows, certificateRows, notificationRows, enrolledIds] = await Promise.all([
      many<Row>(
        `${courseSelect} JOIN enrollments e ON e.course_id=c.id AND e.user_id=$1
         ORDER BY e.last_activity_at DESC`,
        [user.id],
      ),
      many<Row>(
        `SELECT c.*, co.title AS course_title, co.level AS course_level
         FROM certificates c JOIN courses co ON co.id=c.course_id
         WHERE c.user_id=$1 ORDER BY c.issued_at DESC`,
        [user.id],
      ),
      many<Row>("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5", [user.id]),
      many<{ course_id: string }>("SELECT course_id FROM enrollments WHERE user_id=$1", [user.id]),
    ]);
    const enrollmentProgress = await many<Row>(
      "SELECT id, course_id, enrolled_at, completed_at, progress_percent, last_lesson_id FROM enrollments WHERE user_id=$1",
      [user.id],
    );
    const enrollments: Enrollment[] = enrollmentRows.map((row) => {
      const progress = enrollmentProgress.find((e) => e.course_id === row.id);
      return {
        id: String(progress?.id ?? ""),
        user_id: user.id,
        course_id: String(row.id),
        enrolled_at: String(progress?.enrolled_at ?? ""),
        completed_at: progress?.completed_at ? String(progress.completed_at) : null,
        progress_percent: toNumber(progress?.progress_percent),
        last_lesson_id: (progress?.last_lesson_id as string | null) ?? null,
        course: mapCourse(row),
      };
    });
    const certificates: Certificate[] = certificateRows.map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      course_id: String(row.course_id),
      certificate_number: String(row.certificate_number),
      issued_at: String(row.issued_at),
      course_title: String(row.course_title),
      course_level: String(row.course_level),
      student_name: user.full_name,
    }));
    const notifications: Notification[] = notificationRows.map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      title: String(row.title),
      message: String(row.message),
      kind: String(row.kind),
      read_at: row.read_at ? String(row.read_at) : null,
      created_at: String(row.created_at),
    }));
    const enrolled = new Set(enrolledIds.map((row) => row.course_id));
    const recommendedRows = await many<Row>(
      `${courseSelect} WHERE c.status='published' ORDER BY c.featured DESC, c.created_at ASC LIMIT 8`,
    );
    const recommended = recommendedRows.map(mapCourse).filter((course) => !enrolled.has(course.id)).slice(0, 3);
    const avgProgress = enrollments.length
      ? Math.round(enrollments.reduce((total, item) => total + item.progress_percent, 0) / enrollments.length)
      : 0;
    const data: DashboardData = {
      profile: user.profile,
      enrollments,
      certificates,
      notifications,
      stats: { courses: enrollments.length, avgProgress, certificates: certificates.length },
      recommended,
    };
    res.json(data);
  }),
);

studentRouter.get(
  "/learn/:slug",
  handler(async (req, res) => {
    const user = req.user!;
    const courseRow = await one<{ id: string }>(
      "SELECT id FROM courses WHERE slug=$1 AND status='published'",
      [req.params.slug],
    );
    if (!courseRow) throw new HttpError(404, "Course not found");
    const enrollment = await enrollmentAccess(user.id, user.roles, courseRow.id);
    const { course, lessonRows } = await courseDetail(courseRow.id);
    const progressRows = await many<{ lesson_id: string; completed: boolean; completed_at: string | null }>(
      `SELECT lp.lesson_id, lp.completed, lp.completed_at FROM lesson_progress lp
       JOIN lessons l ON l.id=lp.lesson_id JOIN course_modules m ON m.id=l.module_id
       WHERE lp.user_id=$1 AND m.course_id=$2`,
      [user.id, courseRow.id],
    );
    const progress: Record<string, { completed: boolean; completed_at: string | null }> = {};
    for (const row of progressRows) {
      progress[row.lesson_id] = { completed: Boolean(row.completed), completed_at: row.completed_at ? String(row.completed_at) : null };
    }
    const quizRows = await many<{ lesson_id: string; id: string }>(
      "SELECT id, lesson_id FROM quizzes WHERE status='published' AND lesson_id IS NOT NULL",
    );
    const quizzes = Object.fromEntries(quizRows.map((row) => [row.lesson_id, row.id]));
    const certificate = await one<Row>(
      "SELECT * FROM certificates WHERE user_id=$1 AND course_id=$2",
      [user.id, courseRow.id],
    );
    const completedCount = progressRows.filter((row) => row.completed).length;
    const nextLesson = lessonRows.find((row) => !progress[String(row.id)]?.completed);
    res.json({
      course,
      enrollment,
      progress,
      quizzes,
      certificate: certificate
        ? { id: certificate.id, certificate_number: certificate.certificate_number, issued_at: certificate.issued_at }
        : null,
      completedCount,
      totalLessons: lessonRows.length,
      nextLessonId: nextLesson ? String(nextLesson.id) : null,
    });
  }),
);

studentRouter.post(
  "/lessons/:id/complete",
  handler(async (req, res) => {
    const user = req.user!;
    const lesson = await lessonContext(req.params.id);
    const courseId = String(lesson.course_id);
    await enrollmentAccess(user.id, user.roles, courseId);
    if (lesson.kind === "quiz") {
      const passed = await one(
        `SELECT a.id FROM quiz_attempts a JOIN quizzes q ON q.id=a.quiz_id
         WHERE a.user_id=$1 AND q.lesson_id=$2 AND a.passed=true LIMIT 1`,
        [user.id, lesson.id],
      );
      if (!passed) throw new HttpError(400, "Pass the final quiz to complete this lesson");
    }
    const result = await markLessonComplete(user.id, String(lesson.id), courseId);
    const certificate = await one<Row>("SELECT id, certificate_number FROM certificates WHERE user_id=$1 AND course_id=$2", [
      user.id,
      courseId,
    ]);
    res.json({ ok: true, progress: result, certificate });
  }),
);

studentRouter.get(
  "/lessons/:id/quiz",
  handler(async (req, res) => {
    const user = req.user!;
    const lesson = await lessonContext(req.params.id);
    await enrollmentAccess(user.id, user.roles, String(lesson.course_id));
    const quiz = await one<Row>("SELECT * FROM quizzes WHERE lesson_id=$1 AND status='published'", [lesson.id]);
    if (!quiz) throw new HttpError(404, "This lesson has no quiz");
    const questionRows = await many<Row>("SELECT * FROM quiz_questions WHERE quiz_id=$1 ORDER BY position", [quiz.id]);
    const optionRows = await many<Row>(
      `SELECT o.id, o.question_id, o.label, o.position FROM quiz_options o
       JOIN quiz_questions q ON q.id=o.question_id WHERE q.quiz_id=$1 ORDER BY o.position`,
      [quiz.id],
    );
    const attempts = await many<{ score: number; passed: boolean; submitted_at: string }>(
      "SELECT score, passed, submitted_at FROM quiz_attempts WHERE user_id=$1 AND quiz_id=$2 ORDER BY submitted_at DESC",
      [user.id, quiz.id],
    );
    res.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        passing_score: toNumber(quiz.passing_score, 70),
        time_limit_minutes: quiz.time_limit_minutes ? toNumber(quiz.time_limit_minutes) : null,
        attempts_allowed: toNumber(quiz.attempts_allowed, 3),
        questions: questionRows.map((question) => ({
          id: question.id,
          prompt: question.prompt,
          points: toNumber(question.points, 1),
          options: optionRows
            .filter((option) => option.question_id === question.id)
            .map((option) => ({ id: option.id, label: option.label })),
        })),
      },
      attemptsUsed: attempts.length,
      attempts,
      bestScore: attempts.reduce((best, item) => Math.max(best, toNumber(item.score)), 0),
      passed: attempts.some((item) => item.passed),
    });
  }),
);

studentRouter.post(
  "/quizzes/:id/submit",
  handler(async (req, res) => {
    const user = req.user!;
    const input = z.object({ answers: z.record(z.string(), z.string()) }).parse(req.body);
    const quiz = await one<Row>("SELECT * FROM quizzes WHERE id=$1 AND status='published'", [req.params.id]);
    if (!quiz) throw new HttpError(404, "Quiz not found");
    if (!quiz.lesson_id) throw new HttpError(400, "This quiz is not attached to a lesson");
    const lesson = await lessonContext(String(quiz.lesson_id));
    const courseId = String(lesson.course_id);
    await enrollmentAccess(user.id, user.roles, courseId);
    const attemptCount = await one<{ n: number }>(
      "SELECT count(*)::int AS n FROM quiz_attempts WHERE user_id=$1 AND quiz_id=$2",
      [user.id, quiz.id],
    );
    const allowed = toNumber(quiz.attempts_allowed, 3);
    if (toNumber(attemptCount?.n) >= allowed) {
      throw new HttpError(400, `You have used all ${allowed} attempts for this quiz`);
    }
    const questionRows = await many<Row>("SELECT * FROM quiz_questions WHERE quiz_id=$1 ORDER BY position", [quiz.id]);
    if (questionRows.length === 0) throw new HttpError(400, "This quiz has no questions yet");
    const optionRows = await many<Row>(
      `SELECT o.* FROM quiz_options o JOIN quiz_questions q ON q.id=o.question_id WHERE q.quiz_id=$1`,
      [quiz.id],
    );
    let correct = 0;
    let totalPoints = 0;
    const results = questionRows.map((question) => {
      const points = toNumber(question.points, 1);
      totalPoints += points;
      const correctOption = optionRows.find((option) => option.question_id === question.id && option.is_correct);
      const selected = input.answers[String(question.id)] ?? null;
      const isCorrect = Boolean(correctOption && selected === correctOption.id);
      if (isCorrect) correct += points;
      return {
        questionId: String(question.id),
        prompt: String(question.prompt),
        selectedOptionId: selected,
        correctOptionId: correctOption ? String(correctOption.id) : null,
        correct: isCorrect,
        points,
      };
    });
    const score = totalPoints === 0 ? 0 : Math.round((correct / totalPoints) * 100);
    const passed = score >= toNumber(quiz.passing_score, 70);
    await many(
      "INSERT INTO quiz_attempts(id,user_id,quiz_id,score,passed,answers) VALUES($1,$2,$3,$4,$5,$6::jsonb)",
      [uid("att"), user.id, quiz.id, score, passed, JSON.stringify(input.answers)],
    );
    let progress = null;
    if (passed) progress = await markLessonComplete(user.id, String(lesson.id), courseId);
    const certificate = await one<Row>("SELECT id, certificate_number FROM certificates WHERE user_id=$1 AND course_id=$2", [
      user.id,
      courseId,
    ]);
    res.json({ score, passed, passingScore: toNumber(quiz.passing_score, 70), results, progress, certificate });
  }),
);

studentRouter.post(
  "/checkout",
  handler(async (req, res) => {
    const user = req.user!;
    const input = z
      .object({
        courseId: z.string().min(1),
        provider: z.enum(["stripe_test", "paypal_test"]).optional(),
      })
      .parse(req.body);
    const course = await one<{ id: string; title: string; price_eur: number; status: string }>(
      "SELECT id, title, price_eur::float8 AS price_eur, status FROM courses WHERE id=$1",
      [input.courseId],
    );
    if (!course || course.status !== "published") throw new HttpError(404, "Course not found");
    const existing = await userCourseAccess(user.id, course.id);
    if (existing) throw new HttpError(409, "You are already enrolled in this course");
    const provider = input.provider ?? "stripe_test";
    const reference = `TEST-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const orderId = uid("ord");
    const enrollmentId = uid("enr");
    await many(
      `INSERT INTO orders(id,user_id,course_id,amount,currency,status,provider,provider_reference)
       VALUES($1,$2,$3,$4,'USD','paid',$5,$6)`,
      [orderId, user.id, course.id, course.price_eur, provider, reference],
    );
    await many("INSERT INTO enrollments(id,user_id,course_id,progress_percent) VALUES($1,$2,$3,0)", [
      enrollmentId,
      user.id,
      course.id,
    ]);
    await many(
      "INSERT INTO notifications(id,user_id,title,message,kind) VALUES($1,$2,$3,$4,'order')",
      [uid("ntf"), user.id, "Payment confirmed", `You are enrolled in ${course.title}. Your receipt is available in Personal settings.`],
    );
    await recordAudit(user.id, "checkout.completed", "order", orderId, { courseId: course.id, amount: course.price_eur });
    const order = await one<Row>("SELECT * FROM orders WHERE id=$1", [orderId]);
    res.status(201).json({
      order: order ? mapOrder(order) : null,
      enrollment: { id: enrollmentId, course_id: course.id, progress_percent: 0 },
    });
  }),
);

function mapOrder(row: Row): Order {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    course_id: (row.course_id as string | null) ?? null,
    amount: toNumber(row.amount),
    currency: String(row.currency ?? "USD"),
    status: row.status as Order["status"],
    provider: (row.provider as string | null) ?? null,
    provider_reference: (row.provider_reference as string | null) ?? null,
    created_at: String(row.created_at),
    course_title: (row.course_title as string | null) ?? null,
    course_level: (row.course_level as string | null) ?? null,
  };
}

studentRouter.get(
  "/orders",
  handler(async (req, res) => {
    const rows = await many<Row>(
      `SELECT o.*, c.title AS course_title, c.level AS course_level FROM orders o
       LEFT JOIN courses c ON c.id=o.course_id WHERE o.user_id=$1 ORDER BY o.created_at DESC`,
      [req.user!.id],
    );
    res.json({ orders: rows.map(mapOrder) });
  }),
);

studentRouter.get(
  "/orders/:id/receipt",
  handler(async (req, res) => {
    const row = await one<Row>(
      `SELECT o.*, c.title AS course_title, c.level AS course_level FROM orders o
       LEFT JOIN courses c ON c.id=o.course_id WHERE o.id=$1`,
      [req.params.id],
    );
    if (!row) throw new HttpError(404, "Order not found");
    if (row.user_id !== req.user!.id && !isStaff(req.user)) throw new HttpError(403, "This receipt belongs to another account");
    const buffer = await receiptPdf({
      reference: (row.provider_reference as string | null) ?? String(row.id).slice(-8).toUpperCase(),
      orderId: String(row.id),
      date: new Date(String(row.created_at)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      status: String(row.status),
      customer: req.user!.full_name,
      email: req.user!.email,
      course: String(row.course_title ?? "German course"),
      level: (row.course_level as string | null) ?? null,
      amount: toNumber(row.amount),
      currency: String(row.currency ?? "USD"),
      provider: String(row.provider ?? "test"),
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="GIM-receipt-${row.id}.pdf"`);
    res.send(buffer);
  }),
);

studentRouter.get(
  "/certificates",
  handler(async (req, res) => {
    const rows = await many<Row>(
      `SELECT c.*, co.title AS course_title, co.level AS course_level FROM certificates c
       JOIN courses co ON co.id=c.course_id WHERE c.user_id=$1 ORDER BY c.issued_at DESC`,
      [req.user!.id],
    );
    const certificates: Certificate[] = rows.map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      course_id: String(row.course_id),
      certificate_number: String(row.certificate_number),
      issued_at: String(row.issued_at),
      course_title: String(row.course_title),
      course_level: String(row.course_level),
      student_name: req.user!.full_name,
    }));
    res.json({ certificates });
  }),
);

studentRouter.get(
  "/certificates/:id/pdf",
  handler(async (req, res) => {
    const row = await one<Row>(
      `SELECT c.*, co.title AS course_title, co.level AS course_level, p.full_name
       FROM certificates c JOIN courses co ON co.id=c.course_id
       JOIN profiles p ON p.id=c.user_id WHERE c.id=$1`,
      [req.params.id],
    );
    if (!row) throw new HttpError(404, "Certificate not found");
    if (row.user_id !== req.user!.id && !isStaff(req.user)) throw new HttpError(403, "This certificate belongs to another account");
    const buffer = await certificatePdf({
      name: String(row.full_name ?? req.user!.full_name),
      course: String(row.course_title),
      level: (row.course_level as string | null) ?? null,
      number: String(row.certificate_number),
      date: new Date(String(row.issued_at)).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="GIM-certificate-${row.certificate_number}.pdf"`);
    res.send(buffer);
  }),
);

function mapTicket(row: Row): SupportTicket {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    subject: String(row.subject),
    message: String(row.message),
    category: String(row.category),
    status: String(row.status),
    priority: String(row.priority),
    admin_reply: (row.admin_reply as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

studentRouter.get(
  "/support",
  handler(async (req, res) => {
    const rows = await many<Row>("SELECT * FROM support_tickets WHERE user_id=$1 ORDER BY created_at DESC", [req.user!.id]);
    res.json({ tickets: rows.map(mapTicket) });
  }),
);

studentRouter.post(
  "/support",
  handler(async (req, res) => {
    const input = z
      .object({
        subject: z.string().trim().min(4, "Add a subject").max(120),
        category: z.string().trim().min(2).max(60),
        message: z.string().trim().min(10, "Describe your question").max(4000),
      })
      .parse(req.body);
    const id = uid("tkt");
    await many("INSERT INTO support_tickets(id,user_id,subject,category,message) VALUES($1,$2,$3,$4,$5)", [
      id,
      req.user!.id,
      input.subject,
      input.category,
      input.message,
    ]);
    const row = await one<Row>("SELECT * FROM support_tickets WHERE id=$1", [id]);
    res.status(201).json({ ticket: row ? mapTicket(row) : null });
  }),
);

studentRouter.get(
  "/notifications",
  handler(async (req, res) => {
    const rows = await many<Row>("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50", [
      req.user!.id,
    ]);
    const unread = rows.filter((row) => !row.read_at).length;
    res.json({
      notifications: rows.map((row) => ({
        id: String(row.id),
        user_id: String(row.user_id),
        title: String(row.title),
        message: String(row.message),
        kind: String(row.kind),
        read_at: row.read_at ? String(row.read_at) : null,
        created_at: String(row.created_at),
      })),
      unread,
    });
  }),
);

studentRouter.post(
  "/notifications/:id/read",
  handler(async (req, res) => {
    await many("UPDATE notifications SET read_at=now() WHERE id=$1 AND user_id=$2 AND read_at IS NULL", [
      req.params.id,
      req.user!.id,
    ]);
    res.json({ ok: true });
  }),
);

studentRouter.post(
  "/notifications/read-all",
  handler(async (req, res) => {
    await many("UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL", [req.user!.id]);
    res.json({ ok: true });
  }),
);

studentRouter.get(
  "/pdfs/:id/download",
  handler(async (req, res) => {
    const pdf = await one<Row>("SELECT * FROM pdf_resources WHERE id=$1 AND status='published'", [req.params.id]);
    if (!pdf) throw new HttpError(404, "PDF not found");
    let buffer: Buffer;
    const filePath = String(pdf.file_path);
    if (filePath.startsWith("seed/")) {
      buffer = await bookletPdf(String(pdf.name), String(pdf.description), String(pdf.tag));
    } else {
      const uploadsRoot = path.resolve(process.cwd(), ".data");
      const absolute = path.resolve(uploadsRoot, filePath);
      if (!absolute.startsWith(uploadsRoot + path.sep) || !fs.existsSync(absolute)) {
        throw new HttpError(404, "This file is no longer available");
      }
      buffer = fs.readFileSync(absolute);
    }
    await many("INSERT INTO pdf_downloads(id,user_id,pdf_id) VALUES($1,$2,$3)", [uid("dl"), req.user!.id, pdf.id]);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${String(pdf.name).replace(/[^a-zA-Z0-9]+/g, "-")}.pdf"`);
    res.send(buffer);
  }),
);

studentRouter.post(
  "/ai/ask",
  handler(async (req, res) => {
    const input = z
      .object({ question: z.string().trim().min(3).max(500), courseId: z.string().optional() })
      .parse(req.body);
    const words = input.question
      .toLowerCase()
      .replace(/[^a-zäöüß\s]/gi, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2);
    const rows = await many<Row>(
      `SELECT l.id, l.title, l.summary, l.body, c.title AS course_title, c.slug
       FROM lessons l JOIN course_modules m ON m.id=l.module_id JOIN courses c ON c.id=m.course_id
       WHERE l.status='published' AND c.status='published' ${input.courseId ? "AND c.id=$1" : ""}
       ORDER BY l.created_at LIMIT 400`,
      input.courseId ? [input.courseId] : [],
    );
    const ranked = rows
      .map((row) => {
        const haystack = `${row.title} ${row.summary} ${row.course_title} ${JSON.stringify(row.body ?? {})}`.toLowerCase();
        const score = words.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
        return { row, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    const matches = ranked.filter((item) => item.score > 0);
    const sources = (matches.length ? matches : ranked.slice(0, 2)).map(({ row }) => ({
      lessonId: String(row.id),
      title: String(row.title),
      course: String(row.course_title),
      slug: String(row.slug),
      summary: String(row.summary ?? ""),
    }));
    const answer = sources.length
      ? `Here is where your course covers that. ${sources
          .map((source) => `In “${source.title}” (${source.course}): ${source.summary || "review the lesson notes and practice exercise."}`)
          .join(" ")} Try the practice exercise in the lesson, then explain the rule out loud in your own words.`
      : "I could not find that in your course notes yet. Try asking about a lesson topic such as articles, word order, past tense, or exam speaking, or open your course curriculum to browse the lessons.";
    res.json({ answer, sources });
  }),
);

studentRouter.get(
  "/me/pdfs",
  handler(async (req, res) => {
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
    const downloads = await many<Row>(
      `SELECT d.pdf_id, max(d.created_at) AS last_download FROM pdf_downloads d
       WHERE d.user_id=$1 GROUP BY d.pdf_id`,
      [req.user!.id],
    );
    res.json({ pdfs, downloads });
  }),
);
