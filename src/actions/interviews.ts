"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db";
import {
  archivedRecruitmentRequests,
  candidates,
  hiringDecisions,
  interviewAnalyses,
  interviewQuestions,
  interviewRecords,
  interviewSessions,
  jobPositions,
  opcPartners,
  recruitmentRequests,
  routingSuggestions,
  salaryProfiles,
  salaryStatusHistory,
  trainingPlans,
  users,
} from "@/db/schema";
import { DEMO_USER_PASSWORD, hashPassword } from "@/lib/auth/password";
import { requireSession } from "@/lib/auth/session";
import {
  canMakeHiringDecision,
  canViewInterviewData,
  hasRole,
} from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { getAiService } from "@/lib/services";
import { reqFormId } from "@/lib/form-data";
import { nowIso } from "@/lib/utils/time";

export async function getCandidates() {
  const session = await requireSession();
  if (!canViewInterviewData(session)) return [];
  return db.select().from(candidates).orderBy(desc(candidates.updatedAt));
}

export async function getCandidate(id: string) {
  const session = await requireSession();
  if (!canViewInterviewData(session)) return null;
  const [c] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, id))
    .limit(1);
  return c ?? null;
}

export async function getCandidateQuestions(candidateId: string) {
  await requireSession();
  return db
    .select()
    .from(interviewQuestions)
    .where(eq(interviewQuestions.candidateId, candidateId));
}

export async function getCandidateAnalysis(candidateId: string) {
  await requireSession();
  const rows = await db
    .select()
    .from(interviewAnalyses)
    .where(eq(interviewAnalyses.candidateId, candidateId))
    .orderBy(desc(interviewAnalyses.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCandidateRouting(candidateId: string) {
  await requireSession();
  return db
    .select()
    .from(routingSuggestions)
    .where(eq(routingSuggestions.candidateId, candidateId))
    .orderBy(desc(routingSuggestions.createdAt));
}

export async function getInterviewRecords(candidateId: string) {
  await requireSession();
  return db
    .select()
    .from(interviewRecords)
    .where(eq(interviewRecords.candidateId, candidateId))
    .orderBy(desc(interviewRecords.createdAt));
}

export async function createCandidate(input: {
  name: string;
  email?: string;
  phone?: string;
  resumeSummary?: string;
  advantages?: string;
  trainingDirection?: string;
  targetJobPositionId?: string;
  isKeyCandidate?: boolean;
}) {
  const session = await requireSession();
  if (!hasRole(session, "hr")) throw new Error("仅 HR 可建档");

  const now = nowIso();
  const id = uuidv4();
  await db.insert(candidates).values({
    id,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    resumeSummary: input.resumeSummary ?? null,
    advantages: input.advantages ?? null,
    trainingDirection: input.trainingDirection ?? null,
    stage: "screening",
    targetJobPositionId: input.targetJobPositionId ?? null,
    isKeyCandidate: input.isKeyCandidate ?? false,
    createdAt: now,
    updatedAt: now,
  });

  await logAudit({
    entityType: "candidate",
    entityId: id,
    action: "create",
    actorId: session.id,
    payload: { name: input.name },
  });

  revalidatePath("/dashboard/interviews");
  return { id };
}

export async function updateCandidate(
  id: string,
  input: {
    name?: string;
    email?: string;
    phone?: string;
    resumeSummary?: string;
    advantages?: string;
    trainingDirection?: string;
    targetJobPositionId?: string;
    isKeyCandidate?: boolean;
    stage?: string;
  }
) {
  const session = await requireSession();
  if (!hasRole(session, "hr")) throw new Error("仅 HR 可编辑");

  const [existing] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, id))
    .limit(1);
  if (!existing) throw new Error("候选人不存在");

  const now = nowIso();
  await db
    .update(candidates)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.resumeSummary !== undefined && {
        resumeSummary: input.resumeSummary,
      }),
      ...(input.advantages !== undefined && { advantages: input.advantages }),
      ...(input.trainingDirection !== undefined && {
        trainingDirection: input.trainingDirection,
      }),
      ...(input.targetJobPositionId !== undefined && {
        targetJobPositionId: input.targetJobPositionId,
      }),
      ...(input.isKeyCandidate !== undefined && {
        isKeyCandidate: input.isKeyCandidate,
      }),
      ...(input.stage !== undefined && { stage: input.stage }),
      updatedAt: now,
    })
    .where(eq(candidates.id, id));

  await logAudit({
    entityType: "candidate",
    entityId: id,
    action: "update",
    actorId: session.id,
    payload: input,
  });

  revalidatePath("/dashboard/interviews");
  return { success: true };
}

