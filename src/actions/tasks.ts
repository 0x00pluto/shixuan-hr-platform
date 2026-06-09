"use server";

import { refresh } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { departments, tasks, taskCheckResults } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { canCreateTasks, hasRole } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { reqFormId } from "@/lib/form-data";
import { nowIso, todayDate } from "@/lib/utils/time";
import { getFeishuService } from "@/lib/services";

export type CreateTaskInput = {
  title: string;
  description?: string;
  assigneeId: string;
  collaboratorIds?: string[];
  checkerId: string;
  departmentId?: string;
  dueAt: string;
  completionStandard: string;
  taskDate?: string;
};

export async function createTask(input: CreateTaskInput) {
  const session = await requireSession();
  if (!canCreateTasks(session)) throw new Error("FORBIDDEN");

  const now = nowIso();
  const id = uuidv4();

  await db.insert(tasks).values({
    id,
    title: input.title,
    description: input.description ?? null,
    assigneeId: input.assigneeId,
    collaboratorIds: input.collaboratorIds?.join(",") ?? null,
    checkerId: input.checkerId,
    creatorId: session.id,
    departmentId: input.departmentId ?? session.departmentId,
    dueAt: input.dueAt,
    completionStandard: input.completionStandard,
    status: "open",
    taskDate: input.taskDate ?? todayDate(),
    createdAt: now,
    updatedAt: now,
  });

  const feishu = getFeishuService();
  await feishu.notifyTask({
    userId: input.assigneeId,
    title: "新任务分配",
    body: `您有新的任务：${input.title}，截止日期 ${input.dueAt}`,
  });

  await logAudit({
    entityType: "task",
    entityId: id,
    action: "create",
    actorId: session.id,
    payload: { title: input.title, assigneeId: input.assigneeId },
  });

  refresh();
  return { id };
}

export async function completeTask(taskId: string) {
  const session = await requireSession();

  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) throw new Error("任务不存在");

  const isAssignee = task.assigneeId === session.id;
  const isCollaborator = task.collaboratorIds
    ?.split(",")
    .includes(session.id);
  const isManager = hasRole(session, "hr", "dept_leader", "ops_manager");
  if (!isAssignee && !isCollaborator && !isManager) {
    throw new Error("FORBIDDEN");
  }

  if (task.status !== "open") throw new Error("任务状态不允许完成");

  const now = nowIso();
  await db
    .update(tasks)
    .set({ status: "completed", updatedAt: now })
    .where(eq(tasks.id, taskId));

  await logAudit({
    entityType: "task",
    entityId: taskId,
    action: "complete",
    actorId: session.id,
  });

  refresh();
  return { success: true };
}

export async function checkTask(input: {
  taskId: string;
  passed: boolean;
  feedback?: string;
}) {
  const session = await requireSession();

  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, input.taskId))
    .limit(1);
  if (!task) throw new Error("任务不存在");

  const isChecker = task.checkerId === session.id;
  const isOps = hasRole(session, "ops_manager");
  if (!isChecker && !isOps) throw new Error("FORBIDDEN");

  if (task.status !== "completed") {
    throw new Error("仅已完成任务可验收");
  }

  const now = nowIso();
  const checkId = uuidv4();

  await db.insert(taskCheckResults).values({
    id: checkId,
    taskId: input.taskId,
    checkerId: session.id,
    passed: input.passed,
    feedback: input.feedback ?? null,
    createdAt: now,
  });

  await db
    .update(tasks)
    .set({
      status: input.passed ? "checked" : "rejected",
      updatedAt: now,
    })
    .where(eq(tasks.id, input.taskId));

  await logAudit({
    entityType: "task",
    entityId: input.taskId,
    action: input.passed ? "check_pass" : "check_reject",
    actorId: session.id,
    payload: { feedback: input.feedback },
  });

  refresh();
  return { checkId };
}

export async function getTask(taskId: string) {
  const session = await requireSession();

  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) return null;

  const canView =
    hasRole(session, "ceo", "ops_manager", "hr", "dept_leader") ||
    task.assigneeId === session.id ||
    task.checkerId === session.id ||
    task.creatorId === session.id ||
    task.collaboratorIds?.split(",").includes(session.id);

  if (!canView) throw new Error("FORBIDDEN");

  const checks = await db
    .select()
    .from(taskCheckResults)
    .where(eq(taskCheckResults.taskId, taskId))
    .orderBy(desc(taskCheckResults.createdAt));

  return { ...task, checkResults: checks };
}

