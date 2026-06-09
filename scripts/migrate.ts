import "dotenv/config";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const url = process.env.TURSO_DATABASE_URL ?? "file:local.db";
const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});
const db = drizzle(client);

async function main() {
  console.log(`Applying migrations to ${url}...`);
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  console.log("Migrations applied successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
