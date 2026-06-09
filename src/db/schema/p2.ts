import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const trainingPlans = sqliteTable("training_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  status: text("status").notNull().default("in_progress"),
  startedAt: text("started_at").notNull(),
  expectedEndAt: text("expected_end_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
});

export const trainingExams = sqliteTable("training_exams", {
  id: text("id").primaryKey(),
  trainingPlanId: text("training_plan_id").notNull(),
  title: text("title").notNull(),
  passThreshold: real("pass_threshold").notNull().default(0.8),
  createdAt: text("created_at").notNull(),
});

export const examQuestions = sqliteTable("exam_questions", {
  id: text("id").primaryKey(),
  examId: text("exam_id").notNull(),
  questionType: text("question_type").notNull(),
  content: text("content").notNull(),
  optionsJson: text("options_json"),
  correctAnswer: text("correct_answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const examAttempts = sqliteTable("exam_attempts", {
  id: text("id").primaryKey(),
  examId: text("exam_id").notNull(),
  userId: text("user_id").notNull(),
  answersJson: text("answers_json"),
  score: real("score"),
  passed: integer("passed", { mode: "boolean" }),
  attemptedAt: text("attempted_at").notNull(),
});

export const trainingExtensions = sqliteTable("training_extensions", {
  id: text("id").primaryKey(),
  trainingPlanId: text("training_plan_id").notNull(),
  reason: text("reason").notNull(),
  extendedDays: integer("extended_days").notNull().default(7),
  approvedById: text("approved_by_id"),
  createdAt: text("created_at").notNull(),
});

export const ceoTrainingAcceptances = sqliteTable("ceo_training_acceptances", {
  id: text("id").primaryKey(),
  trainingPlanId: text("training_plan_id").notNull(),
  userId: text("user_id").notNull(),
  accepted: integer("accepted", { mode: "boolean" }).notNull(),
  notes: text("notes"),
  decidedById: text("decided_by_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const resignationRequests = sqliteTable("resignation_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  reason: text("reason").notNull(),
  expectedLeaveDate: text("expected_leave_date").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
});

export const resignationApprovals = sqliteTable("resignation_approvals", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull(),
  approverId: text("approver_id").notNull(),
  approverRole: text("approver_role").notNull(),
  approved: integer("approved", { mode: "boolean" }).notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const handoverChecklists = sqliteTable("handover_checklists", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull(),
  itemTitle: text("item_title").notNull(),
  isCompleted: integer("is_completed", { mode: "boolean" })
    .notNull()
    .default(false),
  completedAt: text("completed_at"),
});

export const promotionNominations = sqliteTable("promotion_nominations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  nominatedById: text("nominated_by_id").notNull(),
  targetLevel: text("target_level").notNull(),
  pathType: text("path_type").notNull(),
  rationale: text("rationale").notNull(),
  status: text("status").notNull().default("nominated"),
  createdAt: text("created_at").notNull(),
});

export const promotionApprovals = sqliteTable("promotion_approvals", {
  id: text("id").primaryKey(),
  nominationId: text("nomination_id").notNull(),
  approverId: text("approver_id").notNull(),
  approverRole: text("approver_role").notNull(),
  approved: integer("approved", { mode: "boolean" }).notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const promotionDecisions = sqliteTable("promotion_decisions", {
  id: text("id").primaryKey(),
  nominationId: text("nomination_id").notNull(),
  decidedById: text("decided_by_id").notNull(),
  decision: text("decision").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const recruitmentRetrospectives = sqliteTable(
  "recruitment_retrospectives",
  {
    id: text("id").primaryKey(),
    period: text("period").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    metricsJson: text("metrics_json"),
    createdById: text("created_by_id").notNull(),
    createdAt: text("created_at").notNull(),
  }
);

export const trainingRetrospectives = sqliteTable("training_retrospectives", {
  id: text("id").primaryKey(),
  period: text("period").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  metricsJson: text("metrics_json"),
  createdById: text("created_by_id").notNull(),
  createdAt: text("created_at").notNull(),
});
