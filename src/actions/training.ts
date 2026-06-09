"use server";

import { refresh, revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  trainingPlans,
  trainingExams,
  examQuestions,
  examAttempts,
  trainingExtensions,
  ceoTrainingAcceptances,
  salaryProfiles,
  salaryStatusHistory,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import {
  canMakeHiringDecision,
  hasRole,
} from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { reqFormId } from "@/lib/form-data";
import { nowIso } from "@/lib/utils/time";
import { getAiService } from "@/lib/services";

export async function createTrainingPlan(input: {
  userId: string;
  expectedEndAt?: string;
}) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "dept_leader")) throw new Error("FORBIDDEN");

  const now = nowIso();
  const id = uuidv4();

  await db.insert(trainingPlans).values({
    id,
    userId: input.userId,
    status: "in_progress",
    startedAt: now,
    expectedEndAt: input.expectedEndAt ?? null,
    createdAt: now,
  });

  await logAudit({
    entityType: "training_plan",
    entityId: id,
    action: "create",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { id };
}

export async function getTrainingPlan(id: string) {
  const session = await requireSession();

  const [plan] = await db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.id, id))
    .limit(1);
  if (!plan) return null;

  const isOwner = plan.userId === session.id;
  const isManager = hasRole(session, "ceo", "ops_manager", "hr", "dept_leader");
  if (!isOwner && !isManager) throw new Error("FORBIDDEN");

  const exams = await db
    .select()
    .from(trainingExams)
    .where(eq(trainingExams.trainingPlanId, id));

  const extensions = await db
    .select()
    .from(trainingExtensions)
    .where(eq(trainingExtensions.trainingPlanId, id));

  const [acceptance] = await db
    .select()
    .from(ceoTrainingAcceptances)
    .where(eq(ceoTrainingAcceptances.trainingPlanId, id))
    .limit(1);

  const examsWithAttempts = await Promise.all(
    exams.map(async (exam) => {
      const questions = await db
        .select()
        .from(examQuestions)
        .where(eq(examQuestions.examId, exam.id));
      const attempts = await db
        .select()
        .from(examAttempts)
        .where(eq(examAttempts.examId, exam.id))
        .orderBy(desc(examAttempts.attemptedAt));
      return { ...exam, questions, attempts };
    })
  );

  return {
    ...plan,
    exams: examsWithAttempts,
    extensions,
    ceoAcceptance: acceptance,
  };
}

export async function listTrainingPlans(userId?: string) {
  const session = await requireSession();
  const targetUserId = userId ?? session.id;

  const isSelf = targetUserId === session.id;
  const isManager = hasRole(session, "ceo", "ops_manager", "hr", "dept_leader");
  if (!isSelf && !isManager) throw new Error("FORBIDDEN");

  return db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.userId, targetUserId))
    .orderBy(desc(trainingPlans.createdAt));
}

export async function createTrainingExam(input: {
  trainingPlanId: string;
  title: string;
  passThreshold?: number;
  skillTags?: string[];
}) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "tech_director", "dept_leader")) {
    throw new Error("FORBIDDEN");
  }

  const now = nowIso();
  const examId = uuidv4();

  await db.insert(trainingExams).values({
    id: examId,
    trainingPlanId: input.trainingPlanId,
    title: input.title,
    passThreshold: input.passThreshold ?? 0.8,
    createdAt: now,
  });

  const ai = getAiService();
  const generated = await ai.generateExamQuestions({
    skills: input.skillTags ?? ["通用技能"],
    count: 5,
  });

  await db.insert(examQuestions).values(
    generated.map((q, idx) => ({
      id: uuidv4(),
      examId,
      questionType: q.questionType,
      content: q.content,
      optionsJson: q.options ? JSON.stringify(q.options) : null,
      correctAnswer: q.correctAnswer,
      sortOrder: idx,
    }))
  );

  await logAudit({
    entityType: "training_exam",
    entityId: examId,
    action: "create",
    actorId: session.id,
    payload: { title: input.title, questionCount: generated.length },
  });

  refresh();
  return { examId };
}

