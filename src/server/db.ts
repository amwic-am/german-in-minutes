import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { seedDatabase } from "./seed.js";

export type Row = Record<string, unknown>;

export interface Db {
  driver: "pglite" | "postgres";
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(process.cwd(), ".data");
const pgliteDir = path.join(dataDir, "pglite");

let db: Db | null = null;
let ready: Promise<Db> | null = null;

function normalize<T>(rows: T[]): T[] {
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const copy: Record<string, unknown> = { ...(row as Record<string, unknown>) };
    for (const [key, value] of Object.entries(copy)) {
      if (value instanceof Date) copy[key] = value.toISOString();
    }
    return copy as T;
  });
}

function createPglite(): Db {
  fs.mkdirSync(dataDir, { recursive: true });
  const lite = new PGlite(pgliteDir);
  return {
    driver: "pglite",
    async query<T = Row>(sql: string, params: unknown[] = []) {
      const result = await lite.query<T>(sql, params as never[]);
      return normalize(result.rows as T[]);
    },
    async exec(sql: string) {
      await lite.exec(sql);
    },
    async close() {
      await lite.close();
    },
  };
}

function createPostgres(url: string): Db {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  return {
    driver: "postgres",
    async query<T = Row>(sql: string, params: unknown[] = []) {
      const result = await pool.query(sql, params);
      return normalize(result.rows as T[]);
    },
    async exec(sql: string) {
      await pool.query(sql);
    },
    async close() {
      await pool.end();
    },
  };
}

export async function getDb(): Promise<Db> {
  if (db) return db;
  if (ready) return ready;
  ready = (async () => {
    db = process.env.DATABASE_URL ? createPostgres(process.env.DATABASE_URL) : createPglite();
    const schema = fs.readFileSync(path.join(here, "schema.sql"), "utf8");
    await db.exec(schema);
    await seedDatabase(db);
    console.log(`[db] ready (${db.driver})`);
    return db;
  })();
  return ready;
}

export function uid(prefix = "id") {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function one<T = Row>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await (await getDb()).query<T>(sql, params);
  return rows[0] ?? null;
}

export async function many<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await getDb()).query<T>(sql, params);
}
