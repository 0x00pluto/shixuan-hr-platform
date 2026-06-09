"use server";

import { refresh } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  analyticsSnapshots,
  candidates,
  jobPositions,
  tasks,
  trainingPlans,
  salaryProfiles,
  opcPartners,
  users,
  examAttempts,
  performanceReviews,
  resignationRequests,
  promotionNominations,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { nowIso, todayDate } from "@/lib/utils/time";

async function aggregateDeepAnalytics() {
  const [
    allCandidates,
    allJobs,
    allTasks,
    allTraining,
    allSalary,
    allOpc,
    allUsers,
    allAttempts,
    allReviews,
    allResignations,
    allPromotions,
  ] = await Promise.all([
    db.select().from(candidates),
    db.select().from(jobPositions),
    db.select().from(tasks),
    db.select().from(trainingPlans),
    db.select().from(salaryProfiles),
    db.select().from(opcPartners),
    db.select().from(users),
    db.select().from(examAttempts),
    db.select().from(performanceReviews),
    db.select().from(resignationRequests),
    db.select().from(promotionNominations),
  ]);

  const activeUsers = allUsers.filter((u) => u.isActive);

  return {
    generatedAt: nowIso(),
    recruitment: {
      totalCandidates: allCandidates.length,
      byStage: CANDIDATE_STAGES.reduce(
        (acc, stage) => {
          acc[stage] = allCandidates.filter((c) => c.stage === stage).length;
          return acc;
        },
        {} as Record<string, number>
      ),
      keyCandidates: allCandidates.filter((c) => c.isKeyCandidate).length,
      conversionRate:
        allCandidates.length > 0
          ? Math.round(
              ((allCandidates.filter(
                (c) =>
                  c.stage === "hired_employee" || c.stage === "hired_opc"
              ).length /
                allCandidates.length) *
                100)
            )
          : 0,
    },
    jobs: {
      total: allJobs.length,
      published: allJobs.filter((j) => j.status === "published").length,
      draft: allJobs.filter((j) => j.status === "draft").length,
    },
    tasks: {
      total: allTasks.length,
      open: allTasks.filter((t) => t.status === "open").length,
      completed: allTasks.filter((t) => t.status === "completed").length,
      checked: allTasks.filter((t) => t.status === "checked").length,
      rejected: allTasks.filter((t) => t.status === "rejected").length,
      completionRate:
        allTasks.length > 0
          ? Math.round(
              ((allTasks.filter(
                (t) => t.status === "checked" || t.status === "completed"
              ).length /
                allTasks.length) *
                100)
            )
          : 0,
    },
    training: {
      total: allTraining.length,
      inProgress: allTraining.filter((p) => p.status === "in_progress").length,
      completed: allTraining.filter((p) => p.status === "completed").length,
      failed: allTraining.filter((p) => p.status === "failed").length,
      examPassRate:
        allAttempts.length > 0
          ? Math.round(
              (allAttempts.filter((a) => a.passed).length /
                allAttempts.length) *
                100
            )
          : 0,
    },
    salary: {
      totalProfiles: allSalary.length,
      training: allSalary.filter((s) => s.status === "training").length,
      regular: allSalary.filter((s) => s.status === "regular").length,
      pendingAudit: allSalary.filter((s) => s.auditStatus === "pending").length,
      avgBaseSalary:
        allSalary.length > 0
          ? Math.round(
              allSalary.reduce((sum, s) => sum + s.baseSalary, 0) /
                allSalary.length
            )
          : 0,
    },
    opc: {
      totalPartners: allOpc.length,
      active: allOpc.filter((p) => p.status === "active").length,
    },
    workforce: {
      totalActive: activeUsers.length,
      byRole: activeUsers.reduce(
        (acc, u) => {
          acc[u.role] = (acc[u.role] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    },
    performance: {
      totalReviews: allReviews.length,
      avgScore:
        allReviews.filter((r) => r.score != null).length > 0
          ? Math.round(
              (allReviews
                .filter((r) => r.score != null)
                .reduce((sum, r) => sum + (r.score ?? 0), 0) /
                allReviews.filter((r) => r.score != null).length) *
                10
            ) / 10
          : null,
    },
    retention: {
      pendingResignations: allResignations.filter(
        (r) => r.status === "pending"
      ).length,
      approvedResignations: allResignations.filter(
        (r) => r.status === "approved"
      ).length,
    },
    promotions: {
      total: allPromotions.length,
      pendingCeo: allPromotions.filter((p) => p.status === "pending_ceo").length,
      approved: allPromotions.filter((p) => p.status === "approved").length,
    },
  };
}

const CANDIDATE_STAGES = [
  "screening",
  "interviewing",
  "ai_analysis",
  "routing",
  "ceo_review",
  "hired_employee",
  "hired_opc",
  "rejected",
];

export async function createAnalyticsSnapshot(input: {
  snapshotType: string;
  period: string;
}) {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr")) throw new Error("FORBIDDEN");

  const data = await aggregateDeepAnalytics();
  const now = nowIso();
  const id = uuidv4();

  await db.insert(analyticsSnapshots).values({
    id,
    snapshotType: input.snapshotType,
    period: input.period,
    dataJson: JSON.stringify(data),
    createdAt: now,
  });

  await logAudit({
    entityType: "analytics_snapshot",
    entityId: id,
    action: "create",
    actorId: session.id,
    payload: { snapshotType: input.snapshotType, period: input.period },
  });

  refresh();
  return { id, data };
}

export async function getAnalyticsSnapshot(id: string) {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr", "dept_leader")) {
    throw new Error("FORBIDDEN");
  }

  const [snapshot] = await db
    .select()
    .from(analyticsSnapshots)
    .where(eq(analyticsSnapshots.id, id))
    .limit(1);
  if (!snapshot) return null;

  return {
    ...snapshot,
    data: JSON.parse(snapshot.dataJson),
  };
}

export async function listAnalyticsSnapshots(
  snapshotType?: string,
  limit = 20
) {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr", "dept_leader")) {
    throw new Error("FORBIDDEN");
  }

  const rows = await db
    .select()
    .from(analyticsSnapshots)
    .orderBy(desc(analyticsSnapshots.createdAt))
    .limit(limit);

  const filtered = snapshotType
    ? rows.filter((r) => r.snapshotType === snapshotType)
    : rows;

  return filtered.map((r) => ({
    id: r.id,
    snapshotType: r.snapshotType,
    period: r.period,
    createdAt: r.createdAt,
    summary: JSON.parse(r.dataJson) as Record<string, unknown>,
  }));
}

export async function getDeepAnalytics() {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr", "dept_leader")) {
    throw new Error("FORBIDDEN");
  }

  return aggregateDeepAnalytics();
}

