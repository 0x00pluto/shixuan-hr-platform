"use server";

import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  courses,
  handoverChecklists,
  performanceCapabilityStandards,
  performanceResultStandards,
  performanceReviews,
  sanJiangMingbai,
  salaryAuditSubmissions,
  salaryProfiles,
  trainingPlans,
  users,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { canViewSalary, hasRole } from "@/lib/auth/permissions";
import { todayDate } from "@/lib/utils/time";
import {
  approvePromotion as approvePromotionAction,
  ceoPromotionDecision,
  getPromotionNomination,
  listPromotionNominations,
  nominatePromotion,
} from "./promotions";
import {
  approveResignation as approveResignationAction,
  getResignationRequest,
  listResignationRequests,
  requestResignation,
  updateHandoverItem,
} from "./resignations";
import {
  approveTrainingExtension as approveTrainingExtensionAction,
  ceoAcceptTraining as ceoAcceptTrainingAction,
  createTrainingExam as createTrainingExamAction,
  getTrainingPlan,
  requestTrainingExtension,
  submitExamAttempt as submitExamAttemptAction,
} from "./training";
import {
  checkTask as checkTaskAction,
  completeTask as completeTaskAction,
  createTask as createTaskAction,
  getTask,
  getTasksOverview,
  listTasks,
} from "./tasks";
import {
  createCapabilityStandard,
  createPerformanceReview as createPerformanceReviewAction,
  createResultStandard,
  getPerformanceAnomalies,
  listCareerPaths,
  listPerformanceReviews,
} from "./performance";
import {
  createSalaryProfile as createSalaryProfileAction,
  listSalaryProfiles,
  reviewSalaryAudit as reviewSalaryAuditAction,
  setSalaryStatus,
  submitSalaryAudit as submitSalaryAuditAction,
} from "./salary";
import {
  createOpcAgreement as createOpcAgreementAction,
  createOpcProject as createOpcProjectAction,
  getOpcPartner,
  listOpcPartners,
} from "./opc";
import {
  createAttendanceRule as createAttendanceRuleAction,
  listAttendanceRecords,
  listAttendanceRules,
} from "./attendance";
import {
  createRecruitmentRetrospective as createRecruitmentRetrospectiveAction,
  createTrainingRetrospective as createTrainingRetrospectiveAction,
  listRecruitmentRetrospectives,
  listTrainingRetrospectives,
} from "./retrospectives";
import { getDeepAnalytics, listAnalyticsSnapshots } from "./analytics";
import { createJob, updateJob } from "./jobs";
import { uploadCourse, syncCourseToBitable } from "./courses";
import { generateDailyReport, annotateDailyReport } from "./daily-reports";
import {
  analyzeInterview,
  createCandidate as createCandidateAction,
  generateInterviewQuestions,
  getInterviewRecords,
  makeHiringDecision,
  saveInterviewRecord as saveInterviewRecordAction,
  suggestRouting,
  updateCandidate as updateCandidateAction,
} from "./interviews";
import {
  createPromotionConditionRule as createPromotionConditionRuleAction,
  updatePromotionConditionRule as updatePromotionConditionRuleAction,
  deletePromotionConditionRule,
} from "./promotion-conditions";
import {
  completeMbtiAssessment,
  startMbtiAssessmentFromForm,
} from "./mbti";

export {
  getPromotionNomination,
  getResignationRequest,
  getTrainingPlan,
  getTask,
  getOpcPartner,
};

function reqId(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? "");
  if (!value) throw new Error(`缺少 ${key}`);
  return value;
}

export async function completeTask(formData: FormData) {
  await completeTaskAction(reqId(formData, "taskId"));
}
export async function submitSalaryAudit(formData: FormData) {
  await submitSalaryAuditAction(reqId(formData, "profileId"));
}

// promotions
export async function getPromotionNominations() {
  return listPromotionNominations();
}
export async function getPromotionApprovals(nominationId: string) {
  const n = await getPromotionNomination(nominationId);
  return n?.approvals ?? [];
}
export async function getPromotionDecision(nominationId: string) {
  const n = await getPromotionNomination(nominationId);
  return n?.decision ?? null;
}
export async function createPromotionNomination(formData: FormData) {
  await nominatePromotion({
    userId: String(formData.get("userId") ?? ""),
    targetLevel: String(formData.get("targetLevel") ?? ""),
    pathType: String(formData.get("pathType") ?? "management"),
    rationale: String(formData.get("rationale") ?? ""),
  });
}
export async function approvePromotion(formData: FormData) {
  await approvePromotionAction({
    nominationId: reqId(formData, "nominationId"),
    approved: formData.get("approved") === "true",
    notes: String(formData.get("notes") ?? ""),
  });
}
export async function decidePromotion(formData: FormData) {
  const raw = String(formData.get("decision") ?? "rejected");
  await ceoPromotionDecision({
    nominationId: reqId(formData, "nominationId"),
    decision: raw === "approved" ? "approved" : "rejected",
    notes: String(formData.get("notes") ?? ""),
  });
}