export async function submitExamAttempt(input: {
  examId: string;
  answers: Record<string, string>;
}) {
  const session = await requireSession();

  const questions = await db
    .select()
    .from(examQuestions)
    .where(eq(examQuestions.examId, input.examId))
    .orderBy(examQuestions.sortOrder);

  const examQuestionsFormatted = questions.map((q) => ({
    questionType: q.questionType as "practical" | "choice",
    content: q.content,
    options: q.optionsJson ? (JSON.parse(q.optionsJson) as string[]) : undefined,
    correctAnswer: q.correctAnswer,
  }));

  const ai = getAiService();
  const result = await ai.scoreExam(examQuestionsFormatted, input.answers);

  const [exam] = await db
    .select()
    .from(trainingExams)
    .where(eq(trainingExams.id, input.examId))
    .limit(1);

  const passed = result.score >= (exam?.passThreshold ?? 0.8);
  const now = nowIso();
  const id = uuidv4();

  await db.insert(examAttempts).values({
    id,
    examId: input.examId,
    userId: session.id,
    answersJson: JSON.stringify(input.answers),
    score: result.score,
    passed,
    attemptedAt: now,
  });

  await logAudit({
    entityType: "exam_attempt",
    entityId: id,
    action: "submit",
    actorId: session.id,
    payload: { score: result.score, passed },
  });

  refresh();
  return { id, score: result.score, passed, details: result.details };
}

export async function requestTrainingExtension(input: {
  trainingPlanId: string;
  reason: string;
  extendedDays?: number;
}) {
  const session = await requireSession();

  const [plan] = await db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.id, input.trainingPlanId))
    .limit(1);
  if (!plan) throw new Error("培训计划不存在");

  const isOwner = plan.userId === session.id;
  const isManager = hasRole(session, "hr", "dept_leader");
  if (!isOwner && !isManager) throw new Error("FORBIDDEN");

  const id = uuidv4();
  const now = nowIso();

  await db.insert(trainingExtensions).values({
    id,
    trainingPlanId: input.trainingPlanId,
    reason: input.reason,
    extendedDays: input.extendedDays ?? 7,
    approvedById: isManager ? session.id : null,
    createdAt: now,
  });

  if (isManager && plan.expectedEndAt) {
    const newEnd = new Date(plan.expectedEndAt);
    newEnd.setDate(newEnd.getDate() + (input.extendedDays ?? 7));
    await db
      .update(trainingPlans)
      .set({ expectedEndAt: newEnd.toISOString().slice(0, 10) })
      .where(eq(trainingPlans.id, input.trainingPlanId));
  }

  await logAudit({
    entityType: "training_extension",
    entityId: id,
    action: "request",
    actorId: session.id,
    payload: input,
  });

  refresh();
  return { id };
}

export async function approveTrainingExtension(extensionId: string) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "dept_leader")) throw new Error("FORBIDDEN");

  const [extension] = await db
    .select()
    .from(trainingExtensions)
    .where(eq(trainingExtensions.id, extensionId))
    .limit(1);
  if (!extension) throw new Error("延期申请不存在");

  const now = nowIso();
  await db
    .update(trainingExtensions)
    .set({ approvedById: session.id })
    .where(eq(trainingExtensions.id, extensionId));

  const [plan] = await db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.id, extension.trainingPlanId))
    .limit(1);

  if (plan?.expectedEndAt) {
    const newEnd = new Date(plan.expectedEndAt);
    newEnd.setDate(newEnd.getDate() + extension.extendedDays);
    await db
      .update(trainingPlans)
      .set({ expectedEndAt: newEnd.toISOString().slice(0, 10) })
      .where(eq(trainingPlans.id, extension.trainingPlanId));
  }

  await logAudit({
    entityType: "training_extension",
    entityId: extensionId,
    action: "approve",
    actorId: session.id,
  });

  refresh();
  return { success: true };
}

