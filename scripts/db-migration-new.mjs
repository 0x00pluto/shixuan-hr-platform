#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(repoRoot, "supabase", "migrations");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function utcMigrationStamp() {
  const d = new Date();
  return (
    `${d.getUTCFullYear()}` +
    pad2(d.getUTCMonth() + 1) +
    pad2(d.getUTCDate()) +
    pad2(d.getUTCHours()) +
    pad2(d.getUTCMinutes()) +
    pad2(d.getUTCSeconds())
  );
}

function sanitizeMigrationName(raw) {
  return raw
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

const rawName = process.argv.slice(2).join("_").trim();
if (!rawName) {
  console.error("用法: pnpm db:migration:new -- <migration_name>");
  process.exit(1);
}

const safeName = sanitizeMigrationName(rawName);
const stamp = utcMigrationStamp();
const fileName = `${stamp}_${safeName}.sql`;
const filePath = path.join(migrationsDir, fileName);

fs.mkdirSync(migrationsDir, { recursive: true });
fs.writeFileSync(filePath, `-- ${safeName}\n`, "utf8");
console.log(`已创建: supabase/migrations/${fileName}`);