// resignations
export async function getResignationRequests() {
  return listResignationRequests();
}
export async function getResignationApprovals(requestId: string) {
  const r = await getResignationRequest(requestId);
  return r?.approvals ?? [];
}
export async function getHandoverChecklist(requestId: string) {
  const r = await getResignationRequest(requestId);
  return r?.checklist ?? [];
}
export async function createResignationRequest(formData: FormData) {
  await requestResignation({
    reason: String(formData.get("reason") ?? ""),
    expectedLeaveDate: String(formData.get("expectedLeaveDate") ?? ""),
  });
}
export async function approveResignation(formData: FormData) {
  await approveResignationAction({
    requestId: reqId(formData, "requestId"),
    approved: formData.get("approved") === "true",
    notes: String(formData.get("notes") ?? ""),
  });
}
export async function toggleHandoverItem(formData: FormData) {
  const itemId = reqId(formData, "itemId");
  const [item] = await db
    .select()
    .from(handoverChecklists)
    .where(eq(handoverChecklists.id, itemId))
    .limit(1);
  if (!item) throw new Error("交接项不存在");
  await updateHandoverItem(itemId, !item.isCompleted);
}

// training
export async function getTrainingPlans() {
  const session = await requireSession();
  if (hasRole(session, "ceo", "ops_manager", "hr", "dept_leader")) {
    return db.select().from(trainingPlans).orderBy(desc(trainingPlans.createdAt));
  }
  return db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.userId, session.id))
    .orderBy(desc(trainingPlans.createdAt));
}
export async function getTrainingExams(planId: string) {
  const plan = await getTrainingPlan(planId);
  return plan?.exams ?? [];
}
export async function getTrainingExtensions(planId: string) {
  const plan = await getTrainingPlan(planId);
  return plan?.extensions ?? [];
}
export async function getCeoAcceptance(planId: string) {
  const plan = await getTrainingPlan(planId);
  return plan?.ceoAcceptance ?? null;
}
export async function getExamAttempts(examId: string) {
  const plans = await getTrainingPlans();
  for (const p of plans) {
    const detail = await getTrainingPlan(p.id);
    const exam = detail?.exams.find((e) => e.id === examId);
    if (exam) return exam.attempts;
  }
  return [];
}
export async function extendTraining(formData: FormData) {
  await requestTrainingExtension({
    trainingPlanId: reqId(formData, "planId"),
    reason: String(formData.get("reason") ?? ""),
    extendedDays: Number(formData.get("extendedDays") ?? 7),
  });
}
export async function ceoAcceptTraining(formData: FormData) {
  await ceoAcceptTrainingAction({
    trainingPlanId: reqId(formData, "planId"),
    accepted: formData.get("accepted") === "true",
    notes: String(formData.get("notes") ?? ""),
  });
}

// tasks
export async function getTodayTasks() {
  return listTasks({ taskDate: todayDate() });
}
export async function createTask(formData: FormData) {
  const session = await requireSession();
  const dueAt = String(formData.get("dueAt") ?? "");
  await createTaskAction({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    assigneeId: String(formData.get("assigneeId") ?? session.id),
    checkerId: String(formData.get("checkerId") ?? session.id),
    dueAt: dueAt.includes("T") ? new Date(dueAt).toISOString() : dueAt,
    completionStandard: String(formData.get("completionStandard") ?? ""),
  });
}
export async function checkTask(formData: FormData) {
  await checkTaskAction({
    taskId: reqId(formData, "taskId"),
    passed: formData.get("passed") === "true",
    feedback: String(formData.get("feedback") ?? ""),
  });
}

// performance
export async function getCapabilityStandards() {
  await requireSession();
  return db.select().from(performanceCapabilityStandards);
}
export async function getResultStandards() {
  await requireSession();
  return db.select().from(performanceResultStandards);
}
export async function getPerformanceReviews() {
  const session = await requireSession();
  if (hasRole(session, "ceo", "ops_manager", "hr", "dept_leader")) {
    return db.select().from(performanceReviews);
  }
  return listPerformanceReviews(session.id);
}
export async function getSanJiangMingbai() {
  await requireSession();
  return db.select().from(sanJiangMingbai).where(eq(sanJiangMingbai.isActive, true));
}
export async function getCareerPaths() {
  return listCareerPaths();
}
export async function createPerformanceReview(formData: FormData) {
  await createPerformanceReviewAction({
    userId: String(formData.get("userId") ?? ""),
    reviewType: String(formData.get("reviewType") ?? "monthly"),
    period: String(formData.get("period") ?? ""),
    score: Number(formData.get("score") ?? 0) || undefined,
    feedback: String(formData.get("feedback") ?? ""),
  });
}

