"use server";

import { refresh } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  resignationRequests,
  resignationApprovals,
  handoverChecklists,
  users,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { reqFormId } from "@/lib/form-data";
import { nowIso } from "@/lib/utils/time";

const DEFAULT_HANDOVER_ITEMS = [
  "工作文档与知识库交接",
  "在办任务与待跟进事项说明",
  "系统账号与权限移交",
  "客户/合作方联系人交接",
  "办公设备与资产归还",
];

export async function requestResignation(input: {
  reason: string;
  expectedLeaveDate: string;
}) {
  const session = await requireSession();
  if (!hasRole(session, "employee", "dept_leader", "newcomer", "hr")) {
    throw new Error("FORBIDDEN");
  }

  const now = nowIso();
  const id = uuidv4();

  await db.insert(resignationRequests).values({
    id,
    userId: session.id,
    reason: input.reason,
    expectedLeaveDate: input.expectedLeaveDate,
    status: "pending",
    createdAt: now,
  });

  await db.insert(handoverChecklists).values(
    DEFAULT_HANDOVER_ITEMS.map((itemTitle) => ({
      id: uuidv4(),
      requestId: id,
      itemTitle,
      isCompleted: false,
    }))
  );

  await logAudit({
    entityType: "resignation_request",
    entityId: id,
    action: "request",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { id };
}

export async function approveResignation(input: {
  requestId: string;
  approved: boolean;
  notes?: string;
}) {
  const session = await requireSession();

  const isCeo = hasRole(session, "ceo");
  const isOps = hasRole(session, "ops_manager");
  if (!isCeo && !isOps) throw new Error("FORBIDDEN");

  const [request] = await db
    .select()
    .from(resignationRequests)
    .where(eq(resignationRequests.id, input.requestId))
    .limit(1);
  if (!request) throw new Error("离职申请不存在");

  const approverRole = isCeo ? "ceo" : "ops_manager";
  const now = nowIso();
  const approvalId = uuidv4();

  await db.insert(resignationApprovals).values({
    id: approvalId,
    requestId: input.requestId,
    approverId: session.id,
    approverRole,
    approved: input.approved,
    notes: input.notes ?? null,
    createdAt: now,
  });

  const existingApprovals = await db
    .select()
    .from(resignationApprovals)
    .where(eq(resignationApprovals.requestId, input.requestId));

  const ceoApproved = existingApprovals.some(
    (a) => a.approverRole === "ceo" && a.approved
  );
  const opsApproved = existingApprovals.some(
    (a) => a.approverRole === "ops_manager" && a.approved
  );
  const anyRejected = existingApprovals.some((a) => !a.approved);

  let newStatus = request.status;
  if (anyRejected) {
    newStatus = "rejected";
  } else if (ceoApproved && opsApproved) {
    newStatus = "approved";
    await db
      .update(users)
      .set({ isActive: false, updatedAt: now })
      .where(eq(users.id, request.userId));
  } else {
    newStatus = "pending";
  }

  await db
    .update(resignationRequests)
    .set({ status: newStatus })
    .where(eq(resignationRequests.id, input.requestId));

  await logAudit({
    entityType: "resignation_request",
    entityId: input.requestId,
    action: input.approved ? "approve" : "reject",
    actorId: session.id,
    payload: { approverRole, notes: input.notes },
  });

  refresh();
  return { approvalId, status: newStatus };
}

export async function getResignationRequest(id: string) {
  const session = await requireSession();

  const [request] = await db
    .select()
    .from(resignationRequests)
    .where(eq(resignationRequests.id, id))
    .limit(1);
  if (!request) return null;

  const isOwner = request.userId === session.id;
  const isManager = hasRole(session, "ceo", "ops_manager", "hr");
  if (!isOwner && !isManager) throw new Error("FORBIDDEN");

  const approvals = await db
    .select()
    .from(resignationApprovals)
    .where(eq(resignationApprovals.requestId, id));

  const checklist = await db
    .select()
    .from(handoverChecklists)
    .where(eq(handoverChecklists.requestId, id));

  return { ...request, approvals, checklist };
}

export async function listResignationRequests() {
  const session = await requireSession();

  if (hasRole(session, "ceo", "ops_manager", "hr")) {
    return db
      .select()
      .from(resignationRequests)
      .orderBy(desc(resignationRequests.createdAt));
  }

  return db
    .select()
    .from(resignationRequests)
    .where(eq(resignationRequests.userId, session.id))
    .orderBy(desc(resignationRequests.createdAt));
}

export async function updateHandoverItem(
  itemId: string,
  isCompleted: boolean
) {
  const session = await requireSession();

  const [item] = await db
    .select()
    .from(handoverChecklists)
    .where(eq(handoverChecklists.id, itemId))
    .limit(1);
  if (!item) throw new Error("交接项不存在");

  const [request] = await db
    .select()
    .from(resignationRequests)
    .where(eq(resignationRequests.id, item.requestId))
    .limit(1);
  if (!request) throw new Error("离职申请不存在");

  const isOwner = request.userId === session.id;
  const isManager = hasRole(session, "ceo", "ops_manager", "hr");
  if (!isOwner && !isManager) throw new Error("FORBIDDEN");

  const now = nowIso();
  await db
    .update(handoverChecklists)
    .set({
      isCompleted,
      completedAt: isCompleted ? now : null,
    })
    .where(eq(handoverChecklists.id, itemId));

  await logAudit({
    entityType: "handover_checklist",
    entityId: itemId,
    action: isCompleted ? "complete" : "reopen",
    actorId: session.id,
  });

  refresh();
  return { success: true };
}

export async function addHandoverItem(requestId: string, itemTitle: string) {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr", "dept_leader")) {
    throw new Error("FORBIDDEN");
  }

  const id = uuidv4();
  await db.insert(handoverChecklists).values({
    id,
    requestId,
    itemTitle,
    isCompleted: false,
  });

  await logAudit({
    entityType: "handover_checklist",
    entityId: id,
    action: "add",
    actorId: session.id,
    payload: { itemTitle },
  });

  refresh();
  return { id };
}

export async function createResignationRequestForm(formData: FormData) {
  await requestResignation({
    reason: String(formData.get("reason") ?? ""),
    expectedLeaveDate: String(formData.get("expectedLeaveDate") ?? ""),
  });
}

export async function approveResignationForm(formData: FormData) {
  await approveResignation({
    requestId: reqFormId(formData, "requestId"),
    approved: formData.get("approved") === "true",
    notes: String(formData.get("notes") ?? ""),
  });
}

export async function toggleHandoverItemForm(formData: FormData) {
  const itemId = reqFormId(formData, "itemId");
  const [item] = await db
    .select()
    .from(handoverChecklists)
    .where(eq(handoverChecklists.id, itemId))
    .limit(1);
  if (!item) throw new Error("交接项不存在");
  await updateHandoverItem(itemId, !item.isCompleted);
}