export async function ceoAcceptTraining(input: {
  trainingPlanId: string;
  accepted: boolean;
  notes?: string;
}) {
  const session = await requireSession();
  if (!canMakeHiringDecision(session)) throw new Error("FORBIDDEN");

  const [plan] = await db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.id, input.trainingPlanId))
    .limit(1);
  if (!plan) throw new Error("培训计划不存在");

  const now = nowIso();
  const id = uuidv4();

  await db.insert(ceoTrainingAcceptances).values({
    id,
    trainingPlanId: input.trainingPlanId,
    userId: plan.userId,
    accepted: input.accepted,
    notes: input.notes ?? null,
    decidedById: session.id,
    createdAt: now,
  });

  if (input.accepted) {
    await db
      .update(trainingPlans)
      .set({ status: "completed", completedAt: now })
      .where(eq(trainingPlans.id, input.trainingPlanId));

    await triggerSalaryRegular(plan.userId, session.id);
  } else {
    await db
      .update(trainingPlans)
      .set({ status: "failed" })
      .where(eq(trainingPlans.id, input.trainingPlanId));
  }

  await logAudit({
    entityType: "training_plan",
    entityId: input.trainingPlanId,
    action: input.accepted ? "ceo_accept" : "ceo_reject",
    actorId: session.id,
    payload: { notes: input.notes },
  });

  refresh();
  return { id };
}

async function triggerSalaryRegular(userId: string, actorId: string) {
  const [profile] = await db
    .select()
    .from(salaryProfiles)
    .where(eq(salaryProfiles.userId, userId))
    .limit(1);

  if (!profile || profile.status === "regular") return;

  const now = nowIso();
  await db
    .update(salaryProfiles)
    .set({ status: "regular", salaryRatio: 1, updatedAt: now })
    .where(eq(salaryProfiles.id, profile.id));

  await db.insert(salaryStatusHistory).values({
    id: uuidv4(),
    salaryProfileId: profile.id,
    fromStatus: profile.status,
    toStatus: "regular",
    fromRatio: profile.salaryRatio,
    toRatio: 1,
    changedById: actorId,
    reason: "CEO 培训验收通过，自动转正式薪酬",
    createdAt: now,
  });

  await logAudit({
    entityType: "salary_profile",
    entityId: profile.id,
    action: "auto_regular",
    actorId,
    payload: { userId, trigger: "ceo_training_acceptance" },
  });
}

export async function completeTrainingPlan(planId: string) {
  const session = await requireSession();
  if (!hasRole(session, "hr", "dept_leader")) throw new Error("FORBIDDEN");

  const now = nowIso();
  await db
    .update(trainingPlans)
    .set({ status: "completed", completedAt: now })
    .where(eq(trainingPlans.id, planId));

  await logAudit({
    entityType: "training_plan",
    entityId: planId,
    action: "complete",
    actorId: session.id,
  });

  refresh();
  return { success: true };
}

export async function extendTrainingForm(formData: FormData) {
  await requestTrainingExtension({
    trainingPlanId: reqFormId(formData, "planId"),
    reason: String(formData.get("reason") ?? ""),
    extendedDays: Number(formData.get("extendedDays") ?? 7),
  });
}

export async function ceoAcceptTrainingForm(formData: FormData) {
  await ceoAcceptTraining({
    trainingPlanId: reqFormId(formData, "planId"),
    accepted: formData.get("accepted") === "true",
    notes: String(formData.get("notes") ?? ""),
  });
}

export async function createTrainingExamForm(formData: FormData) {
  await createTrainingExam({
    trainingPlanId: reqFormId(formData, "planId"),
    title: String(formData.get("title") ?? ""),
    passThreshold: Number(formData.get("passThreshold") ?? 0.8),
    skillTags: String(formData.get("skillTags") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  });
}

export async function submitExamAttemptForm(formData: FormData) {
  const answers: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("answer_")) {
      answers[key.replace("answer_", "")] = String(value);
    }
  }
  await submitExamAttempt({
    examId: reqFormId(formData, "examId"),
    answers,
  });
}

export async function approveTrainingExtensionForm(formData: FormData) {
  await approveTrainingExtension(reqFormId(formData, "extensionId"));
}

export async function createTrainingPlanForm(formData: FormData) {
  await createTrainingPlan({
    userId: reqFormId(formData, "userId"),
    expectedEndAt: String(formData.get("expectedEndAt") ?? "") || undefined,
  });
  revalidatePath("/dashboard/training");
}