// salary
export async function getSalaryProfiles() {
  const profiles = await listSalaryProfiles();
  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  return profiles.map((p) => ({
    ...p,
    user: userMap.get(p.userId) ?? {
      id: p.userId,
      name: p.userName ?? p.userId,
      departmentId: p.departmentId ?? null,
    },
  }));
}
export async function getSalaryProfile(id: string) {
  const session = await requireSession();
  const [profile] = await db
    .select()
    .from(salaryProfiles)
    .where(eq(salaryProfiles.id, id))
    .limit(1);
  if (!profile) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, profile.userId))
    .limit(1);
  if (
    !canViewSalary(session, {
      userId: profile.userId,
      departmentId: user?.departmentId ?? null,
    })
  ) {
    return null;
  }
  return { ...profile, user: user ?? null };
}
export async function getSalaryAudits(profileId: string) {
  return db
    .select()
    .from(salaryAuditSubmissions)
    .where(eq(salaryAuditSubmissions.salaryProfileId, profileId))
    .orderBy(desc(salaryAuditSubmissions.createdAt));
}
export async function reviewSalaryAudit(formData: FormData) {
  await reviewSalaryAuditAction({
    submissionId: reqId(formData, "auditId"),
    approved: formData.get("approved") === "true",
    reviewNote: String(formData.get("reviewNote") ?? ""),
  });
}

