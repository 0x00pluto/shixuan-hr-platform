import { v4 as uuidv4 } from "uuid";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function logAudit(params: {
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string | null;
  payload?: unknown;
}) {
  const now = new Date().toISOString();
  await db.insert(auditLogs).values({
    id: uuidv4(),
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    actorId: params.actorId ?? null,
    payloadJson: params.payload ? JSON.stringify(params.payload) : null,
    createdAt: now,
  });
}
