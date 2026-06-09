"use server";

import { refresh } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  opcPartners,
  opcProjects,
  opcRevenueShares,
  opcAgreements,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { canManageOpc, canViewOpcSelf, hasRole } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { reqFormId } from "@/lib/form-data";
import { nowIso } from "@/lib/utils/time";

export type CreatePartnerInput = {
  name: string;
  email?: string;
  phone?: string;
  advantages?: string;
  userId?: string;
  candidateId?: string;
};

export async function createOpcPartner(input: CreatePartnerInput) {
  const session = await requireSession();
  if (!canManageOpc(session)) throw new Error("FORBIDDEN");

  const now = nowIso();
  const id = uuidv4();

  await db.insert(opcPartners).values({
    id,
    userId: input.userId ?? null,
    candidateId: input.candidateId ?? null,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    advantages: input.advantages ?? null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  await logAudit({
    entityType: "opc_partner",
    entityId: id,
    action: "create",
    actorId: session.id,
    payload: { name: input.name },
  });

  refresh();
  return { id };
}

export async function updateOpcPartner(
  id: string,
  input: Partial<CreatePartnerInput> & { status?: string }
) {
  const session = await requireSession();
  if (!canManageOpc(session)) throw new Error("FORBIDDEN");

  const now = nowIso();
  await db
    .update(opcPartners)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.advantages !== undefined && { advantages: input.advantages }),
      ...(input.userId !== undefined && { userId: input.userId }),
      ...(input.status !== undefined && { status: input.status }),
      updatedAt: now,
    })
    .where(eq(opcPartners.id, id));

  await logAudit({
    entityType: "opc_partner",
    entityId: id,
    action: "update",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { success: true };
}

export async function getOpcPartner(id: string) {
  const session = await requireSession();

  const [partner] = await db
    .select()
    .from(opcPartners)
    .where(eq(opcPartners.id, id))
    .limit(1);
  if (!partner) return null;

  if (!canViewOpcSelf(session, partner.userId)) throw new Error("FORBIDDEN");

  const projects = await db
    .select()
    .from(opcProjects)
    .where(eq(opcProjects.partnerId, id));

  const agreements = await db
    .select()
    .from(opcAgreements)
    .where(eq(opcAgreements.partnerId, id));

  const projectsWithShares = await Promise.all(
    projects.map(async (project) => {
      const shares = await db
        .select()
        .from(opcRevenueShares)
        .where(eq(opcRevenueShares.projectId, project.id));
      return { ...project, revenueShares: shares };
    })
  );

  return { ...partner, projects: projectsWithShares, agreements };
}

export async function listOpcPartners() {
  const session = await requireSession();

  if (canManageOpc(session)) {
    return db.select().from(opcPartners).orderBy(desc(opcPartners.updatedAt));
  }

  if (session.role === "opc") {
    return db
      .select()
      .from(opcPartners)
      .where(eq(opcPartners.userId, session.id));
  }

  throw new Error("FORBIDDEN");
}

export async function createOpcProject(input: {
  partnerId: string;
  projectName: string;
  description?: string;
}) {
  const session = await requireSession();
  if (!canManageOpc(session)) throw new Error("FORBIDDEN");

  const [partner] = await db
    .select()
    .from(opcPartners)
    .where(eq(opcPartners.id, input.partnerId))
    .limit(1);
  if (!partner) throw new Error("合伙人不存在");

  const id = uuidv4();
  const now = nowIso();

  await db.insert(opcProjects).values({
    id,
    partnerId: input.partnerId,
    projectName: input.projectName,
    description: input.description ?? null,
    status: "active",
    createdAt: now,
  });

  await logAudit({
    entityType: "opc_project",
    entityId: id,
    action: "create",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { id };
}

export async function updateOpcProject(
  id: string,
  input: { projectName?: string; description?: string; status?: string }
) {
  const session = await requireSession();
  if (!canManageOpc(session)) throw new Error("FORBIDDEN");

  await db
    .update(opcProjects)
    .set({
      ...(input.projectName !== undefined && { projectName: input.projectName }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
    })
    .where(eq(opcProjects.id, id));

  await logAudit({
    entityType: "opc_project",
    entityId: id,
    action: "update",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { success: true };
}

export async function setRevenueShare(input: {
  projectId: string;
  sharePercent: number;
  effectiveFrom?: string;
}) {
  const session = await requireSession();
  if (!canManageOpc(session)) throw new Error("FORBIDDEN");

  const [project] = await db
    .select()
    .from(opcProjects)
    .where(eq(opcProjects.id, input.projectId))
    .limit(1);
  if (!project) throw new Error("项目不存在");

  const id = uuidv4();
  const now = nowIso();

  await db.insert(opcRevenueShares).values({
    id,
    projectId: input.projectId,
    sharePercent: input.sharePercent,
    effectiveFrom: input.effectiveFrom ?? now.slice(0, 10),
    createdAt: now,
  });

  await logAudit({
    entityType: "opc_revenue_share",
    entityId: id,
    action: "create",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { id };
}

export async function createOpcAgreement(input: {
  partnerId: string;
  title: string;
  fileUrl?: string;
  signedAt?: string;
}) {
  const session = await requireSession();
  if (!canManageOpc(session)) throw new Error("FORBIDDEN");

  const id = uuidv4();
  const now = nowIso();

  await db.insert(opcAgreements).values({
    id,
    partnerId: input.partnerId,
    title: input.title,
    fileUrl: input.fileUrl ?? null,
    signedAt: input.signedAt ?? null,
    createdAt: now,
  });

  await logAudit({
    entityType: "opc_agreement",
    entityId: id,
    action: "create",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { id };
}

export async function signOpcAgreement(agreementId: string) {
  const session = await requireSession();
  if (!canManageOpc(session)) throw new Error("FORBIDDEN");

  const now = nowIso();
  await db
    .update(opcAgreements)
    .set({ signedAt: now })
    .where(eq(opcAgreements.id, agreementId));

  await logAudit({
    entityType: "opc_agreement",
    entityId: agreementId,
    action: "sign",
    actorId: session.id,
  });

  refresh();
  return { success: true };
}

export async function deleteOpcPartner(id: string) {
  const session = await requireSession();
  if (!canManageOpc(session)) throw new Error("FORBIDDEN");

  const projects = await db
    .select()
    .from(opcProjects)
    .where(eq(opcProjects.partnerId, id));

  for (const project of projects) {
    await db
      .delete(opcRevenueShares)
      .where(eq(opcRevenueShares.projectId, project.id));
  }
  await db.delete(opcProjects).where(eq(opcProjects.partnerId, id));
  await db.delete(opcAgreements).where(eq(opcAgreements.partnerId, id));
  await db.delete(opcPartners).where(eq(opcPartners.id, id));

  await logAudit({
    entityType: "opc_partner",
    entityId: id,
    action: "delete",
    actorId: session.id,
  });

  refresh();
  return { success: true };
}

export async function createOpcProjectForm(formData: FormData) {
  await createOpcProject({
    partnerId: reqFormId(formData, "partnerId"),
    projectName: String(formData.get("projectName") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
}

export async function createOpcAgreementForm(formData: FormData) {
  await createOpcAgreement({
    partnerId: reqFormId(formData, "partnerId"),
    title: String(formData.get("title") ?? ""),
    fileUrl: String(formData.get("fileUrl") ?? "") || undefined,
    signedAt: String(formData.get("signedAt") ?? "") || undefined,
  });
}

export async function createOpcPartnerForm(formData: FormData) {
  await createOpcPartner({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "") || undefined,
    phone: String(formData.get("phone") ?? "") || undefined,
    advantages: String(formData.get("advantages") ?? "") || undefined,
    candidateId: String(formData.get("candidateId") ?? "") || undefined,
  });
}

export async function setRevenueShareForm(formData: FormData) {
  await setRevenueShare({
    projectId: reqFormId(formData, "projectId"),
    sharePercent: Number(formData.get("sharePercent") ?? 0),
    effectiveFrom: String(formData.get("effectiveFrom") ?? "") || undefined,
  });
}

export async function getOpcCeoOverview() {
  const session = await requireSession();
  if (!hasRole(session, "ceo", "ops_manager")) throw new Error("无权限");

  const partners = await db.select().from(opcPartners);
  const projects = await db.select().from(opcProjects);
  const shares = await db.select().from(opcRevenueShares);

  return {
    partnerCount: partners.length,
    activePartners: partners.filter((p) => p.status === "active").length,
    projectCount: projects.length,
    avgShare:
      shares.length > 0
        ? Math.round(
            shares.reduce((s, r) => s + r.sharePercent, 0) / shares.length
          )
        : 0,
  };
}