export async function saveInterviewRecord(input: {
  candidateId: string;
  content?: string;
  recordingUrl?: string;
  demeanorNote?: string;
  demeanorScore?: number;
}) {
  const session = await requireSession();
  if (!hasRole(session, "hr")) throw new Error("仅 HR 可录入");

  const now = nowIso();
  const sessionId = uuidv4();
  await db.insert(interviewSessions).values({
    id: sessionId,
    candidateId: input.candidateId,
    interviewerId: session.id,
    completedAt: now,
    status: "completed",
    createdAt: now,
  });

  await db.insert(interviewRecords).values({
    id: uuidv4(),
    sessionId,
    candidateId: input.candidateId,
    content: input.content ?? null,
    recordingUrl: input.recordingUrl ?? null,
    demeanorNote: input.demeanorNote ?? null,
    demeanorScore: input.demeanorScore ?? null,
    createdAt: now,
  });

  await db
    .update(candidates)
    .set({
      stage:
        input.demeanorNote || input.content ? "interviewing" : "screening",
      updatedAt: now,
    })
    .where(eq(candidates.id, input.candidateId));

  await logAudit({
    entityType: "interview_record",
    entityId: input.candidateId,
    action: "save",
    actorId: session.id,
  });

  revalidatePath("/dashboard/interviews");
  return { success: true };
}

export async function generateInterviewQuestions(candidateId: string) {
  const session = await requireSession();
  const candidate = await getCandidate(candidateId);
  if (!candidate) throw new Error("候选人不存在");

  const [job] = candidate.targetJobPositionId
    ? await db
        .select()
        .from(jobPositions)
        .where(eq(jobPositions.id, candidate.targetJobPositionId))
        .limit(1)
    : [null];

  const ai = getAiService();
  const questions = await ai.generateInterviewQuestions({
    candidateName: candidate.name,
    advantages: candidate.advantages ?? "",
    jobTitle: job?.title ?? "待定岗位",
    expectedResult: job?.expectedResult ?? "",
  });

  const now = nowIso();
  for (let i = 0; i < questions.length; i++) {
    await db.insert(interviewQuestions).values({
      id: uuidv4(),
      candidateId,
      questionType: questions[i].questionType,
      content: questions[i].content,
      sortOrder: i,
      createdAt: now,
    });
  }

  await db
    .update(candidates)
    .set({ stage: "interviewing", updatedAt: now })
    .where(eq(candidates.id, candidateId));

  revalidatePath("/dashboard/interviews");
}

export async function analyzeInterview(candidateId: string) {
  await requireSession();
  const candidate = await getCandidate(candidateId);
  if (!candidate) throw new Error("候选人不存在");

  const records = await db
    .select()
    .from(interviewRecords)
    .where(eq(interviewRecords.candidateId, candidateId))
    .limit(1);
  const [job] = candidate.targetJobPositionId
    ? await db
        .select()
        .from(jobPositions)
        .where(eq(jobPositions.id, candidate.targetJobPositionId))
        .limit(1)
    : [null];

  const ai = getAiService();
  const analysis = await ai.analyzeInterview({
    candidateName: candidate.name,
    resumeSummary: candidate.resumeSummary ?? "",
    interviewContent: records[0]?.content ?? "",
    jobTitle: job?.title ?? "",
  });

  const now = nowIso();
  await db.insert(interviewAnalyses).values({
    id: uuidv4(),
    candidateId,
    advantagesJson: JSON.stringify(analysis.advantages),
    skillScoresJson: JSON.stringify(analysis.skillScores),
    risksJson: JSON.stringify(analysis.risks),
    reasoningChain: analysis.reasoningChain,
    overallScore: analysis.overallScore,
    createdAt: now,
  });

  await db
    .update(candidates)
    .set({ stage: "ai_analysis", updatedAt: now })
    .where(eq(candidates.id, candidateId));

  revalidatePath("/dashboard/interviews");
}