// opc
export async function getOpcPartners() {
  return listOpcPartners();
}
export async function getOpcProjects(partnerId: string) {
  const p = await getOpcPartner(partnerId);
  return p?.projects ?? [];
}
export async function getOpcAgreements(partnerId: string) {
  const p = await getOpcPartner(partnerId);
  return p?.agreements ?? [];
}
export async function createOpcProject(formData: FormData) {
  await createOpcProjectAction({
    partnerId: reqId(formData, "partnerId"),
    projectName: String(formData.get("projectName") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
}
export async function createOpcAgreement(formData: FormData) {
  await createOpcAgreementAction({
    partnerId: reqId(formData, "partnerId"),
    title: String(formData.get("title") ?? ""),
    fileUrl: String(formData.get("fileUrl") ?? "") || undefined,
    signedAt: String(formData.get("signedAt") ?? "") || undefined,
  });
}

// attendance
export async function getAttendanceRules() {
  return listAttendanceRules();
}
export async function getAttendanceRecords() {
  return listAttendanceRecords();
}
export async function getAttendanceRecord(id: string) {
  const [record] = await db
    .select()
    .from(attendanceRecords)
    .where(eq(attendanceRecords.id, id))
    .limit(1);
  return record ?? null;
}
export async function createAttendanceRule(formData: FormData) {
  await createAttendanceRuleAction({
    name: String(formData.get("name") ?? ""),
    workStartTime: String(formData.get("workStartTime") ?? "09:00"),
    workEndTime: String(formData.get("workEndTime") ?? "18:00"),
    lateThresholdMinutes: Number(formData.get("lateThresholdMinutes") ?? 15),
    appliesToRoles: String(formData.get("appliesToRoles") ?? "employee"),
  });
}

// retrospectives
export async function getRecruitmentRetrospectives() {
  return listRecruitmentRetrospectives();
}
export async function getTrainingRetrospectives() {
  return listTrainingRetrospectives();
}
export async function createRecruitmentRetrospective(formData: FormData) {
  await createRecruitmentRetrospectiveAction({
    period: String(formData.get("period") ?? ""),
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
  });
}
export async function createTrainingRetrospective(formData: FormData) {
  await createTrainingRetrospectiveAction({
    period: String(formData.get("period") ?? ""),
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
  });
}

// analytics
export async function getAnalyticsSnapshots() {
  return listAnalyticsSnapshots();
}
export async function getAnalyticsOverview() {
  const data = await getDeepAnalytics();
  const today = todayDate();
  const todayTasks = await listTasks({ taskDate: today });
  const completedToday = todayTasks.filter(
    (t) => t.status === "completed" || t.status === "checked"
  ).length;
  const allCourses = await db.select().from(courses);
  const byStage = data.recruitment.byStage;

  return {
    publishedJobs: data.jobs.published,
    totalCandidates: data.recruitment.totalCandidates,
    hireRate: data.recruitment.conversionRate,
    courseCount: allCourses.length,
    todayTaskCompletion:
      todayTasks.length > 0
        ? Math.round((completedToday / todayTasks.length) * 100)
        : 0,
    activeTraining: data.training.inProgress,
    funnel: {
      screening: byStage.screening ?? 0,
      interviewing: byStage.interviewing ?? 0,
      routing: byStage.routing ?? 0,
      hired:
        (byStage.hired_employee ?? 0) + (byStage.hired_opc ?? 0),
    },
  };
}

// jobs / courses / daily-reports / interviews / promotion-conditions / mbti
export async function createJobForm(formData: FormData) {
  await createJob(formData);
}
export async function updateJobForm(formData: FormData) {
  await updateJob(reqId(formData, "jobId"), formData);
}
export async function uploadCourseForm(formData: FormData) {
  await uploadCourse(formData);
}
export async function syncCourseToBitableForm(formData: FormData) {
  await syncCourseToBitable(reqId(formData, "courseId"));
}
export async function generateDailyReportForm() {
  await generateDailyReport();
}
export async function annotateDailyReportForm(formData: FormData) {
  await annotateDailyReport(reqId(formData, "reportId"), formData);
}
export async function generateInterviewQuestionsForm(formData: FormData) {
  await generateInterviewQuestions(reqId(formData, "candidateId"));
}
export async function analyzeInterviewForm(formData: FormData) {
  await analyzeInterview(reqId(formData, "candidateId"));
}
export async function suggestRoutingForm(formData: FormData) {
  await suggestRouting(reqId(formData, "candidateId"));
}
export async function makeHiringDecisionForm(formData: FormData) {
  await makeHiringDecision(reqId(formData, "candidateId"), formData);
}
export async function createPromotionConditionRule(formData: FormData) {
  await createPromotionConditionRuleAction(formData);
}
export async function updatePromotionConditionRule(formData: FormData) {
  await updatePromotionConditionRuleAction(reqId(formData, "ruleId"), formData);
}
export async function deletePromotionConditionRuleForm(formData: FormData) {
  await deletePromotionConditionRule(reqId(formData, "ruleId"));
}
export async function completeMbtiAssessmentForm(formData: FormData) {
  await completeMbtiAssessment(reqId(formData, "assessmentId"));
}
export { startMbtiAssessmentFromForm };

// interviews CRUD & records
export async function getCandidateRecords(candidateId: string) {
  return getInterviewRecords(candidateId);
}

export async function createCandidateForm(formData: FormData) {
  await createCandidateAction({
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
  await updateCandidateAction(reqId(formData, "candidateId"), {
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
  await saveInterviewRecordAction({
    candidateId: reqId(formData, "candidateId"),
    content: String(formData.get("content") ?? "") || undefined,
    recordingUrl: String(formData.get("recordingUrl") ?? "") || undefined,
    demeanorNote: String(formData.get("demeanorNote") ?? "") || undefined,
    demeanorScore: Number(formData.get("demeanorScore") ?? 0) || undefined,
  });
}

// salary
export async function createSalaryProfileForm(formData: FormData) {
  await createSalaryProfileAction({
    userId: String(formData.get("userId") ?? ""),
    baseSalary: Number(formData.get("baseSalary") ?? 0),
    status: (String(formData.get("status") ?? "training") as "training" | "regular"),
    salaryRatio:
      String(formData.get("status") ?? "training") === "training" ? 0.8 : 1,
  });
}

export async function setSalaryStatusForm(formData: FormData) {
  const status = String(formData.get("status") ?? "training") as "training" | "regular";
  await setSalaryStatus(reqId(formData, "profileId"), status, String(formData.get("reason") ?? ""));
}

// training exams
export async function createTrainingExamForm(formData: FormData) {
  await createTrainingExamAction({
    trainingPlanId: reqId(formData, "planId"),
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
  await submitExamAttemptAction({
    examId: reqId(formData, "examId"),
    answers,
  });
}

export async function approveTrainingExtensionForm(formData: FormData) {
  await approveTrainingExtensionAction(reqId(formData, "extensionId"));
}

// performance standards
export async function createCapabilityStandardForm(formData: FormData) {
  await createCapabilityStandard({
    jobPositionId: String(formData.get("jobPositionId") ?? ""),
    title: String(formData.get("title") ?? ""),
    criteria: String(formData.get("criteria") ?? ""),
  });
}

export async function createResultStandardForm(formData: FormData) {
  await createResultStandard({
    jobPositionId: String(formData.get("jobPositionId") ?? ""),
    metricName: String(formData.get("metricName") ?? ""),
    targetValue: String(formData.get("targetValue") ?? ""),
    unit: String(formData.get("unit") ?? "") || undefined,
  });
}

export async function getTasksOverviewData() {
  return getTasksOverview();
}

export async function getPerformanceAnomaliesData() {
  return getPerformanceAnomalies();
}
