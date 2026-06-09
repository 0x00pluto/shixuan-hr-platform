"use server";

import { refresh } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  mbtiAssessments,
  mbtiResults,
  candidates,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import {
  canManageJobs,
  canViewInterviewData,
} from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { reqFormId } from "@/lib/form-data";
import { nowIso } from "@/lib/utils/time";

const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;

function mockMbtiResult(candidateName: string) {
  const hash = candidateName
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const typeCode = MBTI_TYPES[hash % MBTI_TYPES.length];

  const dimensions = {
    EI: hash % 2 === 0 ? "E" : "I",
    SN: hash % 3 === 0 ? "S" : "N",
    TF: hash % 4 === 0 ? "T" : "F",
    JP: hash % 5 === 0 ? "J" : "P",
  };

  const summaries: Record<string, string> = {
    INTJ: "战略型思考者，擅长独立规划与系统性解决问题",
    ENFP: "热情创意型，善于沟通与激发团队活力",
    ISTJ: "务实可靠型，注重细节与流程规范",
    ESTP: "行动导向型，适应变化快、执行力强",
  };

  return {
    typeCode,
    dimensionsJson: JSON.stringify(dimensions),
    summary:
      summaries[typeCode] ??
      `${candidateName} 的 MBTI 类型为 ${typeCode}，具备与岗位匹配的特质组合`,
  };
}

export async function startMbtiAssessmentFromForm(formData: FormData) {
  const candidateId = String(formData.get("candidateId") ?? "");
  if (!candidateId) throw new Error("候选人 ID 不能为空");
  await startMbtiAssessment(candidateId);
}

export async function startMbtiAssessment(candidateId: string) {
  const session = await requireSession();
  if (!canManageJobs(session)) throw new Error("FORBIDDEN");

  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!candidate) throw new Error("候选人不存在");

  const now = nowIso();
  const id = uuidv4();

  await db.insert(mbtiAssessments).values({
    id,
    candidateId,
    status: "in_progress",
    createdAt: now,
  });

  await logAudit({
    entityType: "mbti_assessment",
    entityId: id,
    action: "start",
    actorId: session.id,
    payload: { candidateId },
  });

  refresh();
  return { id };
}

export async function completeMbtiAssessment(assessmentId: string) {
  const session = await requireSession();
  if (!canManageJobs(session)) throw new Error("FORBIDDEN");

  const [assessment] = await db
    .select()
    .from(mbtiAssessments)
    .where(eq(mbtiAssessments.id, assessmentId))
    .limit(1);
  if (!assessment) throw new Error("测评不存在");

  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, assessment.candidateId))
    .limit(1);
  if (!candidate) throw new Error("候选人不存在");

  const mock = mockMbtiResult(candidate.name);
  const now = nowIso();
  const resultId = uuidv4();

  await db.insert(mbtiResults).values({
    id: resultId,
    assessmentId,
    typeCode: mock.typeCode,
    dimensionsJson: mock.dimensionsJson,
    summary: mock.summary,
    createdAt: now,
  });

  await db
    .update(mbtiAssessments)
    .set({ status: "completed" })
    .where(eq(mbtiAssessments.id, assessmentId));

  await logAudit({
    entityType: "mbti_assessment",
    entityId: assessmentId,
    action: "complete",
    actorId: session.id,
    payload: { typeCode: mock.typeCode },
  });

  refresh();
  return {
    resultId,
    typeCode: mock.typeCode,
    summary: mock.summary,
    dimensions: JSON.parse(mock.dimensionsJson),
  };
}

export async function getMbtiAssessment(assessmentId: string) {
  const session = await requireSession();
  if (!canViewInterviewData(session)) throw new Error("FORBIDDEN");

  const [assessment] = await db
    .select()
    .from(mbtiAssessments)
    .where(eq(mbtiAssessments.id, assessmentId))
    .limit(1);
  if (!assessment) return null;

  const [result] = await db
    .select()
    .from(mbtiResults)
    .where(eq(mbtiResults.assessmentId, assessmentId))
    .limit(1);

  return {
    ...assessment,
    result: result
      ? {
          ...result,
          dimensions: result.dimensionsJson
            ? JSON.parse(result.dimensionsJson)
            : null,
        }
      : null,
  };
}

export async function getMbtiByCandidate(candidateId: string) {
  const session = await requireSession();
  if (!canViewInterviewData(session)) throw new Error("FORBIDDEN");

  const assessments = await db
    .select()
    .from(mbtiAssessments)
    .where(eq(mbtiAssessments.candidateId, candidateId))
    .orderBy(desc(mbtiAssessments.createdAt));

  const withResults = await Promise.all(
    assessments.map(async (a) => {
      const [result] = await db
        .select()
        .from(mbtiResults)
        .where(eq(mbtiResults.assessmentId, a.id))
        .limit(1);
      return {
        ...a,
        result: result
          ? {
              ...result,
              dimensions: result.dimensionsJson
                ? JSON.parse(result.dimensionsJson)
                : null,
            }
          : null,
      };
    })
  );

  return withResults;
}

export async function listMbtiAssessments(status?: string) {
  const session = await requireSession();
  if (!canViewInterviewData(session)) throw new Error("FORBIDDEN");

  const rows = await db
    .select({
      assessment: mbtiAssessments,
      candidateName: candidates.name,
    })
    .from(mbtiAssessments)
    .innerJoin(candidates, eq(mbtiAssessments.candidateId, candidates.id))
    .orderBy(desc(mbtiAssessments.createdAt));

  const filtered = status
    ? rows.filter((r) => r.assessment.status === status)
    : rows;

  return filtered.map((r) => ({
    ...r.assessment,
    candidateName: r.candidateName,
  }));
}

export async function completeMbtiAssessmentForm(formData: FormData) {
  await completeMbtiAssessment(reqFormId(formData, "assessmentId"));
}
