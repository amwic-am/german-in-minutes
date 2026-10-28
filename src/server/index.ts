import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import multer from "multer";
import { ZodError } from "zod";
import { attachUser, isSameOrigin } from "./auth.js";
import { getDb, many } from "./db.js";
import { apiRouter } from "./routes/index.js";
import { HttpError } from "./service.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
app.use(express.json({ limit: "3mb" }));
app.use(cookieParser());
app.use(attachUser);

app.use("/api", (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "Cross-site request blocked" });
    return;
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, driver: process.env.DATABASE_URL ? "postgres" : "pglite" });
});

app.use("/api", apiRouter);

app.use("/uploads/covers", express.static(path.resolve(process.cwd(), ".data", "uploads", "covers"), { maxAge: "7d" }));

app.get("/sitemap.xml", async (_req, res, next) => {
  try {
    const courses = await many<{ slug: string }>("SELECT slug FROM courses WHERE status='published' ORDER BY slug");
    const base = (process.env.APP_URL ?? `http://localhost:${PORT}`).replace(/\/$/, "");
    const staticPaths = ["/", "/courses", "/levels", "/pricing", "/about", "/contact", "/blog", "/faq", "/pdfs", "/goethe", "/login", "/register"];
    const urls = [...staticPaths, ...courses.map((course) => `/courses/${course.slug}`)]
      .map((route) => `  <url><loc>${base}${route}</loc></url>`)
      .join("\n");
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
  } catch (error) {
    next(error);
  }
});

const clientDir = path.resolve(root, "dist/client");
if (process.env.NODE_ENV === "production" && fs.existsSync(clientDir)) {
  app.use(express.static(clientDir, { maxAge: "1h", index: false }));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
  });
}

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof ZodError) {
    const first = error.errors[0];
    res.status(400).json({ error: first?.message ?? "Check the form and try again", issues: error.errors });
    return;
  }
  if (error instanceof multer.MulterError) {
    res.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "That file is too large (25 MB maximum)" : error.message });
    return;
  }
  if (error instanceof Error && /PDF file|Cover must be an image/.test(error.message)) {
    res.status(400).json({ error: error.message });
    return;
  }
  console.error("[api] unhandled error", error);
  res.status(500).json({ error: "Something went wrong. Try again." });
});

await getDb();
app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
  console.log("[api] demo admin   admin@germaninminutes.com / Admin123!");
  console.log("[api] demo student student@germaninminutes.com / Student123!");
});
