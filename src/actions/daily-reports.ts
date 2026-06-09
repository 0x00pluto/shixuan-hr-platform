"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db";
import {
  businessLines,
  candidates,
  dailyReportAnnotations,
  dailyReportItems,
  dailyReports,
  departments,
  headcountPlans,
  jobPositions,
  recruitmentRequests,
  tasks,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import {
  canAnnotateDailyReport,
  filterByDepartment,
  hasRole,
} from "@/lib/auth/permissions";
import { getFeishuService } from "@/lib/services";
import { CANDIDATE_STAGE_LABELS, type CandidateStage } from "@/lib/constants/status";
import { reqFormId } from "@/lib/form-data";
import { nowIso, todayDate } from "@/lib/utils/time";

export async function getDailyReports() {
  await requireSession();
  return db
    .select()
    .from(dailyReports)
    .orderBy(desc(dailyReports.reportDate));
}

export async function getDailyReport(id: string) {
  await requireSession();
  const [report] = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.id, id))
    .limit(1);
  return report ?? null;
}

export async function getDailyReportItems(reportId: string) {
  const session = await requireSession();
  const items = await db
    .select()
    .from(dailyReportItems)
    .where(eq(dailyReportItems.reportId, reportId));

  const withDept = items.map((item) => ({
    ...item,
    departmentId: item.departmentId ?? null,
  }));

  return filterByDepartment(session, withDept);
}

export async function getDailyReportAnnotations(reportId: string) {
  await requireSession();
  return db
    .select()
    .from(dailyReportAnnotations)
    .where(eq(dailyReportAnnotations.reportId, reportId))
    .orderBy(desc(dailyReportAnnotations.createdAt));
}

async function buildDailyReportData() {
  const today = todayDate();
  const hcRows = await db
    .select({
      plan: headcountPlans,
      deptName: departments.name,
      blName: businessLines.name,
    })
    .from(headcountPlans)
    .leftJoin(departments, eq(headcountPlans.departmentId, departments.id))
    .leftJoin(businessLines, eq(headcountPlans.businessLineId, businessLines.id));

  const allCandidates = await db.select().from(candidates);
  const activeCandidates = allCandidates.filter(
    (c) => !["hired_employee", "hired_opc", "rejected"].includes(c.stage)
  );
  const keyCandidates = activeCandidates.filter((c) => c.isKeyCandidate);

  const recruitments = await db
    .select({
      req: recruitmentRequests,
      jobTitle: jobPositions.title,
      deptId: jobPositions.departmentId,
    })
    .from(recruitmentRequests)
    .leftJoin(jobPositions, eq(recruitmentRequests.jobPositionId, jobPositions.id))
    .where(eq(recruitmentRequests.status, "open"));

  const todayTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.taskDate, today));
  const taskDone = todayTasks.filter(
    (t) => t.status === "completed" || t.status === "checked"
  ).length;
  const taskRate =
    todayTasks.length > 0
      ? Math.round((taskDone / todayTasks.length) * 100)
      : 100;

  const hcSummary = hcRows.map(({ plan, deptName, blName }) => ({
    departmentId: plan.departmentId,
    department: deptName ?? "未分配",
    businessLine: blName ?? "—",
    planned: plan.plannedCount,
    actual: plan.actualCount,
    usageRate: Math.round((plan.actualCount / plan.plannedCount) * 100),
  }));

  const pipelineByStage = activeCandidates.reduce<Record<string, number>>(
    (acc, c) => {
      acc[c.stage] = (acc[c.stage] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const alerts: string[] = [];
  for (const hc of hcSummary) {
    if (hc.usageRate >= 90) {
      alerts.push(`${hc.department} HC 使用率 ${hc.usageRate}%，接近满编`);
    }
  }
  const ceoReviewCount = pipelineByStage.ceo_review ?? 0;
  if (ceoReviewCount > 0) {
    alerts.push(`${ceoReviewCount} 位候选人待 CEO 终裁`);
  }
  if (taskRate < 80) {
    alerts.push(`今日任务完成率仅 ${taskRate}%`);
  }

  const summary = {
    reportDate: today,
    hcSummary,
    recruitment: {
      openPositions: recruitments.length,
      keyPositions: recruitments.filter((r) => r.req.isKeyPosition).length,
      activeCandidates: activeCandidates.length,
      pipelineByStage,
    },
    taskCompletionRate: taskRate,
    highlights: [
      `在招岗位 ${recruitments.length} 个，活跃候选人 ${activeCandidates.length} 人`,
      `今日任务完成率 ${taskRate}%`,
      ...hcSummary.map(
        (h) => `${h.department} HC ${h.actual}/${h.planned}（${h.usageRate}%）`
      ),
    ],
    alerts,
  };

  return { today, summary, hcSummary, recruitments, keyCandidates, activeCandidates, taskRate };
}

export async function generateDailyReport() {
  await requireSession();
  const { today, summary, hcSummary, recruitments, keyCandidates, activeCandidates, taskRate } =
    await buildDailyReportData();

  const existing = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.reportDate, today))
    .limit(1);

  const now = nowIso();
  let reportId = existing[0]?.id;

  if (!reportId) reportId = uuidv4();

  const feishu = getFeishuService();
  const push = await feishu.pushDailyReport({
    reportId,
    title: `师选经营日报 ${today}`,
    content: JSON.stringify(summary, null, 2),
    recipientRoles: ["ceo", "ops_manager"],
  });

  if (existing[0]) {
    reportId = existing[0].id;
    await db
      .update(dailyReports)
      .set({
        summaryJson: JSON.stringify(summary),
        feishuPreviewUrl: push.previewUrl,
        generatedAt: now,
      })
      .where(eq(dailyReports.id, reportId));
    await db
      .delete(dailyReportItems)
      .where(eq(dailyReportItems.reportId, reportId));
  } else {
    await db.insert(dailyReports).values({
      id: reportId,
      reportDate: today,
      summaryJson: JSON.stringify(summary),
      feishuPreviewUrl: push.previewUrl,
      generatedAt: now,
      createdAt: now,
    });
  }

  const itemRows: (typeof dailyReportItems.$inferInsert)[] = [];

  for (const hc of hcSummary) {
    itemRows.push({
      id: uuidv4(),
      reportId: reportId!,
      itemType: "hc_usage",
      title: `${hc.department} HC 使用率`,
      contentJson: JSON.stringify(hc),
      departmentId: hc.departmentId,
      businessLineId: null,
      createdAt: now,
    });
  }

  for (const r of recruitments) {
    itemRows.push({
      id: uuidv4(),
      reportId: reportId!,
      itemType: "recruitment",
      title: r.req.title,
      contentJson: JSON.stringify({
        jobTitle: r.jobTitle,
        isKeyPosition: r.req.isKeyPosition,
        status: r.req.status,
      }),
      departmentId: r.deptId,
      createdAt: now,
    });
  }

  for (const c of keyCandidates) {
    itemRows.push({
      id: uuidv4(),
      reportId: reportId!,
      itemType: "key_candidate",
      title: c.name,
      contentJson: JSON.stringify({
        stage: c.stage,
        stageLabel: CANDIDATE_STAGE_LABELS[c.stage as CandidateStage],
        advantages: c.advantages,
      }),
      createdAt: now,
    });
  }

  itemRows.push({
    id: uuidv4(),
    reportId: reportId!,
    itemType: "summary",
    title: "经营摘要",
    contentJson: JSON.stringify({
      activeCandidates: activeCandidates.length,
      taskCompletionRate: taskRate,
      alerts: summary.alerts,
    }),
    createdAt: now,
  });

  if (itemRows.length > 0) {
    await db.insert(dailyReportItems).values(itemRows);
  }

  revalidatePath("/dashboard/daily-reports");
  return reportId;
}

