"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db";
import { promotionConditionRules } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { reqFormId } from "@/lib/form-data";
import { nowIso } from "@/lib/utils/time";

export async function getPromotionConditionRules() {
  await requireSession();
  return db.select().from(promotionConditionRules);
}

export async function getPromotionConditionRule(id: string) {
  await requireSession();
  const [rule] = await db
    .select()
    .from(promotionConditionRules)
    .where(eq(promotionConditionRules.id, id))
    .limit(1);
  return rule ?? null;
}

export async function createPromotionConditionRule(formData: FormData) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "ops_manager")) throw new Error("无权限");

  const id = uuidv4();
  await db.insert(promotionConditionRules).values({
    id,
    pathType: String(formData.get("pathType") ?? ""),
    levelName: String(formData.get("levelName") ?? ""),
    conditionTitle: String(formData.get("conditionTitle") ?? ""),
    conditionDescription: String(formData.get("conditionDescription") ?? ""),
    metricKey: String(formData.get("metricKey") ?? "") || null,
    targetValue: String(formData.get("targetValue") ?? "") || null,
    createdAt: nowIso(),
  });
  revalidatePath("/dashboard/promotion-conditions");
  return id;
}

export async function updatePromotionConditionRule(
  id: string,
  formData: FormData
) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "ops_manager")) throw new Error("无权限");

  await db
    .update(promotionConditionRules)
    .set({
      pathType: String(formData.get("pathType") ?? ""),
      levelName: String(formData.get("levelName") ?? ""),
      conditionTitle: String(formData.get("conditionTitle") ?? ""),
      conditionDescription: String(formData.get("conditionDescription") ?? ""),
      metricKey: String(formData.get("metricKey") ?? "") || null,
      targetValue: String(formData.get("targetValue") ?? "") || null,
    })
    .where(eq(promotionConditionRules.id, id));
  revalidatePath("/dashboard/promotion-conditions");
}

export async function deletePromotionConditionRule(id: string) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "ops_manager")) throw new Error("无权限");

  await db
    .delete(promotionConditionRules)
    .where(eq(promotionConditionRules.id, id));
  revalidatePath("/dashboard/promotion-conditions");
}

export async function updatePromotionConditionRuleForm(formData: FormData) {
  await updatePromotionConditionRule(reqFormId(formData, "ruleId"), formData);
}

export async function deletePromotionConditionRuleForm(formData: FormData) {
  await deletePromotionConditionRule(reqFormId(formData, "ruleId"));
}

export async function createPromotionConditionRuleForm(formData: FormData) {
  await createPromotionConditionRule(formData);
}
