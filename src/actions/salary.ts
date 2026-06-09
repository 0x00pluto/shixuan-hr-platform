"use server";

import { refresh } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  salaryProfiles,
  salaryStatusHistory,
  salaryAuditSubmissions,
  users,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import {
  canViewSalary,
  canAuditSalary,
  hasRole,
} from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { reqFormId } from "@/lib/form-data";
import { nowIso } from "@/lib/utils/time";

export type CreateSalaryProfileInput = {
  userId: string;
  baseSalary: number;
  salaryRatio?: number;
  status?: "training" | "regular";
  structureJson?: Record<string, unknown>;
};

export async function createSalaryProfile(input: CreateSalaryProfileInput) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "ops_manager")) throw new Error("FORBIDDEN");

  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!targetUser) throw new Error("用户不存在");

  const now = nowIso();
  const id = uuidv4();
  const status = input.status ?? "training";
  const ratio = input.salaryRatio ?? (status === "training" ? 0.8 : 1);

  await db.insert(salaryProfiles).values({
    id,
    userId: input.userId,
    baseSalary: input.baseSalary,
    salaryRatio: ratio,
    status,
    structureJson: input.structureJson
      ? JSON.stringify(input.structureJson)
      : null,
    auditStatus: "draft",
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(salaryStatusHistory).values({
    id: uuidv4(),
    salaryProfileId: id,
    fromStatus: null,
    toStatus: status,
    fromRatio: null,
    toRatio: ratio,
    changedById: session.id,
    reason: "初始创建",
    createdAt: now,
  });

  await logAudit({
    entityType: "salary_profile",
    entityId: id,
    action: "create",
    actorId: session.id,
    payload: { userId: input.userId, status },
  });

  refresh();
  return { id };
}

export async function updateSalaryProfile(
  id: string,
  input: {
    baseSalary?: number;
    salaryRatio?: number;
    structureJson?: Record<string, unknown>;
  }
) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "ops_manager")) throw new Error("FORBIDDEN");

  const [profile] = await db
    .select()
    .from(salaryProfiles)
    .where(eq(salaryProfiles.id, id))
    .limit(1);
  if (!profile) throw new Error("薪酬档案不存在");

  const now = nowIso();
  await db
    .update(salaryProfiles)
    .set({
      ...(input.baseSalary !== undefined && { baseSalary: input.baseSalary }),
      ...(input.salaryRatio !== undefined && {
        salaryRatio: input.salaryRatio,
      }),
      ...(input.structureJson !== undefined && {
        structureJson: JSON.stringify(input.structureJson),
      }),
      updatedAt: now,
    })
    .where(eq(salaryProfiles.id, id));

  await logAudit({
    entityType: "salary_profile",
    entityId: id,
    action: "update",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { success: true };
}

export async function getSalaryProfile(userId: string) {
  const session = await requireSession();

  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!targetUser) throw new Error("用户不存在");

  if (
    !canViewSalary(session, {
      userId,
      departmentId: targetUser.departmentId,
    })
  ) {
    throw new Error("FORBIDDEN");
  }

  const [profile] = await db
    .select()
    .from(salaryProfiles)
    .where(eq(salaryProfiles.userId, userId))
    .limit(1);
  if (!profile) return null;

  const history = await db
    .select()
    .from(salaryStatusHistory)
    .where(eq(salaryStatusHistory.salaryProfileId, profile.id))
    .orderBy(desc(salaryStatusHistory.createdAt));

  const audits = await db
    .select()
    .from(salaryAuditSubmissions)
    .where(eq(salaryAuditSubmissions.salaryProfileId, profile.id))
    .orderBy(desc(salaryAuditSubmissions.createdAt));

  return {
    ...profile,
    structure: profile.structureJson
      ? JSON.parse(profile.structureJson)
      : null,
    history,
    audits,
  };
}

export async function listSalaryProfiles() {
  const session = await requireSession();

  const profiles = await db.select().from(salaryProfiles);
  const allUsers = await db.select().from(users);

  const enriched = profiles.map((p) => {
    const user = allUsers.find((u) => u.id === p.userId);
    return { ...p, userName: user?.name, departmentId: user?.departmentId };
  });

  if (hasRole(session, "ceo", "ops_manager", "hr")) {
    return enriched;
  }

  if (hasRole(session, "dept_leader") && session.departmentId) {
    return enriched.filter((p) => p.departmentId === session.departmentId);
  }

  if (hasRole(session, "employee", "newcomer")) {
    return enriched.filter((p) => p.userId === session.id);
  }

  return [];
}