export async function annotateDailyReport(reportId: string, formData: FormData) {
  const session = await requireSession();
  if (!canAnnotateDailyReport(session)) throw new Error("无权限");

  const content = String(formData.get("content") ?? "").trim();
  if (!content) throw new Error("批注内容不能为空");

  await db.insert(dailyReportAnnotations).values({
    id: uuidv4(),
    reportId,
    authorId: session.id,
    content,
    createdAt: nowIso(),
  });
  revalidatePath("/dashboard/daily-reports");
}

export async function annotateDailyReportForm(formData: FormData) {
  await annotateDailyReport(reqFormId(formData, "reportId"), formData);
}

export async function generateDailyReportForm() {
  await generateDailyReport();
}

export async function getDepartmentDailySummary(reportId: string) {
  const session = await requireSession();
  const report = await getDailyReport(reportId);
  if (!report) return null;

  if (hasRole(session, "ceo", "ops_manager", "hr")) {
    return JSON.parse(report.summaryJson) as Record<string, unknown>;
  }

  if (session.role === "dept_leader" && session.departmentId) {
    const items = await getDailyReportItems(reportId);
    const hc = items.filter((i) => i.itemType === "hc_usage");
    const recruitments = items.filter((i) => i.itemType === "recruitment");
    const keyCandidates = items.filter((i) => i.itemType === "key_candidate");
    return {
      scope: "department",
      departmentId: session.departmentId,
      hcUsage: hc.map((i) => JSON.parse(i.contentJson)),
      recruitments: recruitments.map((i) => JSON.parse(i.contentJson)),
      keyCandidates: keyCandidates.map((i) => JSON.parse(i.contentJson)),
      itemCount: items.length,
    };
  }

  return JSON.parse(report.summaryJson) as Record<string, unknown>;
}
