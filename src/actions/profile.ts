"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getJob } from "./jobs";
import { getSanJiangMingbai, listPerformanceReviews } from "./performance";
import { getSalaryProfile } from "./salary";

export async function getProfileData() {
  const session = await requireSession();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);
  if (!user) throw new Error("用户不存在");

  const job = user.jobPositionId ? await getJob(user.jobPositionId) : null;

  let primaryOwner: { id: string; name: string } | null = null;
  let checker: { id: string; name: string } | null = null;
  if (job) {
    const [owner] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, job.primaryOwnerId))
      .limit(1);
    const [chk] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, job.checkerId))
      .limit(1);
    primaryOwner = owner ?? null;
    checker = chk ?? null;
  }

  const reviews = await listPerformanceReviews(session.id);

  let salary = null;
  try {
    salary = await getSalaryProfile(session.id);
  } catch {
    salary = null;
  }

  const sanJiang = await getSanJiangMingbai({ userId: session.id });

  return {
    user,
    job,
    primaryOwner,
    checker,
    reviews,
    salary,
    sanJiang,
  };
}
