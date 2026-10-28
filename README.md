# German In Minutes

A full German-learning platform: public marketing site, student LMS (courses, lessons, exercises, quizzes, progress, certificates, checkout) and an admin portal (catalog authoring, students and roles, orders, support, PDF library, site content, broadcasts, audit log).

## Stack

- **Frontend** — React 19 + TypeScript, React Router 7, TanStack Query 5, Tailwind CSS 4, lucide icons, recharts, sonner
- **Backend** — Node.js + Express 4, TypeScript (run with `tsx`)
- **Database** — SQL: PostgreSQL via `pg`, or embedded **PGlite** when `DATABASE_URL` is not set (data lives in `.data/pglite`)
- **Auth** — bcrypt password hashing, database-backed sessions in an HttpOnly `gim_session` cookie, role-based access (`student`, `instructor`, `content_manager`, `support`, `admin`, `super_admin`)

## Requirements

- Node.js 20+ (developed on Node 24)
- npm
- Optional: a PostgreSQL 14+ instance; otherwise PGlite is used automatically

## Setup

```bash
npm install
cp .env.example .env   # optional; sensible defaults are built in
npm run dev            # API on http://localhost:4000, web app on http://localhost:5173
```

Open http://localhost:5173. On first start the API creates the schema and seeds the demo catalog and accounts.

### Environment

| Variable        | Purpose                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `PORT`          | API port, default `4000`                                                |
| `DATABASE_URL`  | PostgreSQL connection string; when unset the embedded PGlite DB is used |
| `COOKIE_SECURE` | Set to `1` behind HTTPS so the session cookie is marked `Secure`         |
| `APP_URL`       | Public site URL used in password-reset links and the sitemap            |

The Vite dev server proxies `/api` and `/uploads` to the API, so both run from one origin.

### Scripts

| Command           | What it does                                              |
| ----------------- | --------------------------------------------------------- |
| `npm run dev`     | API + Vite dev server concurrently                        |
| `npm run dev:api` | API only (watches `src/server`)                           |
| `npm run dev:web` | Vite only                                                 |
| `npm run build`   | Production client build into `dist/client`                |
| `npm start`       | Express server; with `NODE_ENV=production` it also serves `dist/client` and SPA routes |
| `npm run typecheck` | TypeScript check with no emit                           |
| `npm run db:reset` | Drop, recreate and reseed the database (destructive)     |

Production example:

```bash
npm run build
NODE_ENV=production npm start   # serves the API and the built SPA on :4000
```

## Demo accounts

| Role          | Email                          | Password     |
| ------------- | ------------------------------ | ------------ |
| Super admin   | `admin@germaninminutes.com`    | `Admin123!`  |
| Student       | `student@germaninminutes.com`  | `Student123!` |

The student account (Lina Bekele, level A2) is seeded with enrollments and progress; the demo catalog contains A1–C1 courses, practice drills, blog posts, FAQs, Goethe exam pages and downloadable PDFs.

## Checkout

Payments are simulated with two built-in test providers — **Card (test)** (`stripe_test`) and **PayPal (test)** (`paypal_test`) — so no external keys or card details are needed. Use `/checkout?course=<slug-or-id>` (or the Buy button on a course page), pick a provider and approve. No real money moves. Completed orders unlock the course immediately and produce downloadable receipts (`/api/orders/:id/receipt`) and, once a course is finished, certificates (`/api/certificates/:id/pdf`).

## Project layout

```
src/
  client/                 React SPA
    pages/                public site, auth, student LMS, admin portal pages
    components/           shared UI (header, footer, admin shell, primitives)
    lib/                  API client, auth context, formatting helpers, types
    hooks/                query and UI hooks
  server/
    index.ts              Express bootstrap, security headers, static SPA serving
    routes/               auth, public, student, admin routers
    db.ts                 pg / PGlite adapter
    schema.sql            tables, indexes, constraints
    seed.ts               demo catalog, content and accounts
    auth.ts, service.ts   sessions, guards, shared helpers
    pdf.ts                receipt and certificate PDF generation
  shared/                 types shared by client and server
```

## Notes

- Mutating `/api` requests are rejected unless they are same-origin (CSRF guard).
- Admin actions are permission-gated (`requireStaff`, `requireSuperAdmin`) and written to the audit log; the last super admin cannot be demoted or removed.
- PDF uploads accept PDFs up to 25 MB with an optional cover image.
- `/sitemap.xml` is generated from published courses.