export async function suggestRouting(candidateId: string) {
  await requireSession();
  const candidate = await getCandidate(candidateId);
  if (!candidate) throw new Error("候选人不存在");

  const analysisRow = await getCandidateAnalysis(candidateId);
  const jobs = await db.select().from(jobPositions);
  const ai = getAiService();

  const analysis = analysisRow
    ? {
        advantages: JSON.parse(analysisRow.advantagesJson ?? "[]"),
        skillScores: JSON.parse(analysisRow.skillScoresJson ?? "[]"),
        risks: JSON.parse(analysisRow.risksJson ?? "[]"),
        reasoningChain: analysisRow.reasoningChain ?? "",
        overallScore: analysisRow.overallScore ?? 0,
      }
    : {
        advantages: [],
        skillScores: [],
        risks: [],
        reasoningChain: "",
        overallScore: 0,
      };

  const suggestions = await ai.suggestRouting({
    candidateName: candidate.name,
    advantages: candidate.advantages ?? "",
    analysis,
    availableJobs: jobs.map((j) => ({ id: j.id, title: j.title })),
  });

  const now = nowIso();
  for (const s of suggestions) {
    await db.insert(routingSuggestions).values({
      id: uuidv4(),
      candidateId,
      routeType: s.routeType,
      suggestedJobPositionId: s.suggestedJobTitle
        ? jobs.find((j) => j.title === s.suggestedJobTitle)?.id
        : null,
      opcProjectHint: s.opcProjectHint ?? null,
      rationale: s.rationale,
      confidence: s.confidence ?? null,
      createdAt: now,
    });
  }

  await db
    .update(candidates)
    .set({ stage: "ceo_review", updatedAt: now })
    .where(eq(candidates.id, candidateId));

  revalidatePath("/dashboard/interviews");
}

