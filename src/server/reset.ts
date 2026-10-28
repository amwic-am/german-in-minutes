import fs from "node:fs";
import path from "node:path";

if (process.env.DATABASE_URL) {
  console.log("[db] DATABASE_URL is set. Drop and recreate the schema in that database manually, then restart.");
  process.exit(0);
}

const dataDir = path.resolve(process.cwd(), ".data", "pglite");
fs.rmSync(dataDir, { recursive: true, force: true });
console.log("[db] local PGlite data cleared. Restart the server to recreate and seed the demo content.");
