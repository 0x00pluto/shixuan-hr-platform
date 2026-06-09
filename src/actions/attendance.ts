"use server";

import { refresh } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { eq, desc, and } from "drizzle-orm";
import { db } from "@/db";
import { attendanceRules, attendanceRecords } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { nowIso, todayDate } from "@/lib/utils/time";

export async function createAttendanceRuleForm(formData: FormData) {
  await createAttendanceRule({
    name: String(formData.get("name") ?? ""),
    workStartTime: String(formData.get("workStartTime") ?? "09:00"),
    workEndTime: String(formData.get("workEndTime") ?? "18:00"),
    lateThresholdMinutes: Number(formData.get("lateThresholdMinutes") ?? 15),
    appliesToRoles: String(formData.get("appliesToRoles") ?? "employee"),
  });
}

export async function createAttendanceRule(input: {
  name: string;
  workStartTime: string;
  workEndTime: string;
  lateThresholdMinutes?: number;
  appliesToRoles?: string;
}) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "ops_manager")) throw new Error("FORBIDDEN");

  const id = uuidv4();
  const now = nowIso();

  await db.insert(attendanceRules).values({
    id,
    name: input.name,
    workStartTime: input.workStartTime,
    workEndTime: input.workEndTime,
    lateThresholdMinutes: input.lateThresholdMinutes ?? 15,
    appliesToRoles: input.appliesToRoles ?? "employee",
    isActive: true,
    createdAt: now,
  });

  await logAudit({
    entityType: "attendance_rule",
    entityId: id,
    action: "create",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { id };
}

export async function updateAttendanceRule(
  id: string,
  input: {
    name?: string;
    workStartTime?: string;
    workEndTime?: string;
    lateThresholdMinutes?: number;
    appliesToRoles?: string;
    isActive?: boolean;
  }
) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "ops_manager")) throw new Error("FORBIDDEN");

  await db
    .update(attendanceRules)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.workStartTime !== undefined && {
        workStartTime: input.workStartTime,
      }),
      ...(input.workEndTime !== undefined && {
        workEndTime: input.workEndTime,
      }),
      ...(input.lateThresholdMinutes !== undefined && {
        lateThresholdMinutes: input.lateThresholdMinutes,
      }),
      ...(input.appliesToRoles !== undefined && {
        appliesToRoles: input.appliesToRoles,
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    })
    .where(eq(attendanceRules.id, id));

  await logAudit({
    entityType: "attendance_rule",
    entityId: id,
    action: "update",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { success: true };
}

export async function listAttendanceRules(activeOnly = true) {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr", "dept_leader")) {
    throw new Error("FORBIDDEN");
  }

  const rules = await db.select().from(attendanceRules);
  return activeOnly ? rules.filter((r) => r.isActive) : rules;
}

function resolveStatus(
  checkInAt: string,
  rule: { workStartTime: string; lateThresholdMinutes: number }
): string {
  const checkInTime = checkInAt.slice(11, 16);
  const [startH, startM] = rule.workStartTime.split(":").map(Number);
  const [inH, inM] = checkInTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const inMinutes = inH * 60 + inM;
  const diff = inMinutes - startMinutes;
  if (diff <= 0) return "normal";
  if (diff <= rule.lateThresholdMinutes) return "late";
  return "absent";
}

export async function recordCheckIn(userId?: string) {
  const session = await requireSession();
  const targetUserId = userId ?? session.id;

  const isSelf = targetUserId === session.id;
  const isManager = hasRole(session, "hr", "ops_manager");
  if (!isSelf && !isManager) throw new Error("FORBIDDEN");

  const today = todayDate();
  const now = nowIso();

  const [existing] = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.userId, targetUserId),
        eq(attendanceRecords.recordDate, today)
      )
    )
    .limit(1);

  const rules = await db
    .select()
    .from(attendanceRules)
    .where(eq(attendanceRules.isActive, true));
  const rule = rules[0] ?? {
    workStartTime: "09:00",
    lateThresholdMinutes: 15,
  };

  const status = resolveStatus(now, rule);

  if (existing) {
    await db
      .update(attendanceRecords)
      .set({ checkInAt: now, status })
      .where(eq(attendanceRecords.id, existing.id));

    refresh();
    return { id: existing.id, status, checkInAt: now };
  }

  const id = uuidv4();
  await db.insert(attendanceRecords).values({
    id,
    userId: targetUserId,
    recordDate: today,
    checkInAt: now,
    status,
    createdAt: now,
  });

  await logAudit({
    entityType: "attendance_record",
    entityId: id,
    action: "check_in",
    actorId: session.id,
    payload: { status },
  });

  refresh();
  return { id, status, checkInAt: now };
}

export async function recordCheckOut(userId?: string) {
  const session = await requireSession();
  const targetUserId = userId ?? session.id;

  const isSelf = targetUserId === session.id;
  const isManager = hasRole(session, "hr", "ops_manager");
  if (!isSelf && !isManager) throw new Error("FORBIDDEN");

  const today = todayDate();
  const now = nowIso();

  const [existing] = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.userId, targetUserId),
        eq(attendanceRecords.recordDate, today)
      )
    )
    .limit(1);

  if (!existing) throw new Error("今日尚未打卡");

  await db
    .update(attendanceRecords)
    .set({ checkOutAt: now })
    .where(eq(attendanceRecords.id, existing.id));

  await logAudit({
    entityType: "attendance_record",
    entityId: existing.id,
    action: "check_out",
    actorId: session.id,
  });

  refresh();
  return { id: existing.id, checkOutAt: now };
}

export async function listAttendanceRecords(filters?: {
  userId?: string;
  recordDate?: string;
  status?: string;
}) {
  const session = await requireSession();

  const targetUserId = filters?.userId ?? session.id;
  const isSelf = targetUserId === session.id;
  const isManager = hasRole(
    session,
    "ceo",
    "ops_manager",
    "hr",
    "dept_leader"
  );
  if (!isSelf && !isManager) throw new Error("FORBIDDEN");

  let rows = await db
    .select()
    .from(attendanceRecords)
    .where(eq(attendanceRecords.userId, targetUserId))
    .orderBy(desc(attendanceRecords.recordDate));

  if (filters?.recordDate) {
    rows = rows.filter((r) => r.recordDate === filters.recordDate);
  }
  if (filters?.status) {
    rows = rows.filter((r) => r.status === filters.status);
  }

  return rows;
}

export async function updateAttendanceNote(recordId: string, note: string) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "ops_manager")) throw new Error("FORBIDDEN");

  await db
    .update(attendanceRecords)
    .set({ note })
    .where(eq(attendanceRecords.id, recordId));

  await logAudit({
    entityType: "attendance_record",
    entityId: recordId,
    action: "update_note",
    actorId: session.id,
    payload: { note },
  });

  refresh();
  return { success: true };
}

export async function getAttendanceSummary(userId?: string) {
  const session = await requireSession();
  const targetUserId = userId ?? session.id;

  const isSelf = targetUserId === session.id;
  const isManager = hasRole(session, "ceo", "ops_manager", "hr", "dept_leader");
  if (!isSelf && !isManager) throw new Error("FORBIDDEN");

  const records = await db
    .select()
    .from(attendanceRecords)
    .where(eq(attendanceRecords.userId, targetUserId));

  return {
    total: records.length,
    normal: records.filter((r) => r.status === "normal").length,
    late: records.filter((r) => r.status === "late").length,
    absent: records.filter((r) => r.status === "absent").length,
    recentRecords: records
      .sort((a, b) => b.recordDate.localeCompare(a.recordDate))
      .slice(0, 10),
  };
}