export async function listTasks(filters?: {
  status?: string;
  assigneeId?: string;
  taskDate?: string;
}) {
  const session = await requireSession();

  let rows = await db.select().from(tasks).orderBy(desc(tasks.updatedAt));

  if (filters?.status) {
    rows = rows.filter((t) => t.status === filters.status);
  }
  if (filters?.assigneeId) {
    rows = rows.filter((t) => t.assigneeId === filters.assigneeId);
  }
  if (filters?.taskDate) {
    rows = rows.filter((t) => t.taskDate === filters.taskDate);
  }

  if (hasRole(session, "ceo", "ops_manager", "hr")) {
    return rows;
  }
  if (session.role === "dept_leader" && session.departmentId) {
    return rows.filter((t) => t.departmentId === session.departmentId);
  }

  return rows.filter(
    (t) =>
      t.assigneeId === session.id ||
      t.checkerId === session.id ||
      t.creatorId === session.id ||
      t.collaboratorIds?.split(",").includes(session.id)
  );
}

export async function getTasksOverview() {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr", "dept_leader")) {
    throw new Error("FORBIDDEN");
  }

  const allTasks = await listTasks();
  const today = todayDate();

  const byStatus = {
    open: allTasks.filter((t) => t.status === "open").length,
    completed: allTasks.filter((t) => t.status === "completed").length,
    checked: allTasks.filter((t) => t.status === "checked").length,
    rejected: allTasks.filter((t) => t.status === "rejected").length,
  };

  const todayTasks = allTasks.filter((t) => t.taskDate === today);
  const overdue = allTasks.filter(
    (t) => t.status === "open" && t.dueAt < today
  );

  const completionRate =
    allTasks.length > 0
      ? Math.round(
          ((byStatus.checked + byStatus.completed) / allTasks.length) * 100
        )
      : 0;

  return {
    total: allTasks.length,
    byStatus,
    todayCount: todayTasks.length,
    overdueCount: overdue.length,
    completionRate,
    recentTasks: allTasks.slice(0, 10),
  };
}

export async function reopenTask(taskId: string) {
  const session = await requireSession();
  if (!canCreateTasks(session)) throw new Error("FORBIDDEN");

  const now = nowIso();
  await db
    .update(tasks)
    .set({ status: "open", updatedAt: now })
    .where(eq(tasks.id, taskId));

  await logAudit({
    entityType: "task",
    entityId: taskId,
    action: "reopen",
    actorId: session.id,
  });

  refresh();
  return { success: true };
}

export async function completeTaskForm(formData: FormData) {
  await completeTask(reqFormId(formData, "taskId"));
}

export async function createTaskForm(formData: FormData) {
  const session = await requireSession();
  const dueAt = String(formData.get("dueAt") ?? "");
  await createTask({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    assigneeId: String(formData.get("assigneeId") ?? session.id),
    checkerId: String(formData.get("checkerId") ?? session.id),
    dueAt: dueAt.includes("T") ? new Date(dueAt).toISOString() : dueAt,
    completionStandard: String(formData.get("completionStandard") ?? ""),
  });
}

export async function checkTaskForm(formData: FormData) {
  await checkTask({
    taskId: reqFormId(formData, "taskId"),
    passed: formData.get("passed") === "true",
    feedback: String(formData.get("feedback") ?? ""),
  });
}

export async function getTodayTasks() {
  return listTasks({ taskDate: todayDate() });
}

export async function getTasksOverviewByDepartment() {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr")) throw new Error("FORBIDDEN");

  const allTasks = await listTasks();
  const allDepts = await db.select().from(departments);

  return allDepts.map((d) => {
    const deptTasks = allTasks.filter((t) => t.departmentId === d.id);
    const done = deptTasks.filter(
      (t) => t.status === "checked" || t.status === "completed"
    ).length;
    return {
      departmentId: d.id,
      departmentName: d.name,
      total: deptTasks.length,
      completionRate:
        deptTasks.length > 0
          ? Math.round((done / deptTasks.length) * 100)
          : 0,
    };
  });
}
