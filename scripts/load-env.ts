import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
for (const file of [".env", ".env.local"]) {
  const path = resolve(root, file);
  if (existsSync(path)) dotenv.config({ path });
}
