import "../../scripts/load-env";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "./index";
import { DEMO_USER_PASSWORD, hashPassword } from "@/lib/auth/password";
import {
  analyticsSnapshots,
  archivedRecruitmentRequests,
  attendanceRecords,
  attendanceRules,
  businessLines,
  candidates,
  careerPathDefinitions,
  ceoTrainingAcceptances,
  courseSkillTags,
  courses,
  dailyReportAnnotations,
  dailyReportItems,
  dailyReports,
  departments,
  examAttempts,
  examQuestions,
  handoverChecklists,
  headcountPlans,
  hiringDecisions,
  interviewAnalyses,
  interviewQuestions,
  interviewRecords,
  interviewSessions,
  jobKpiTemplates,
  jobPositionTemplates,
  jobPositions,
  mbtiAssessments,
  mbtiResults,
  opcAgreements,
  opcPartners,
  opcProjects,
  opcRevenueShares,
  performanceCapabilityStandards,
  performanceResultStandards,
  performanceReviews,
  promotionApprovals,
  promotionConditionRules,
  promotionDecisions,
  promotionNominations,
  recruitmentRequests,
  recruitmentRetrospectives,
  resignationApprovals,
  resignationRequests,
  routingSuggestions,
  salaryAuditSubmissions,
  salaryProfiles,
  salaryStatusHistory,
  sanJiangMingbai,
  taskCheckResults,
  tasks,
  trainingCourseAssignments,
  trainingExams,
  trainingExtensions,
  trainingPlans,
  trainingRetrospectives,
  users,
} from "./schema";

const now = new Date().toISOString();
const today = now.slice(0, 10);
const id = () => uuidv4();

/** 清空业务表，使 seed 可重复执行（保留 drizzle 迁移记录） */
async function clearSeedData() {
  const tables = [
    "audit_logs",
    "mock_notifications",
    "analytics_snapshots",
    "attendance_records",
    "attendance_rules",
    "promotion_condition_rules",
    "ceo_training_acceptances",
    "exam_attempts",
    "exam_questions",
    "training_extensions",
    "training_exams",
    "training_plans",
    "training_retrospectives",
    "recruitment_retrospectives",
    "handover_checklists",
    "resignation_approvals",
    "resignation_requests",
    "promotion_decisions",
    "promotion_approvals",
    "promotion_nominations",
    "mbti_results",
    "mbti_assessments",
    "interview_recording_consents",
    "hiring_decisions",
    "routing_suggestions",
    "interview_analyses",
    "interview_questions",
    "interview_records",
    "interview_sessions",
    "candidate_tags",
    "candidates",
    "archived_recruitment_requests",
    "recruitment_requests",
    "headcount_plans",
    "job_position_templates",
    "job_kpi_templates",
    "daily_report_annotations",
    "daily_report_items",
    "daily_reports",
    "training_course_assignments",
    "course_skill_tags",
    "courses",
    "san_jiang_mingbai",
    "career_path_definitions",
    "performance_reviews",
    "performance_result_standards",
    "performance_capability_standards",
    "task_check_results",
    "tasks",
    "salary_audit_submissions",
    "salary_status_history",
    "salary_profiles",
    "opc_agreements",
    "opc_revenue_shares",
    "opc_projects",
    "opc_partners",
    "job_positions",
    "users",
    "departments",
    "business_lines",
  ];

  await db.run(sql`PRAGMA foreign_keys = OFF`);
  for (const table of tables) {
    await db.run(sql.raw(`DELETE FROM "${table}"`));
  }
  await db.run(sql`PRAGMA foreign_keys = ON`);
}

