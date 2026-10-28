import bcrypt from "bcryptjs";
import { COURSES } from "../shared/data.js";
import { defaultSiteContent } from "../shared/site-content.js";
import { uid, type Db } from "./db.js";

const IMAGES = [
  "/images/learning-banner.jpg",
  "/images/study-group.jpg",
  "/images/study-group.jpg",
  "/images/learning-banner.jpg",
  "/images/study-group.jpg",
  "/images/learning-banner.jpg",
];

const EXERCISES = [
  { question: "Choose the correct article for “Tisch”.", options: ["der", "die", "das", "den"], answer: 0 },
  { question: "Which greeting is the most formal?", options: ["Guten Tag", "Hallo", "Hi", "Na"], answer: 0 },
  { question: "Complete the sentence: Ich ___ aus Äthiopien.", options: ["komme", "kommt", "kommen", "kommst"], answer: 0 },
  { question: "Complete: Ich habe ___ Apfel.", options: ["einen", "ein", "eine", "eines"], answer: 0 },
  { question: "What does “die Rechnung” mean?", options: ["The bill", "The recipe", "The journey", "The letter"], answer: 0 },
  { question: "Choose the correct past tense: Ich ___ gestern ins Kino.", options: ["bin gegangen", "habe gegangen", "bin gegeht", "habe gegeht"], answer: 0 },
];

const KINDS = ["video", "vocabulary", "grammar", "listening", "exercise", "reading", "writing"];

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function lessonBody(courseTitle: string, title: string, index: number) {
  const exercise = EXERCISES[index % EXERCISES.length];
  return {
    text: `In this lesson you work on ${title.toLowerCase()} as part of ${courseTitle}. You will see the language in context first, then repeat short phrases aloud, and finally check your understanding with a quick exercise.\n\nKey pattern: Hören Sie zu, sprechen Sie nach, und wiederholen Sie jeden Tag. Small daily repetitions build the confidence you need for real conversations.`,
    exercise,
  };
}

