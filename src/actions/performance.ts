"use server";

import { refresh, revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  performanceCapabilityStandards,
  performanceResultStandards,
  performanceReviews,
  careerPathDefinitions,
  sanJiangMingbai,
  jobKpiTemplates,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { canManagePerformance, hasRole } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { nowIso } from "@/lib/utils/time";

export async function createCapabilityStandard(input: {
  jobPositionId: string;
  title: string;
  criteria: string;
}) {
  const session = await requireSession();
  if (!canManagePerformance(session)) throw new Error("FORBIDDEN");

  const id = uuidv4();
  const now = nowIso();

  await db.insert(performanceCapabilityStandards).values({
    id,
    jobPositionId: input.jobPositionId,
    title: input.title,
    criteria: input.criteria,
    createdAt: now,
  });

  await logAudit({
    entityType: "performance_capability_standard",
    entityId: id,
    action: "create",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { id };
}

export async function updateCapabilityStandard(
  id: string,
  input: { title?: string; criteria?: string }
) {
  const session = await requireSession();
  if (!canManagePerformance(session)) throw new Error("FORBIDDEN");

  await db
    .update(performanceCapabilityStandards)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.criteria !== undefined && { criteria: input.criteria }),
    })
    .where(eq(performanceCapabilityStandards.id, id));

  await logAudit({
    entityType: "performance_capability_standard",
    entityId: id,
    action: "update",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { success: true };
}

export async function deleteCapabilityStandard(id: string) {
  const session = await requireSession();
  if (!canManagePerformance(session)) throw new Error("FORBIDDEN");

  await db
    .delete(performanceCapabilityStandards)
    .where(eq(performanceCapabilityStandards.id, id));

  await logAudit({
    entityType: "performance_capability_standard",
    entityId: id,
    action: "delete",
    actorId: session.id,
  });

  refresh();
  return { success: true };
}

export async function createResultStandard(input: {
  jobPositionId: string;
  metricName: string;
  targetValue: string;
  unit?: string;
}) {
  const session = await requireSession();
  if (!canManagePerformance(session)) throw new Error("FORBIDDEN");

  const id = uuidv4();
  const now = nowIso();

  await db.insert(performanceResultStandards).values({
    id,
    jobPositionId: input.jobPositionId,
    metricName: input.metricName,
    targetValue: input.targetValue,
    unit: input.unit ?? null,
    createdAt: now,
  });

  await logAudit({
    entityType: "performance_result_standard",
    entityId: id,
    action: "create",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { id };
}

export async function updateResultStandard(
  id: string,
  input: { metricName?: string; targetValue?: string; unit?: string }
) {
  const session = await requireSession();
  if (!canManagePerformance(session)) throw new Error("FORBIDDEN");

  await db
    .update(performanceResultStandards)
    .set({
      ...(input.metricName !== undefined && { metricName: input.metricName }),
      ...(input.targetValue !== undefined && {
        targetValue: input.targetValue,
      }),
      ...(input.unit !== undefined && { unit: input.unit }),
    })
    .where(eq(performanceResultStandards.id, id));

  await logAudit({
    entityType: "performance_result_standard",
    entityId: id,
    action: "update",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { success: true };
}

export async function deleteResultStandard(id: string) {
  const session = await requireSession();
  if (!canManagePerformance(session)) throw new Error("FORBIDDEN");

  await db
    .delete(performanceResultStandards)
    .where(eq(performanceResultStandards.id, id));

  await logAudit({
    entityType: "performance_result_standard",
    entityId: id,
    action: "delete",
    actorId: session.id,
  });

  refresh();
  return { success: true };
}

export async function getStandardsByJob(jobPositionId: string) {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr", "dept_leader", "employee")) {
    throw new Error("FORBIDDEN");
  }

  const capability = await db
    .select()
    .from(performanceCapabilityStandards)
    .where(eq(performanceCapabilityStandards.jobPositionId, jobPositionId));

  const result = await db
    .select()
    .from(performanceResultStandards)
    .where(eq(performanceResultStandards.jobPositionId, jobPositionId));

  return { capability, result };
}

export async function createPerformanceReview(input: {
  userId: string;
  reviewType: string;
  period: string;
  score?: number;
  conclusion?: string;
  feedback?: string;
  actualValue?: string;
}) {
  const session = await requireSession();
  if (!canManagePerformance(session)) throw new Error("FORBIDDEN");

  const id = uuidv4();
  const now = nowIso();

  await db.insert(performanceReviews).values({
    id,
    userId: input.userId,
    reviewerId: session.id,
    reviewType: input.reviewType,
    period: input.period,
    score: input.score ?? null,
    conclusion: input.conclusion ?? null,
    feedback: input.feedback ?? null,
    actualValue: input.actualValue ?? null,
    createdAt: now,
  });

  await logAudit({
    entityType: "performance_review",
    entityId: id,
    action: "create",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { id };
}

export async function listPerformanceReviews(userId?: string) {
  const session = await requireSession();

  const targetUserId = userId ?? session.id;
  const isSelf = targetUserId === session.id;
  const isManager = hasRole(session, "ceo", "ops_manager", "hr", "dept_leader");

  if (!isSelf && !isManager) throw new Error("FORBIDDEN");

  return db
    .select()
    .from(performanceReviews)
    .where(eq(performanceReviews.userId, targetUserId));
}

export async function upsertSanJiangMingbai(input: {
  userId?: string;
  jobPositionId?: string;
  rulesText: string;
  directionText: string;
  benefitText: string;
}) {
  const session = await requireSession();
  if (!canManagePerformance(session)) throw new Error("FORBIDDEN");

  const now = nowIso();
  const id = uuidv4();

  await db
    .update(sanJiangMingbai)
    .set({ isActive: false })
    .where(
      input.userId
        ? eq(sanJiangMingbai.userId, input.userId)
        : eq(sanJiangMingbai.jobPositionId, input.jobPositionId ?? "")
    );

  await db.insert(sanJiangMingbai).values({
    id,
    userId: input.userId ?? null,
    jobPositionId: input.jobPositionId ?? null,
    rulesText: input.rulesText,
    directionText: input.directionText,
    benefitText: input.benefitText,
    isActive: true,
    createdAt: now,
  });

  await logAudit({
    entityType: "san_jiang_mingbai",
    entityId: id,
    action: "upsert",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { id };
}

export async function getSanJiangMingbai(filters: {
  userId?: string;
  jobPositionId?: string;
}) {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr", "dept_leader", "employee", "newcomer")) {
    throw new Error("FORBIDDEN");
  }

  if (filters.userId) {
    const [row] = await db
      .select()
      .from(sanJiangMingbai)
      .where(eq(sanJiangMingbai.userId, filters.userId))
      .limit(1);
    return row ?? null;
  }

  if (filters.jobPositionId) {
    const [row] = await db
      .select()
      .from(sanJiangMingbai)
      .where(eq(sanJiangMingbai.jobPositionId, filters.jobPositionId))
      .limit(1);
    return row ?? null;
  }

  return null;
}

export async function createCareerPathLevel(input: {
  pathType: string;
  levelName: string;
  levelOrder: number;
  description?: string;
}) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "ceo")) throw new Error("FORBIDDEN");

  const id = uuidv4();
  const now = nowIso();

  await db.insert(careerPathDefinitions).values({
    id,
    pathType: input.pathType,
    levelName: input.levelName,
    levelOrder: input.levelOrder,
    description: input.description ?? null,
    createdAt: now,
  });

  await logAudit({
    entityType: "career_path",
    entityId: id,
    action: "create",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { id };
}

export async function listCareerPaths(pathType?: string) {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr", "dept_leader", "employee")) {
    throw new Error("FORBIDDEN");
  }

  const all = await db
    .select()
    .from(careerPathDefinitions)
    .orderBy(asc(careerPathDefinitions.levelOrder));

  return pathType ? all.filter((p) => p.pathType === pathType) : all;
}

export async function getPerformanceAnomalies(threshold = 70) {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr")) {
    throw new Error("FORBIDDEN");
  }

  const { users } = await import("@/db/schema");
  const reviews = await db.select().from(performanceReviews);
  const allUsers = await db.select().from(users);

  return reviews
    .filter((r) => r.score != null && r.score < threshold)
    .map((r) => {
      const user = allUsers.find((u) => u.id === r.userId);
      return {
        id: r.id,
        userId: r.userId,
        userName: user?.name ?? r.userId,
        departmentId: user?.departmentId ?? null,
        period: r.period,
        score: r.score,
        reviewType: r.reviewType,
        feedback: r.feedback,
      };
    })
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
}

export async function batchApplyKpiTemplates(input: {
  jobPositionIds: string[];
  templateId: string;
}) {
  const session = await requireSession();
  if (!hasRole(session, "hr")) throw new Error("FORBIDDEN");

  const [template] = await db
    .select()
    .from(jobKpiTemplates)
    .where(eq(jobKpiTemplates.id, input.templateId))
    .limit(1);
  if (!template) throw new Error("KPI 模板不存在");

  const metrics = JSON.parse(template.metricsJson) as unknown[];
  const now = nowIso();
  const created: string[] = [];

  for (const jobPositionId of input.jobPositionIds) {
    for (const metric of metrics as { name: string; target: string }[]) {
      const id = uuidv4();
      await db.insert(performanceResultStandards).values({
        id,
        jobPositionId,
        metricName: metric.name,
        targetValue: metric.target,
        unit: null,
        createdAt: now,
      });
      created.push(id);
    }
  }

  await logAudit({
    entityType: "job_kpi_template",
    entityId: input.templateId,
    action: "batch_apply",
    actorId: session.id,
    payload: { jobPositionIds: input.jobPositionIds, createdCount: created.length },
  });

  refresh();
  return { createdCount: created.length, standardIds: created };
}

export async function createPerformanceReviewForm(formData: FormData) {
  await createPerformanceReview({
    userId: String(formData.get("userId") ?? ""),
    reviewType: String(formData.get("reviewType") ?? "monthly"),
    period: String(formData.get("period") ?? ""),
    score: Number(formData.get("score") ?? 0) || undefined,
    feedback: String(formData.get("feedback") ?? ""),
  });
}

export async function createCapabilityStandardForm(formData: FormData) {
  await createCapabilityStandard({
    jobPositionId: String(formData.get("jobPositionId") ?? ""),
    title: String(formData.get("title") ?? ""),
    criteria: String(formData.get("criteria") ?? ""),
  });
}

export async function createResultStandardForm(formData: FormData) {
  await createResultStandard({
    jobPositionId: String(formData.get("jobPositionId") ?? ""),
    metricName: String(formData.get("metricName") ?? ""),
    targetValue: String(formData.get("targetValue") ?? ""),
    unit: String(formData.get("unit") ?? "") || undefined,
  });
}

export async function batchApplyKpiTemplatesForm(formData: FormData) {
  const jobIdsRaw = String(formData.get("jobPositionIds") ?? "");
  const jobPositionIds = jobIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (jobPositionIds.length === 0) throw new Error("请选择至少一个岗位");

  await batchApplyKpiTemplates({
    jobPositionIds,
    templateId: String(formData.get("templateId") ?? ""),
  });
  revalidatePath("/dashboard/performance");
  revalidatePath("/dashboard/jobs");
}