export async function setSalaryStatus(
  profileId: string,
  status: "training" | "regular",
  reason?: string
) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "ops_manager", "ceo")) throw new Error("FORBIDDEN");

  const [profile] = await db
    .select()
    .from(salaryProfiles)
    .where(eq(salaryProfiles.id, profileId))
    .limit(1);
  if (!profile) throw new Error("薪酬档案不存在");

  const now = nowIso();
  const newRatio = status === "regular" ? 1 : 0.8;

  await db
    .update(salaryProfiles)
    .set({ status, salaryRatio: newRatio, updatedAt: now })
    .where(eq(salaryProfiles.id, profileId));

  await db.insert(salaryStatusHistory).values({
    id: uuidv4(),
    salaryProfileId: profileId,
    fromStatus: profile.status,
    toStatus: status,
    fromRatio: profile.salaryRatio,
    toRatio: newRatio,
    changedById: session.id,
    reason: reason ?? `状态变更为 ${status}`,
    createdAt: now,
  });

  await logAudit({
    entityType: "salary_profile",
    entityId: profileId,
    action: "status_change",
    actorId: session.id,
    payload: { from: profile.status, to: status },
  });

  refresh();
  return { success: true };
}

export async function submitSalaryAudit(profileId: string) {
  const session = await requireSession();
  if (!hasRole(session, "hr")) throw new Error("FORBIDDEN");

  const [profile] = await db
    .select()
    .from(salaryProfiles)
    .where(eq(salaryProfiles.id, profileId))
    .limit(1);
  if (!profile) throw new Error("薪酬档案不存在");

  const now = nowIso();
  const id = uuidv4();

  await db.insert(salaryAuditSubmissions).values({
    id,
    salaryProfileId: profileId,
    submittedById: session.id,
    status: "pending",
    createdAt: now,
  });

  await db
    .update(salaryProfiles)
    .set({ auditStatus: "pending", updatedAt: now })
    .where(eq(salaryProfiles.id, profileId));

  await logAudit({
    entityType: "salary_audit",
    entityId: id,
    action: "submit",
    actorId: session.id,
    payload: { profileId },
  });

  refresh();
  return { id };
}

export async function reviewSalaryAudit(input: {
  submissionId: string;
  approved: boolean;
  reviewNote?: string;
}) {
  const session = await requireSession();
  if (!canAuditSalary(session)) throw new Error("FORBIDDEN");

  const [submission] = await db
    .select()
    .from(salaryAuditSubmissions)
    .where(eq(salaryAuditSubmissions.id, input.submissionId))
    .limit(1);
  if (!submission) throw new Error("审核记录不存在");
  if (submission.status !== "pending") throw new Error("该审核已处理");

  const now = nowIso();
  const newStatus = input.approved ? "approved" : "rejected";

  await db
    .update(salaryAuditSubmissions)
    .set({
      status: newStatus,
      reviewerId: session.id,
      reviewNote: input.reviewNote ?? null,
      reviewedAt: now,
    })
    .where(eq(salaryAuditSubmissions.id, input.submissionId));

  await db
    .update(salaryProfiles)
    .set({ auditStatus: newStatus, updatedAt: now })
    .where(eq(salaryProfiles.id, submission.salaryProfileId));

  await logAudit({
    entityType: "salary_audit",
    entityId: input.submissionId,
    action: input.approved ? "approve" : "reject",
    actorId: session.id,
    payload: { reviewNote: input.reviewNote },
  });

  refresh();
  return { status: newStatus };
}

export async function deleteSalaryProfile(id: string) {
  const session = await requireSession();
  if (!hasRole(session, "hr")) throw new Error("FORBIDDEN");

  await db
    .delete(salaryStatusHistory)
    .where(eq(salaryStatusHistory.salaryProfileId, id));
  await db
    .delete(salaryAuditSubmissions)
    .where(eq(salaryAuditSubmissions.salaryProfileId, id));
  await db.delete(salaryProfiles).where(eq(salaryProfiles.id, id));

  await logAudit({
    entityType: "salary_profile",
    entityId: id,
    action: "delete",
    actorId: session.id,
  });

  refresh();
  return { success: true };
}

export async function submitSalaryAuditForm(formData: FormData) {
  await submitSalaryAudit(reqFormId(formData, "profileId"));
}

export async function reviewSalaryAuditForm(formData: FormData) {
  await reviewSalaryAudit({
    submissionId: reqFormId(formData, "auditId"),
    approved: formData.get("approved") === "true",
    reviewNote: String(formData.get("reviewNote") ?? ""),
  });
}

export async function createSalaryProfileForm(formData: FormData) {
  await createSalaryProfile({
    userId: String(formData.get("userId") ?? ""),
    baseSalary: Number(formData.get("baseSalary") ?? 0),
    status: (String(formData.get("status") ?? "training") as "training" | "regular"),
    salaryRatio:
      String(formData.get("status") ?? "training") === "training" ? 0.8 : 1,
  });
}

export async function setSalaryStatusForm(formData: FormData) {
  const status = String(formData.get("status") ?? "training") as "training" | "regular";
  await setSalaryStatus(
    reqFormId(formData, "profileId"),
    status,
    String(formData.get("reason") ?? "")
  );
}