async function insertUser(
  db: Db,
  opts: { email: string; password: string; name: string; level?: string; createdAt?: string; role?: string; onboarding?: boolean; goal?: string; minutes?: number },
) {
  const id = uid("usr");
  const createdAt = opts.createdAt ?? new Date().toISOString();
  await db.query(
    "INSERT INTO users(id,email,password_hash,created_at) VALUES($1,$2,$3,$4)",
    [id, opts.email.toLowerCase(), bcrypt.hashSync(opts.password, 10), createdAt],
  );
  await db.query(
    `INSERT INTO profiles(id,email,full_name,current_level,learning_goal,daily_goal_minutes,onboarding_completed,preferences,created_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, opts.email.toLowerCase(), opts.name, opts.level ?? "A1", opts.goal ?? "Start learning German", opts.minutes ?? 15, opts.onboarding ?? true, JSON.stringify({ interests: ["Speaking", "Grammar"] }), createdAt],
  );
  if (opts.role) {
    await db.query("INSERT INTO user_roles(id,user_id,role) VALUES($1,$2,$3)", [uid("rol"), id, opts.role]);
  }
  return id;
}

export async function seedDatabase(db: Db) {
  const existing = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM courses");
  if ((existing[0]?.n ?? 0) > 0) return;

  console.log("[seed] creating demo content…");
  const adminId = await insertUser(db, {
    email: "admin@germaninminutes.com",
    password: "Admin123!",
    name: "Amara Admin",
    level: "C1",
    role: "super_admin",
    goal: "Run the platform",
  });
  const studentId = await insertUser(db, {
    email: "student@germaninminutes.com",
    password: "Student123!",
    name: "Lina Bekele",
    level: "A2",
    goal: "Pass a Goethe exam",
    minutes: 20,
    createdAt: daysAgo(34),
  });

  const courseIds: string[] = [];
  const lessonsByCourse: { courseId: string; lessonIds: string[] }[] = [];

  for (let c = 0; c < COURSES.length; c++) {
    const course = COURSES[c]!;
    const courseId = uid("crs");
    courseIds.push(courseId);
    await db.query(
      `INSERT INTO courses(id,slug,level,title,description,cover_url,price_eur,status,estimated_weeks,featured,created_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,'published',$8,$9,$10)`,
      [courseId, course.slug, course.level, course.title, course.description, IMAGES[c % IMAGES.length], course.price, course.weeks, !!course.featured, daysAgo(60 - c * 4)],
    );

    const lessonIds: string[] = [];
    let lessonNumber = 0;
    for (let m = 0; m < course.modules.length; m++) {
      const mod = course.modules[m]!;
      const moduleId = uid("mod");
      await db.query(
        "INSERT INTO course_modules(id,course_id,title,description,position,status) VALUES($1,$2,$3,$4,$5,'published')",
        [moduleId, courseId, mod.title, `Module ${m + 1} of ${course.title}: build the language you need for ${mod.title.toLowerCase()}.`, m + 1],
      );
      for (let l = 0; l < mod.lessons.length; l++) {
        const title = mod.lessons[l]!;
        const lessonId = uid("les");
        lessonIds.push(lessonId);
        const isFinal = c !== -1 && m === course.modules.length - 1 && l === mod.lessons.length - 1;
        const kind = isFinal ? "quiz" : KINDS[lessonNumber % KINDS.length]!;
        await db.query(
          `INSERT INTO lessons(id,module_id,title,summary,kind,position,duration_minutes,body,status)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,'published')`,
          [
            lessonId,
            moduleId,
            title,
            `Practise ${title.toLowerCase()} with short explanations, examples and a quick check.`,
            kind,
            l + 1,
            8 + (lessonNumber % 5) * 2,
            JSON.stringify(lessonBody(course.title, title, lessonNumber)),
          ],
        );
        lessonNumber++;

        if (isFinal) {
          const quizId = uid("qiz");
          await db.query(
            "INSERT INTO quizzes(id,lesson_id,title,passing_score,time_limit_minutes,attempts_allowed,status) VALUES($1,$2,$3,70,10,3,'published')",
            [quizId, lessonId, `${course.title} — final assessment`],
          );
          const questions = [
            { prompt: "Which sentence uses the correct word order?", options: ["Heute gehe ich nach Hause.", "Heute ich gehe nach Hause.", "Ich heute gehe nach Hause.", "Gehe heute ich nach Hause."] },
            { prompt: "Choose the correct plural of “das Buch”.", options: ["die Bücher", "die Buchs", "die Bucher", "die Büchen"] },
            { prompt: "What is the best response to “Wie geht es Ihnen?”", options: ["Danke, gut. Und Ihnen?", "Ich heiße Anna.", "Das ist ein Tisch.", "Morgen um acht."] },
          ];
          for (let q = 0; q < questions.length; q++) {
            const question = questions[q]!;
            const questionId = uid("qq");
            await db.query(
              "INSERT INTO quiz_questions(id,quiz_id,prompt,position,points) VALUES($1,$2,$3,$4,1)",
              [questionId, quizId, question.prompt, q + 1],
            );
            for (let o = 0; o < question.options.length; o++) {
              await db.query(
                "INSERT INTO quiz_options(id,question_id,label,is_correct,position) VALUES($1,$2,$3,$4,$5)",
                [uid("qo"), questionId, question.options[o], o === 0, o + 1],
              );
            }
          }
        }
      }
    }
    lessonsByCourse.push({ courseId, lessonIds });
  }

  // Demo learner: one course in progress, one completed with a certificate.
  const inProgress = lessonsByCourse[0]!;
  const finished = lessonsByCourse[5] ?? lessonsByCourse[0]!;
  await db.query(
    "INSERT INTO enrollments(id,user_id,course_id,enrolled_at,progress_percent,last_lesson_id) VALUES($1,$2,$3,$4,33,$5)",
    [uid("enr"), studentId, inProgress.courseId, daysAgo(18), inProgress.lessonIds[3]],
  );
  for (const lessonId of inProgress.lessonIds.slice(0, 4)) {
    await db.query(
      "INSERT INTO lesson_progress(id,user_id,lesson_id,completed,completed_at) VALUES($1,$2,$3,true,$4)",
      [uid("prg"), studentId, lessonId, daysAgo(8)],
    );
  }
  await db.query(
    "INSERT INTO enrollments(id,user_id,course_id,enrolled_at,completed_at,progress_percent,last_lesson_id) VALUES($1,$2,$3,$4,$4,100,$5)",
    [uid("enr"), studentId, finished.courseId, daysAgo(40), finished.lessonIds.at(-1)!],
  );
  for (const lessonId of finished.lessonIds) {
    await db.query(
      "INSERT INTO lesson_progress(id,user_id,lesson_id,completed,completed_at) VALUES($1,$2,$3,true,$4)",
      [uid("prg"), studentId, lessonId, daysAgo(6)],
    );
  }

  const finishedCourse = await db.query<{ title: string }>("SELECT title FROM courses WHERE id=$1", [finished.courseId]);
  const certId = uid("cert");
  await db.query(
    "INSERT INTO certificates(id,user_id,course_id,certificate_number,issued_at) VALUES($1,$2,$3,$4,$5)",
    [certId, studentId, finished.courseId, "GIM-2026-000184", daysAgo(5)],
  );
  await db.query(
    "INSERT INTO orders(id,user_id,course_id,amount,currency,status,provider,provider_reference,created_at) VALUES($1,$2,$3,59,'USD','paid','stripe_test',$4,$5)",
    [uid("ord"), studentId, finished.courseId, "TEST-A1B2C3", daysAgo(40)],
  );
  await db.query(
    "INSERT INTO orders(id,user_id,course_id,amount,currency,status,provider,provider_reference,created_at) VALUES($1,$2,$3,29,'USD','paid','stripe_test',$4,$5)",
    [uid("ord"), studentId, inProgress.courseId, "TEST-D4E5F6", daysAgo(18)],
  );
  await db.query(
    "INSERT INTO notifications(id,user_id,title,message,kind,created_at) VALUES($1,$2,$3,$4,'certificate',$5)",
    [uid("ntf"), studentId, "Certificate issued", `Your certificate for ${finishedCourse[0]?.title ?? "your course"} is ready to download.`, daysAgo(5)],
  );
  await db.query(
    "INSERT INTO notifications(id,user_id,title,message,kind,created_at) VALUES($1,$2,$3,$4,'order',$5)",
    [uid("ntf"), studentId, "Payment receipt", "Your last payment was confirmed. You can download the receipt from Personal settings.", daysAgo(18)],
  );

  const extraNames = [
    ["Jonas Weber", "jonas@example.com", "A1"],
    ["Sofia Rossi", "sofia@example.com", "A2"],
    ["Ahmed Hassan", "ahmed@example.com", "B1"],
    ["Mei Chen", "mei@example.com", "B2"],
    ["Priya Sharma", "priya@example.com", "A1"],
    ["Lucas Silva", "lucas@example.com", "B1"],
    ["Fatima Noor", "fatima@example.com", "C1"],
    ["Daniel Kim", "daniel@example.com", "A2"],
  ];
  for (let i = 0; i < extraNames.length; i++) {
    const [name, email, level] = extraNames[i]!;
    const id = await insertUser(db, {
      email: email!,
      password: "Student123!",
      name: name!,
      level: level!,
      createdAt: daysAgo(1 + i * 3),
    });
    const courseId = courseIds[i % courseIds.length]!;
    await db.query(
      "INSERT INTO orders(id,user_id,course_id,amount,currency,status,provider,provider_reference,created_at) VALUES($1,$2,$3,$4,'USD','paid','paypal_test',$5,$6)",
      [uid("ord"), id, courseId, [29, 34, 39, 49, 45, 59][i % 6], `TEST-X${100 + i}`, daysAgo(1 + i * 2)],
    );
    await db.query(
      "INSERT INTO enrollments(id,user_id,course_id,enrolled_at,progress_percent) VALUES($1,$2,$3,$4,$5)",
      [uid("enr"), id, courseId, daysAgo(1 + i * 2), 10 + i * 7],
    );
  }

  await db.query(
    "INSERT INTO support_tickets(id,user_id,subject,message,category,status,created_at) VALUES($1,$2,$3,$4,$5,'open',$6)",
    [uid("tkt"), studentId, "Certificate name spelling", "My certificate shows my first name only. Can it include my full name?", "Certificates", daysAgo(2)],
  );
  await db.query(
    "INSERT INTO support_tickets(id,user_id,subject,message,category,status,created_at) VALUES($1,$2,$3,$4,$5,'resolved',$6)",
    [uid("tkt"), studentId, "Invoice request", "Could I get a receipt with my company name?", "Billing", daysAgo(12)],
  );

  const pdfs = [
    ["German Grammar Starter Pack", "Articles, cases and word order explained with examples and quick practice.", "Grammar", "/images/learning-banner.jpg"],
    ["A1–A2 Vocabulary Essentials", "The 500 words that cover the majority of everyday German conversation.", "Vocabulary", "/images/study-group.jpg"],
    ["Goethe B1 Speaking Guide", "Presentation phrases, discussion strategies and a full mock speaking plan.", "Exam prep", "/images/business-hero.jpg"],
    ["Daily German Phrase Book", "Morning-to-night phrases for work, travel, shopping and small talk.", "Everyday German", "/images/educators-hero.jpg"],
  ];
  for (const [name, description, tag, cover] of pdfs) {
    await db.query(
      "INSERT INTO pdf_resources(id,name,description,tag,file_path,cover_path,status,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,'published',$7,$8)",
      [uid("pdf"), name, description, tag, `seed/${String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`, cover, adminId, daysAgo(20)],
    );
  }

  await db.query("INSERT INTO site_settings(key,value) VALUES($1,$2::jsonb)", [
    "public_site_content",
    JSON.stringify(defaultSiteContent),
  ]);
  await db.query("INSERT INTO site_settings(key,value) VALUES($1,$2::jsonb)", [
    "contact",
    JSON.stringify({
      supportEmail: "support@germaninminute.com",
      phone: "+251 911 000 000",
      hours: "Monday–Friday, 09:00–18:00 EAT",
      address: "Meganagna Siti Mall, 5th Floor, Addis Ababa, Ethiopia",
    }),
  ]);

  await db.query(
    "INSERT INTO newsletter_subscribers(id,email,created_at) VALUES($1,$2,$3)",
    [uid("nws"), "hello@example.com", daysAgo(4)],
  );
  await db.query(
    "INSERT INTO contact_messages(id,name,email,message,created_at) VALUES($1,$2,$3,$4,$5)",
    [uid("msg"), "Elena Petrova", "elena@example.com", "Do you offer group rates for a team of 12?", daysAgo(3)],
  );
  await db.query(
    "INSERT INTO audit_logs(id,actor_id,action,entity_type,entity_id,details,created_at) VALUES($1,$2,'seeded','platform',NULL,$3,$4)",
    [uid("aud"), adminId, JSON.stringify({ courses: COURSES.length }), daysAgo(1)],
  );
  await db.query(
    "INSERT INTO login_events(id,user_id,email,user_agent,created_at) VALUES($1,$2,$3,$4,$5)",
    [uid("lgn"), adminId, "admin@germaninminutes.com", "Chrome · Windows", daysAgo(0.5)],
  );
  await db.query(
    "INSERT INTO login_events(id,user_id,email,user_agent,created_at) VALUES($1,$2,$3,$4,$5)",
    [uid("lgn"), studentId, "student@germaninminutes.com", "Safari · macOS", daysAgo(2)],
  );

  console.log("[seed] done");
}
