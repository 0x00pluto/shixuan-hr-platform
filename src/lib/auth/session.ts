import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { Role } from "@/lib/constants/roles";

const SESSION_COOKIE = "sx_session";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  jobPositionId: string | null;
};

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function verifySession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    departmentId: user.departmentId,
    jobPositionId: user.jobPositionId,
  };
}

export async function requireSession(): Promise<SessionUser> {
  const session = await verifySession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
