"use server";

import { refresh } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  recruitmentRetrospectives,
  trainingRetrospectives,
  candidates,
  trainingPlans,
  hiringDecisions,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { nowIso } from "@/lib/utils/time";

export async function createRecruitmentRetrospective(input: {
  period: string;
  title: string;
  summary: string;
  metrics?: Record<string, unknown>;
}) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "ceo", "ops_manager")) throw new Error("FORBIDDEN");

  const allCandidates = await db.select().from(candidates);
  const decisions = await db.select().from(hiringDecisions);

  const autoMetrics = {
    totalCandidates: allCandidates.length,
    hiredEmployee: allCandidates.filter((c) => c.stage === "hired_employee")
      .length,
    hiredOpc: allCandidates.filter((c) => c.stage === "hired_opc").length,
    rejected: allCandidates.filter((c) => c.stage === "rejected").length,
    ceoDecisions: decisions.length,
    ...input.metrics,
  };

  const now = nowIso();
  const id = uuidv4();

  await db.insert(recruitmentRetrospectives).values({
    id,
    period: input.period,
    title: input.title,
    summary: input.summary,
    metricsJson: JSON.stringify(autoMetrics),
    createdById: session.id,
    createdAt: now,
  });

  await logAudit({
    entityType: "recruitment_retrospective",
    entityId: id,
    action: "create",
    actorId: session.id,
    payload: { period: input.period },
  });

  refresh();
  return { id, metrics: autoMetrics };
}

export async function createTrainingRetrospective(input: {
  period: string;
  title: string;
  summary: string;
  metrics?: Record<string, unknown>;
}) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "ceo", "ops_manager", "dept_leader")) {
    throw new Error("FORBIDDEN");
  }

  const plans = await db.select().from(trainingPlans);
  const autoMetrics = {
    totalPlans: plans.length,
    inProgress: plans.filter((p) => p.status === "in_progress").length,
    completed: plans.filter((p) => p.status === "completed").length,
    failed: plans.filter((p) => p.status === "failed").length,
    completionRate:
      plans.length > 0
        ? Math.round(
            (plans.filter((p) => p.status === "completed").length /
              plans.length) *
              100
          )
        : 0,
    ...input.metrics,
  };

  const now = nowIso();
  const id = uuidv4();

  await db.insert(trainingRetrospectives).values({
    id,
    period: input.period,
    title: input.title,
    summary: input.summary,
    metricsJson: JSON.stringify(autoMetrics),
    createdById: session.id,
    createdAt: now,
  });

  await logAudit({
    entityType: "training_retrospective",
    entityId: id,
    action: "create",
    actorId: session.id,
    payload: { period: input.period },
  });

  refresh();
  return { id, metrics: autoMetrics };
}

export async function getRecruitmentRetrospective(id: string) {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr", "dept_leader")) {
    throw new Error("FORBIDDEN");
  }

  const [row] = await db
    .select()
    .from(recruitmentRetrospectives)
    .where(eq(recruitmentRetrospectives.id, id))
    .limit(1);
  if (!row) return null;

  return {
    ...row,
    metrics: row.metricsJson ? JSON.parse(row.metricsJson) : null,
  };
}

export async function getTrainingRetrospective(id: string) {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr", "dept_leader")) {
    throw new Error("FORBIDDEN");
  }

  const [row] = await db
    .select()
    .from(trainingRetrospectives)
    .where(eq(trainingRetrospectives.id, id))
    .limit(1);
  if (!row) return null;

  return {
    ...row,
    metrics: row.metricsJson ? JSON.parse(row.metricsJson) : null,
  };
}

export async function listRecruitmentRetrospectives(limit = 20) {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr", "dept_leader")) {
    throw new Error("FORBIDDEN");
  }

  const rows = await db
    .select()
    .from(recruitmentRetrospectives)
    .orderBy(desc(recruitmentRetrospectives.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    metrics: r.metricsJson ? JSON.parse(r.metricsJson) : null,
  }));
}

export async function listTrainingRetrospectives(limit = 20) {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr", "dept_leader")) {
    throw new Error("FORBIDDEN");
  }

  const rows = await db
    .select()
    .from(trainingRetrospectives)
    .orderBy(desc(trainingRetrospectives.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    metrics: r.metricsJson ? JSON.parse(r.metricsJson) : null,
  }));
}

export async function updateRecruitmentRetrospective(
  id: string,
  input: { title?: string; summary?: string; metrics?: Record<string, unknown> }
) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "ceo")) throw new Error("FORBIDDEN");

  const [existing] = await db
    .select()
    .from(recruitmentRetrospectives)
    .where(eq(recruitmentRetrospectives.id, id))
    .limit(1);
  if (!existing) throw new Error("复盘不存在");

  await db
    .update(recruitmentRetrospectives)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.summary !== undefined && { summary: input.summary }),
      ...(input.metrics !== undefined && {
        metricsJson: JSON.stringify({
          ...JSON.parse(existing.metricsJson ?? "{}"),
          ...input.metrics,
        }),
      }),
    })
    .where(eq(recruitmentRetrospectives.id, id));

  await logAudit({
    entityType: "recruitment_retrospective",
    entityId: id,
    action: "update",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { success: true };
}

export async function updateTrainingRetrospective(
  id: string,
  input: { title?: string; summary?: string; metrics?: Record<string, unknown> }
) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "ceo", "dept_leader")) throw new Error("FORBIDDEN");

  const [existing] = await db
    .select()
    .from(trainingRetrospectives)
    .where(eq(trainingRetrospectives.id, id))
    .limit(1);
  if (!existing) throw new Error("复盘不存在");

  await db
    .update(trainingRetrospectives)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.summary !== undefined && { summary: input.summary }),
      ...(input.metrics !== undefined && {
        metricsJson: JSON.stringify({
          ...JSON.parse(existing.metricsJson ?? "{}"),
          ...input.metrics,
        }),
      }),
    })
    .where(eq(trainingRetrospectives.id, id));

  await logAudit({
    entityType: "training_retrospective",
    entityId: id,
    action: "update",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { success: true };
}

export async function createRecruitmentRetrospectiveForm(formData: FormData) {
  await createRecruitmentRetrospective({
    period: String(formData.get("period") ?? ""),
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
  });
}

export async function createTrainingRetrospectiveForm(formData: FormData) {
  await createTrainingRetrospective({
    period: String(formData.get("period") ?? ""),
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
  });
}