export async function getDashboardMetrics() {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr", "dept_leader", "employee")) {
    throw new Error("FORBIDDEN");
  }

  const today = todayDate();
  const analytics = await aggregateDeepAnalytics();

  const [latestSnapshot] = await db
    .select()
    .from(analyticsSnapshots)
    .orderBy(desc(analyticsSnapshots.createdAt))
    .limit(1);

  return {
    today,
    live: analytics,
    latestSnapshot: latestSnapshot
      ? {
          id: latestSnapshot.id,
          period: latestSnapshot.period,
          createdAt: latestSnapshot.createdAt,
        }
      : null,
  };
}

export async function compareSnapshots(idA: string, idB: string) {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr")) throw new Error("FORBIDDEN");

  const [snapA] = await db
    .select()
    .from(analyticsSnapshots)
    .where(eq(analyticsSnapshots.id, idA))
    .limit(1);
  const [snapB] = await db
    .select()
    .from(analyticsSnapshots)
    .where(eq(analyticsSnapshots.id, idB))
    .limit(1);

  if (!snapA || !snapB) throw new Error("快照不存在");

  type AnalyticsData = Awaited<ReturnType<typeof aggregateDeepAnalytics>>;
  const dataA = JSON.parse(snapA.dataJson) as AnalyticsData;
  const dataB = JSON.parse(snapB.dataJson) as AnalyticsData;

  return {
    snapshotA: { id: idA, period: snapA.period, data: dataA },
    snapshotB: { id: idB, period: snapB.period, data: dataB },
    deltas: {
      candidates:
        dataB.recruitment.totalCandidates -
        dataA.recruitment.totalCandidates,
      taskCompletionRate:
        dataB.tasks.completionRate - dataA.tasks.completionRate,
      trainingCompleted:
        dataB.training.completed - dataA.training.completed,
      regularSalary:
        dataB.salary.regular - dataA.salary.regular,
    },
  };
}