async function seed() {
  console.log("Seeding database...");
  console.log("Clearing existing seed data...");
  await clearSeedData();

  const passwordHash = await hashPassword(DEMO_USER_PASSWORD);

  const blAi = id();
  const blMkt = id();
  const deptHr = id();
  const deptMkt = id();
  const deptTech = id();

  const userCeo = id();
  const userOps = id();
  const userHr = id();
  const userTech = id();
  const userLeader = id();
  const userEmployee = id();
  const userNewcomer = id();
  const userOpc = id();

  const jobHr = id();
  const jobMkt = id();
  const jobTech = id();
  const templateHr = id();

  const candidate1 = id();
  const candidate2 = id();
  const session1 = id();
  const report1 = id();
  const course1 = id();
  const opcPartner1 = id();
  const trainingPlan1 = id();
  const exam1 = id();

  await db.insert(businessLines).values([
    { id: blAi, name: "AI 培训业务线", description: "全国性 AI 培训", createdAt: now, updatedAt: now },
    { id: blMkt, name: "市场业务线", description: "新媒体与市场运营", createdAt: now, updatedAt: now },
  ]);

  await db.insert(departments).values([
    { id: deptHr, name: "人力资源部", businessLineId: blAi, leaderId: userHr, createdAt: now, updatedAt: now },
    { id: deptMkt, name: "市场部", businessLineId: blMkt, leaderId: userLeader, createdAt: now, updatedAt: now },
    { id: deptTech, name: "技术部", businessLineId: blAi, leaderId: userTech, createdAt: now, updatedAt: now },
  ]);

  await db.insert(users).values([
    { id: userCeo, name: "张总", email: "ceo@shixuan.com", passwordHash, role: "ceo", departmentId: null, jobPositionId: null, isActive: true, createdAt: now, updatedAt: now },
    { id: userOps, name: "余闻", email: "ops@shixuan.com", passwordHash, role: "ops_manager", departmentId: deptHr, jobPositionId: null, isActive: true, createdAt: now, updatedAt: now },
    { id: userHr, name: "李人事", email: "hr@shixuan.com", passwordHash, role: "hr", departmentId: deptHr, jobPositionId: jobHr, isActive: true, createdAt: now, updatedAt: now },
    { id: userTech, name: "王技术", email: "tech@shixuan.com", passwordHash, role: "tech_director", departmentId: deptTech, jobPositionId: jobTech, isActive: true, createdAt: now, updatedAt: now },
    { id: userLeader, name: "赵市场", email: "leader@shixuan.com", passwordHash, role: "dept_leader", departmentId: deptMkt, jobPositionId: jobMkt, isActive: true, createdAt: now, updatedAt: now },
    { id: userEmployee, name: "陈员工", email: "employee@shixuan.com", passwordHash, role: "employee", departmentId: deptMkt, jobPositionId: jobMkt, isActive: true, createdAt: now, updatedAt: now },
    { id: userNewcomer, name: "刘新人", email: "newcomer@shixuan.com", passwordHash, role: "newcomer", departmentId: deptMkt, jobPositionId: jobMkt, isActive: true, createdAt: now, updatedAt: now },
    { id: userOpc, name: "周合伙", email: "opc@shixuan.com", passwordHash, role: "opc", departmentId: null, jobPositionId: null, isActive: true, createdAt: now, updatedAt: now },
  ]);

  await db.insert(jobPositions).values([
    { id: jobHr, title: "HR 专员", departmentId: deptHr, expectedResult: "每月完成招聘漏斗闭环，关键岗位 30 天内到岗", primaryOwnerId: userHr, collaboratorIds: userOps, completionStandard: "招聘进度周报完整，无超期关键岗", checkerId: userOps, status: "published", isQuantifiable: true, createdAt: now, updatedAt: now },
    { id: jobMkt, title: "新媒体运营", departmentId: deptMkt, expectedResult: "月度 ROI ≥ 1.5，平台粉丝净增 10%", primaryOwnerId: userLeader, collaboratorIds: userEmployee, completionStandard: "数据报表可追溯，投放复盘完整", checkerId: userOps, status: "published", isQuantifiable: true, createdAt: now, updatedAt: now },
    { id: jobTech, title: "培训内容工程师", departmentId: deptTech, expectedResult: "每月产出 2 门标准化录屏课程", primaryOwnerId: userTech, collaboratorIds: userHr, completionStandard: "课程入库且 HR 可调取", checkerId: userOps, status: "published", isQuantifiable: true, createdAt: now, updatedAt: now },
  ]);

  await db.insert(jobKpiTemplates).values({
    id: templateHr, name: "HR 量化模板", departmentType: "hr", metricsJson: JSON.stringify([{ name: "到岗率", target: "90%" }, { name: "面试转化", target: "25%" }]), createdAt: now, updatedAt: now,
  });

  await db.insert(jobPositionTemplates).values({
    id: id(), jobPositionId: jobHr, templateId: templateHr, createdAt: now,
  });

  await db.insert(headcountPlans).values([
    { id: id(), businessLineId: blAi, departmentId: deptHr, plannedCount: 3, actualCount: 2, period: "2026-Q2", createdAt: now, updatedAt: now },
    { id: id(), businessLineId: blMkt, departmentId: deptMkt, plannedCount: 5, actualCount: 4, period: "2026-Q2", createdAt: now, updatedAt: now },
  ]);

  const recruit1 = id();
  await db.insert(recruitmentRequests).values({
    id: recruit1, jobPositionId: jobMkt, title: "新媒体运营招聘", isKeyPosition: true, status: "open", createdAt: now, updatedAt: now,
  });

  await db.insert(candidates).values([
    { id: candidate1, name: "孙候选", email: "sun@example.com", resumeSummary: "3年新媒体经验，擅长短视频运营", advantages: "内容创意强，数据敏感", trainingDirection: "平台投放优化", stage: "ceo_review", targetJobPositionId: jobMkt, recruitmentRequestId: recruit1, isKeyCandidate: true, createdAt: now, updatedAt: now },
    { id: candidate2, name: "钱候选", email: "qian@example.com", resumeSummary: "AI 培训讲师背景", advantages: "口才好，表达力强", trainingDirection: "二级讲师培养", stage: "screening", targetJobPositionId: jobTech, isKeyCandidate: false, createdAt: now, updatedAt: now },
  ]);

  await db.insert(interviewSessions).values({
    id: session1, candidateId: candidate1, interviewerId: userHr, status: "completed", completedAt: now, createdAt: now,
  });

  await db.insert(interviewRecords).values({
    id: id(), sessionId: session1, candidateId: candidate1, content: "候选人详细描述了过往 ROI 提升案例，实操演示流畅。", demeanorNote: "精神面貌积极，与公司价值观同频", demeanorScore: 4, createdAt: now,
  });

  await db.insert(interviewQuestions).values([
    { id: id(), candidateId: candidate1, questionType: "practical", content: "请演示一次投放复盘流程", sortOrder: 1, createdAt: now },
    { id: id(), candidateId: candidate1, questionType: "choice", content: "ROI 计算方式？", sortOrder: 2, createdAt: now },
  ]);

  await db.insert(interviewAnalyses).values({
    id: id(), candidateId: candidate1, advantagesJson: JSON.stringify(["内容创意", "数据驱动"]), skillScoresJson: JSON.stringify([{ skill: "新媒体", score: 85 }]), risksJson: JSON.stringify([{ level: "low", description: "需熟悉内部课程库" }]), reasoningChain: "基于简历与面试记录，候选人与岗位结果高度匹配。", overallScore: 84, createdAt: now,
  });

  await db.insert(routingSuggestions).values({
    id: id(), candidateId: candidate1, routeType: "employee", suggestedJobPositionId: jobMkt, rationale: "优势与新媒体岗位结果定义对齐", confidence: 0.88, createdAt: now,
  });

  await db.insert(dailyReports).values({
    id: report1, reportDate: today, summaryJson: JSON.stringify({ hcUsage: "78%", keyPositions: 2 }), feishuPreviewUrl: `/api/mocks/feishu/daily-report/${report1}`, generatedAt: now, createdAt: now,
  });

  await db.insert(dailyReportItems).values([
    { id: id(), reportId: report1, itemType: "hc_usage", title: "AI 培训业务线 HC 使用率", contentJson: JSON.stringify({ planned: 3, actual: 2, rate: 0.67 }), businessLineId: blAi, createdAt: now },
    { id: id(), reportId: report1, itemType: "key_candidate", title: "关键岗：孙候选", contentJson: JSON.stringify({ stage: "ceo_review", position: "新媒体运营" }), departmentId: deptMkt, createdAt: now },
  ]);

  await db.insert(dailyReportAnnotations).values({
    id: id(), reportId: report1, authorId: userOps, content: "请 HR 优先跟进孙候选 CEO 决策环节", createdAt: now,
  });

  await db.insert(courses).values({
    id: course1, title: "新媒体投放基础", description: "技术总监录屏：投放工具入门", videoUrl: "https://example.com/mock/video1.mp4", uploadedById: userTech, targetAudience: "新人", durationMinutes: 45, bitableSyncStatus: "mock_synced", createdAt: now, updatedAt: now,
  });

  await db.insert(courseSkillTags).values([
    { id: id(), courseId: course1, skillTag: "新媒体运营", createdAt: now },
    { id: id(), courseId: course1, skillTag: "投放优化", createdAt: now },
  ]);

  await db.insert(trainingCourseAssignments).values({
    id: id(), userId: userNewcomer, courseId: course1, isRequired: true, progressPercent: 60, createdAt: now,
  });

  await db.insert(performanceCapabilityStandards).values({
    id: id(), jobPositionId: jobMkt, title: "标准海报制作", criteria: "能独立完成品牌规范海报", createdAt: now,
  });

  await db.insert(performanceResultStandards).values({
    id: id(), jobPositionId: jobMkt, metricName: "ROI", targetValue: "1.5", unit: "倍", createdAt: now,
  });

  await db.insert(performanceReviews).values({
    id: id(), userId: userEmployee, reviewerId: userLeader, reviewType: "result", period: "2026-05", score: 1.6, conclusion: "达标", feedback: "ROI 持续向好", actualValue: "1.6", createdAt: now,
  });

  await db.insert(careerPathDefinitions).values([
    { id: id(), pathType: "professional", levelName: "助理", levelOrder: 1, description: "专业线起点", createdAt: now },
    { id: id(), pathType: "professional", levelName: "专员", levelOrder: 2, description: "独立产出", createdAt: now },
    { id: id(), pathType: "management", levelName: "小组负责人", levelOrder: 1, description: "管理线起点", createdAt: now },
  ]);

  await db.insert(sanJiangMingbai).values({
    id: id(), userId: userEmployee, rulesText: "结果考核以 ROI 为核心指标", directionText: "提升内容质量与投放效率", benefitText: "达标后可参与晋升提名", isActive: true, createdAt: now,
  });

  const task1 = id();
  await db.insert(tasks).values({
    id: task1, title: "完成本周投放复盘", description: "输出数据报告", assigneeId: userEmployee, checkerId: userLeader, creatorId: userLeader, departmentId: deptMkt, dueAt: `${today}T18:00:00.000Z`, completionStandard: "提交完整复盘文档", status: "open", taskDate: today, createdAt: now, updatedAt: now,
  });

  await db.insert(salaryProfiles).values([
    { id: id(), userId: userNewcomer, baseSalary: 8000, salaryRatio: 0.8, status: "training", structureJson: JSON.stringify({ base: 8000 }), auditStatus: "approved", createdAt: now, updatedAt: now },
    { id: id(), userId: userEmployee, baseSalary: 12000, salaryRatio: 1, status: "regular", structureJson: JSON.stringify({ base: 12000 }), auditStatus: "approved", createdAt: now, updatedAt: now },
  ]);

  await db.insert(opcPartners).values({
    id: opcPartner1, userId: userOpc, name: "周合伙", email: "opc@shixuan.com", advantages: "AI 课程开发顶尖", status: "active", createdAt: now, updatedAt: now,
  });

  const opcProject1 = id();
  await db.insert(opcProjects).values({
    id: opcProject1, partnerId: opcPartner1, projectName: "企业 AI 内训项目", description: "按项目合作", status: "active", createdAt: now,
  });

  await db.insert(opcRevenueShares).values({
    id: id(), projectId: opcProject1, sharePercent: 30, effectiveFrom: today, createdAt: now,
  });

  await db.insert(opcAgreements).values({
    id: id(), partnerId: opcPartner1, title: "OPC 合作协议 2026", fileUrl: "/uploads/mock-agreement.pdf", signedAt: today, createdAt: now,
  });

  await db.insert(trainingPlans).values({
    id: trainingPlan1, userId: userNewcomer, status: "in_progress", startedAt: now, expectedEndAt: "2026-07-01", createdAt: now,
  });

  await db.insert(trainingExams).values({
    id: exam1, trainingPlanId: trainingPlan1, title: "新人培训结业考核", passThreshold: 0.8, createdAt: now,
  });

  await db.insert(examQuestions).values([
    { id: id(), examId: exam1, questionType: "practical", content: "描述一次完整的投放复盘流程", correctAnswer: "包含数据采集、分析、优化三步", sortOrder: 1 },
    { id: id(), examId: exam1, questionType: "choice", content: "培训期薪酬比例为？", optionsJson: JSON.stringify(["60%", "80%", "100%"]), correctAnswer: "80%", sortOrder: 2 },
  ]);

  await db.insert(attendanceRules).values({
    id: id(), name: "标准工时", workStartTime: "09:30", workEndTime: "18:30", lateThresholdMinutes: 15, appliesToRoles: "employee,newcomer", isActive: true, createdAt: now,
  });

  await db.insert(attendanceRecords).values({
    id: id(), userId: userEmployee, recordDate: today, checkInAt: `${today}T01:30:00.000Z`, checkOutAt: `${today}T10:30:00.000Z`, status: "normal", createdAt: now,
  });

  await db.insert(promotionConditionRules).values({
    id: id(), pathType: "professional", levelName: "高级专员", conditionTitle: "连续两季度结果考核达标", conditionDescription: "ROI 或等效指标达标", metricKey: "roi", targetValue: "1.5", createdAt: now,
  });

  await db.insert(analyticsSnapshots).values({
    id: id(), snapshotType: "recruitment_roi", period: "2026-Q1", dataJson: JSON.stringify({ avgDaysToHire: 22, qualityScore: 4.2 }), createdAt: now,
  });

  console.log("Seed completed.");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