async function provisionEmployeeHire(
  candidate: typeof candidates.$inferSelect,
  actorId: string
) {
  const now = nowIso();
  const [job] = candidate.targetJobPositionId
    ? await db
        .select()
        .from(jobPositions)
        .where(eq(jobPositions.id, candidate.targetJobPositionId))
        .limit(1)
    : [null];

  const email =
    candidate.email?.trim() ||
    `${candidate.name.replace(/\s+/g, "").toLowerCase()}@shixuan.com`;

  const passwordHash = await hashPassword(DEMO_USER_PASSWORD);

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let userId = existingUser?.id;
  if (existingUser) {
    await db
      .update(users)
      .set({
        name: candidate.name,
        role: "newcomer",
        departmentId: job?.departmentId ?? existingUser.departmentId,
        jobPositionId: candidate.targetJobPositionId ?? existingUser.jobPositionId,
        passwordHash: existingUser.passwordHash || passwordHash,
        updatedAt: now,
      })
      .where(eq(users.id, existingUser.id));
  } else {
    userId = uuidv4();
    await db.insert(users).values({
      id: userId,
      name: candidate.name,
      email,
      passwordHash,
      role: "newcomer",
      departmentId: job?.departmentId ?? null,
      jobPositionId: candidate.targetJobPositionId ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  const [existingSalary] = await db
    .select()
    .from(salaryProfiles)
    .where(eq(salaryProfiles.userId, userId!))
    .limit(1);

  if (!existingSalary) {
    const profileId = uuidv4();
    await db.insert(salaryProfiles).values({
      id: profileId,
      userId: userId!,
      baseSalary: 8000,
      salaryRatio: 0.8,
      status: "training",
      auditStatus: "draft",
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(salaryStatusHistory).values({
      id: uuidv4(),
      salaryProfileId: profileId,
      fromStatus: null,
      toStatus: "training",
      fromRatio: null,
      toRatio: 0.8,
      changedById: actorId,
      reason: "录用员工自动建档（培训期 80%）",
      createdAt: now,
    });
  }

  const [existingPlan] = await db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.userId, userId!))
    .limit(1);

  if (!existingPlan) {
    const expectedEnd = new Date();
    expectedEnd.setDate(expectedEnd.getDate() + 90);
    await db.insert(trainingPlans).values({
      id: uuidv4(),
      userId: userId!,
      status: "in_progress",
      startedAt: now,
      expectedEndAt: expectedEnd.toISOString().slice(0, 10),
      createdAt: now,
    });
  }

  return userId!;
}

async function provisionOpcHire(
  candidate: typeof candidates.$inferSelect,
  actorId: string
) {
  const now = nowIso();
  const [existing] = await db
    .select()
    .from(opcPartners)
    .where(eq(opcPartners.candidateId, candidate.id))
    .limit(1);

  if (existing) return existing.id;

  const partnerId = uuidv4();
  await db.insert(opcPartners).values({
    id: partnerId,
    candidateId: candidate.id,
    name: candidate.name,
    email: candidate.email ?? null,
    phone: candidate.phone ?? null,
    advantages: candidate.advantages ?? null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  await logAudit({
    entityType: "opc_partner",
    entityId: partnerId,
    action: "auto_create_from_hire",
    actorId,
    payload: { candidateId: candidate.id },
  });

  return partnerId;
}

export async function adjustFlexibleJob(formData: FormData) {
  const session = await requireSession();
  if (!hasRole(session, "hr")) throw new Error("仅 HR 可调整弹性岗位");

  const candidateId = reqFormId(formData, "candidateId");
  const newJobPositionId = reqFormId(formData, "newJobPositionId");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("请填写调整原因");

  const candidate = await getCandidate(candidateId);
  if (!candidate) throw new Error("候选人不存在");

  const now = nowIso();
  let originalTitle = "原目标岗位";
  let originalJobId = candidate.targetJobPositionId ?? "";
  let originalRequestId = candidate.recruitmentRequestId ?? uuidv4();

  if (candidate.recruitmentRequestId) {
    const [req] = await db
      .select()
      .from(recruitmentRequests)
      .where(eq(recruitmentRequests.id, candidate.recruitmentRequestId))
      .limit(1);
    if (req) {
      originalTitle = req.title;
      originalJobId = req.jobPositionId;
      originalRequestId = req.id;
    }
  } else if (candidate.targetJobPositionId) {
    const [job] = await db
      .select()
      .from(jobPositions)
      .where(eq(jobPositions.id, candidate.targetJobPositionId))
      .limit(1);
    if (job) originalTitle = job.title;
  }

  await db.insert(archivedRecruitmentRequests).values({
    id: uuidv4(),
    originalRequestId,
    candidateId,
    originalTitle,
    originalJobPositionId: originalJobId || newJobPositionId,
    newJobPositionId,
    reason,
    archivedAt: now,
  });

  await db
    .update(candidates)
    .set({ targetJobPositionId: newJobPositionId, updatedAt: now })
    .where(eq(candidates.id, candidateId));

  await logAudit({
    entityType: "candidate",
    entityId: candidateId,
    action: "flexible_job_adjust",
    actorId: session.id,
    payload: { newJobPositionId, reason },
  });

  revalidatePath("/dashboard/interviews");
}

export async function getInterviewPipelineStats() {
  const session = await requireSession();
  if (!canViewInterviewData(session)) return null;
  if (!hasRole(session, "ceo", "ops_manager", "hr")) return null;

  const all = await db.select().from(candidates);
  const byStage: Record<string, number> = {};
  for (const c of all) {
    byStage[c.stage] = (byStage[c.stage] ?? 0) + 1;
  }
  return {
    total: all.length,
    keyCount: all.filter((c) => c.isKeyCandidate).length,
    byStage,
  };
}

export async function makeHiringDecision(
  candidateId: string,
  formData: FormData
) {
  const session = await requireSession();
  if (!canMakeHiringDecision(session)) throw new Error("仅 CEO 可决策");

  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "");

  await db.insert(hiringDecisions).values({
    id: uuidv4(),
    candidateId,
    decision,
    decidedById: session.id,
    notes: notes || null,
    createdAt: nowIso(),
  });

  const stage =
    decision === "hire_employee"
      ? "hired_employee"
      : decision === "hire_opc"
        ? "hired_opc"
        : "rejected";

  await db
    .update(candidates)
    .set({ stage, updatedAt: nowIso() })
    .where(eq(candidates.id, candidateId));

  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);

  if (candidate && decision === "hire_employee") {
    const userId = await provisionEmployeeHire(candidate, session.id);
    await logAudit({
      entityType: "hiring_provision",
      entityId: candidateId,
      action: "employee_onboard",
      actorId: session.id,
      payload: { userId },
    });
  } else if (candidate && decision === "hire_opc") {
    const partnerId = await provisionOpcHire(candidate, session.id);
    await logAudit({
      entityType: "hiring_provision",
      entityId: candidateId,
      action: "opc_onboard",
      actorId: session.id,
      payload: { partnerId },
    });
  }

  await logAudit({
    entityType: "hiring_decision",
    entityId: candidateId,
    action: decision,
    actorId: session.id,
    payload: { notes },
  });

  revalidatePath("/dashboard/interviews");
  revalidatePath("/dashboard/salary");
  revalidatePath("/dashboard/training");
  revalidatePath("/dashboard/opc");
}

export async function generateInterviewQuestionsForm(formData: FormData) {
  await generateInterviewQuestions(reqFormId(formData, "candidateId"));
}

export async function analyzeInterviewForm(formData: FormData) {
  await analyzeInterview(reqFormId(formData, "candidateId"));
}

export async function suggestRoutingForm(formData: FormData) {
  await suggestRouting(reqFormId(formData, "candidateId"));
}

export async function adjustFlexibleJobForm(formData: FormData) {
  await adjustFlexibleJob(formData);
}

export async function makeHiringDecisionForm(formData: FormData) {
  await makeHiringDecision(reqFormId(formData, "candidateId"), formData);
}

export async function createCandidateForm(formData: FormData) {
  await createCandidate({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "") || undefined,
    phone: String(formData.get("phone") ?? "") || undefined,
    resumeSummary: String(formData.get("resumeSummary") ?? "") || undefined,
    advantages: String(formData.get("advantages") ?? "") || undefined,
    trainingDirection: String(formData.get("trainingDirection") ?? "") || undefined,
    targetJobPositionId: String(formData.get("targetJobPositionId") ?? "") || undefined,
    isKeyCandidate: formData.get("isKeyCandidate") === "on",
  });
}

export async function updateCandidateForm(formData: FormData) {
  await updateCandidate(reqFormId(formData, "candidateId"), {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "") || undefined,
    phone: String(formData.get("phone") ?? "") || undefined,
    resumeSummary: String(formData.get("resumeSummary") ?? "") || undefined,
    advantages: String(formData.get("advantages") ?? "") || undefined,
    trainingDirection: String(formData.get("trainingDirection") ?? "") || undefined,
    targetJobPositionId: String(formData.get("targetJobPositionId") ?? "") || undefined,
    isKeyCandidate: formData.get("isKeyCandidate") === "on",
  });
}

export async function saveInterviewRecordForm(formData: FormData) {
  await saveInterviewRecord({
    candidateId: reqFormId(formData, "candidateId"),
    content: String(formData.get("content") ?? "") || undefined,
    recordingUrl: String(formData.get("recordingUrl") ?? "") || undefined,
    demeanorNote: String(formData.get("demeanorNote") ?? "") || undefined,
    demeanorScore: Number(formData.get("demeanorScore") ?? 0) || undefined,
  });
}

export async function getCandidateRecords(candidateId: string) {
  return getInterviewRecords(candidateId);
}
