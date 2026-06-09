"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db";
import {
  departments,
  jobKpiTemplates,
  jobPositionTemplates,
  jobPositions,
  performanceResultStandards,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import {
  canManageJobs,
  canViewAllDepartments,
  hasRole,
} from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { reqFormId } from "@/lib/form-data";
import { nowIso } from "@/lib/utils/time";

export async function getJobs() {
  const session = await requireSession();
  const all = await db
    .select()
    .from(jobPositions)
    .orderBy(jobPositions.updatedAt);
  if (canViewAllDepartments(session)) return all;
  if (session.departmentId) {
    return all.filter((j) => j.departmentId === session.departmentId);
  }
  return all;
}

export async function getJob(id: string) {
  await requireSession();
  const [job] = await db
    .select()
    .from(jobPositions)
    .where(eq(jobPositions.id, id))
    .limit(1);
  return job ?? null;
}

export async function getJobKpiTemplates() {
  await requireSession();
  return db.select().from(jobKpiTemplates);
}

export async function createJob(formData: FormData) {
  const session = await requireSession();
  if (!canManageJobs(session)) throw new Error("无权限");

  const id = uuidv4();
  const now = nowIso();
  const collaboratorRaw = String(formData.get("collaboratorIds") ?? "");
  const collaboratorIds = collaboratorRaw
    ? collaboratorRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(",")
    : null;

  await db.insert(jobPositions).values({
    id,
    title: String(formData.get("title") ?? ""),
    departmentId: String(formData.get("departmentId") ?? ""),
    expectedResult: String(formData.get("expectedResult") ?? ""),
    primaryOwnerId: String(formData.get("primaryOwnerId") ?? session.id),
    collaboratorIds,
    completionStandard: String(formData.get("completionStandard") ?? ""),
    checkerId: String(formData.get("checkerId") ?? session.id),
    status: "draft",
    isQuantifiable: true,
    createdAt: now,
    updatedAt: now,
  });
  await logAudit({
    entityType: "job_position",
    entityId: id,
    action: "create",
    actorId: session.id,
  });
  revalidatePath("/dashboard/jobs");
  return id;
}

export async function updateJob(id: string, formData: FormData) {
  const session = await requireSession();
  if (!canManageJobs(session)) throw new Error("无权限");

  const collaboratorRaw = String(formData.get("collaboratorIds") ?? "");
  const collaboratorIds = collaboratorRaw
    ? collaboratorRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(",")
    : null;

  await db
    .update(jobPositions)
    .set({
      title: String(formData.get("title") ?? ""),
      expectedResult: String(formData.get("expectedResult") ?? ""),
      completionStandard: String(formData.get("completionStandard") ?? ""),
      primaryOwnerId: String(formData.get("primaryOwnerId") ?? ""),
      checkerId: String(formData.get("checkerId") ?? ""),
      collaboratorIds,
      status: String(formData.get("status") ?? "draft"),
      updatedAt: nowIso(),
    })
    .where(eq(jobPositions.id, id));
  await logAudit({
    entityType: "job_position",
    entityId: id,
    action: "update",
    actorId: session.id,
  });
  revalidatePath("/dashboard/jobs");
}

export async function createJobForm(formData: FormData) {
  await createJob(formData);
}

export async function updateJobForm(formData: FormData) {
  await updateJob(reqFormId(formData, "jobId"), formData);
}

export async function getJobCompletenessOverview() {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager")) throw new Error("无权限");

  const allJobs = await db.select().from(jobPositions);
  const allDepts = await db.select().from(departments);

  const isComplete = (j: (typeof allJobs)[0]) =>
    Boolean(
      j.expectedResult?.trim() &&
        j.completionStandard?.trim() &&
        j.primaryOwnerId &&
        j.checkerId &&
        j.status === "published"
    );

  const issues = allJobs.filter((j) => !isComplete(j));

  const byDepartment = allDepts.map((d) => {
    const deptJobs = allJobs.filter((j) => j.departmentId === d.id);
    const complete = deptJobs.filter(isComplete).length;
    return {
      departmentId: d.id,
      departmentName: d.name,
      total: deptJobs.length,
      complete,
      incomplete: deptJobs.length - complete,
      rate: deptJobs.length
        ? Math.round((complete / deptJobs.length) * 100)
        : 100,
    };
  });

  return {
    totalJobs: allJobs.length,
    completeJobs: allJobs.filter(isComplete).length,
    issueCount: issues.length,
    issues: issues.map((j) => ({
      id: j.id,
      title: j.title,
      status: j.status,
      missing: [
        !j.expectedResult?.trim() && "预期结果",
        !j.completionStandard?.trim() && "完成标准",
        !j.primaryOwnerId && "主负责人",
        !j.checkerId && "检查人",
        j.status !== "published" && "未发布",
      ].filter(Boolean),
    })),
    byDepartment,
  };
}

export async function bindKpiTemplateForm(formData: FormData) {
  const session = await requireSession();
  if (!canManageJobs(session)) throw new Error("无权限");

  const jobId = reqFormId(formData, "jobId");
  const templateId = reqFormId(formData, "templateId");
  const now = nowIso();

  const [template] = await db
    .select()
    .from(jobKpiTemplates)
    .where(eq(jobKpiTemplates.id, templateId))
    .limit(1);
  if (!template) throw new Error("KPI 模板不存在");

  const [existing] = await db
    .select()
    .from(jobPositionTemplates)
    .where(eq(jobPositionTemplates.jobPositionId, jobId))
    .limit(1);

  if (existing) {
    await db
      .update(jobPositionTemplates)
      .set({ templateId })
      .where(eq(jobPositionTemplates.id, existing.id));
  } else {
    await db.insert(jobPositionTemplates).values({
      id: uuidv4(),
      jobPositionId: jobId,
      templateId,
      createdAt: now,
    });
  }

  const metrics = JSON.parse(template.metricsJson) as { name: string; target: string }[];
  for (const metric of metrics) {
    await db.insert(performanceResultStandards).values({
      id: uuidv4(),
      jobPositionId: jobId,
      metricName: metric.name,
      targetValue: metric.target,
      unit: null,
      createdAt: now,
    });
  }

  await logAudit({
    entityType: "job_position",
    entityId: jobId,
    action: "bind_kpi_template",
    actorId: session.id,
    payload: { templateId, templateName: template.name },
  });

  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/performance");
}
