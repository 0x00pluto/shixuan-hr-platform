"use server";

import { refresh } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  promotionNominations,
  promotionApprovals,
  promotionDecisions,
  users,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import {
  canMakeHiringDecision,
  canManagePerformance,
  hasRole,
} from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { reqFormId } from "@/lib/form-data";
import { nowIso } from "@/lib/utils/time";

export async function nominatePromotion(input: {
  userId: string;
  targetLevel: string;
  pathType: string;
  rationale: string;
}) {
  const session = await requireSession();
  if (!canManagePerformance(session)) throw new Error("FORBIDDEN");

  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!targetUser) throw new Error("用户不存在");

  const now = nowIso();
  const id = uuidv4();

  await db.insert(promotionNominations).values({
    id,
    userId: input.userId,
    nominatedById: session.id,
    targetLevel: input.targetLevel,
    pathType: input.pathType,
    rationale: input.rationale,
    status: "nominated",
    createdAt: now,
  });

  await logAudit({
    entityType: "promotion_nomination",
    entityId: id,
    action: "nominate",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { id };
}

export async function approvePromotion(input: {
  nominationId: string;
  approved: boolean;
  notes?: string;
}) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "dept_leader", "ops_manager")) {
    throw new Error("FORBIDDEN");
  }

  const [nomination] = await db
    .select()
    .from(promotionNominations)
    .where(eq(promotionNominations.id, input.nominationId))
    .limit(1);
  if (!nomination) throw new Error("晋升提名不存在");

  const now = nowIso();
  const approvalId = uuidv4();

  await db.insert(promotionApprovals).values({
    id: approvalId,
    nominationId: input.nominationId,
    approverId: session.id,
    approverRole: session.role,
    approved: input.approved,
    notes: input.notes ?? null,
    createdAt: now,
  });

  const newStatus = input.approved ? "pending_ceo" : "rejected";
  await db
    .update(promotionNominations)
    .set({ status: newStatus })
    .where(eq(promotionNominations.id, input.nominationId));

  await logAudit({
    entityType: "promotion_nomination",
    entityId: input.nominationId,
    action: input.approved ? "approve" : "reject",
    actorId: session.id,
    payload: { approverRole: session.role },
  });

  refresh();
  return { approvalId, status: newStatus };
}

export async function ceoPromotionDecision(input: {
  nominationId: string;
  decision: "approved" | "rejected";
  notes?: string;
}) {
  const session = await requireSession();
  if (!canMakeHiringDecision(session)) throw new Error("FORBIDDEN");

  const [nomination] = await db
    .select()
    .from(promotionNominations)
    .where(eq(promotionNominations.id, input.nominationId))
    .limit(1);
  if (!nomination) throw new Error("晋升提名不存在");

  const now = nowIso();
  const decisionId = uuidv4();

  await db.insert(promotionDecisions).values({
    id: decisionId,
    nominationId: input.nominationId,
    decidedById: session.id,
    decision: input.decision,
    notes: input.notes ?? null,
    createdAt: now,
  });

  const newStatus =
    input.decision === "approved" ? "approved" : "rejected";
  await db
    .update(promotionNominations)
    .set({ status: newStatus })
    .where(eq(promotionNominations.id, input.nominationId));

  await logAudit({
    entityType: "promotion_nomination",
    entityId: input.nominationId,
    action: `ceo_${input.decision}`,
    actorId: session.id,
    payload: { notes: input.notes },
  });

  refresh();
  return { decisionId, status: newStatus };
}

export async function getPromotionNomination(id: string) {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr", "dept_leader", "employee")) {
    throw new Error("FORBIDDEN");
  }

  const [nomination] = await db
    .select()
    .from(promotionNominations)
    .where(eq(promotionNominations.id, id))
    .limit(1);
  if (!nomination) return null;

  const isSelf = nomination.userId === session.id;
  const isManager = hasRole(session, "ceo", "ops_manager", "hr", "dept_leader");
  if (!isSelf && !isManager) throw new Error("FORBIDDEN");

  const approvals = await db
    .select()
    .from(promotionApprovals)
    .where(eq(promotionApprovals.nominationId, id));

  const [decision] = await db
    .select()
    .from(promotionDecisions)
    .where(eq(promotionDecisions.nominationId, id))
    .limit(1);

  return { ...nomination, approvals, decision };
}

export async function listPromotionNominations(status?: string) {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager", "hr", "dept_leader")) {
    throw new Error("FORBIDDEN");
  }

  const rows = await db
    .select()
    .from(promotionNominations)
    .orderBy(desc(promotionNominations.createdAt));

  return status ? rows.filter((r) => r.status === status) : rows;
}

export async function createPromotionNominationForm(formData: FormData) {
  await nominatePromotion({
    userId: String(formData.get("userId") ?? ""),
    targetLevel: String(formData.get("targetLevel") ?? ""),
    pathType: String(formData.get("pathType") ?? "management"),
    rationale: String(formData.get("rationale") ?? ""),
  });
}

export async function approvePromotionForm(formData: FormData) {
  await approvePromotion({
    nominationId: reqFormId(formData, "nominationId"),
    approved: formData.get("approved") === "true",
    notes: String(formData.get("notes") ?? ""),
  });
}

export async function decidePromotionForm(formData: FormData) {
  const raw = String(formData.get("decision") ?? "rejected");
  await ceoPromotionDecision({
    nominationId: reqFormId(formData, "nominationId"),
    decision: raw === "approved" ? "approved" : "rejected",
    notes: String(formData.get("notes") ?? ""),
  });
}
