"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, deleteSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "");

  const fail = (code: string) => {
    const params = new URLSearchParams({ error: code });
    if (from.startsWith("/") && !from.startsWith("//")) {
      params.set("from", from);
    }
    redirect(`/login?${params.toString()}`);
  };

  if (!email || !password) {
    fail("missing");
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user?.isActive || !user.passwordHash) {
    fail("invalid");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    fail("invalid");
  }

  await createSession(user.id);

  if (from.startsWith("/") && !from.startsWith("//")) {
    redirect(from);
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  await deleteSession();
}
