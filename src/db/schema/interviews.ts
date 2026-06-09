import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { jobPositions } from "./jobs";

export const candidates = sqliteTable("candidates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  resumeSummary: text("resume_summary"),
  advantages: text("advantages"),
  trainingDirection: text("training_direction"),
  stage: text("stage").notNull().default("screening"),
  targetJobPositionId: text("target_job_position_id").references(
    () => jobPositions.id
  ),
  recruitmentRequestId: text("recruitment_request_id"),
  isKeyCandidate: integer("is_key_candidate", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const candidateTags = sqliteTable("candidate_tags", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull(),
  tag: text("tag").notNull(),
  createdAt: text("created_at").notNull(),
});

export const interviewSessions = sqliteTable("interview_sessions", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull(),
  interviewerId: text("interviewer_id").notNull(),
  scheduledAt: text("scheduled_at"),
  completedAt: text("completed_at"),
  status: text("status").notNull().default("scheduled"),
  createdAt: text("created_at").notNull(),
});

export const interviewRecords = sqliteTable("interview_records", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  candidateId: text("candidate_id").notNull(),
  content: text("content"),
  recordingUrl: text("recording_url"),
  demeanorNote: text("demeanor_note"),
  demeanorScore: integer("demeanor_score"),
  createdAt: text("created_at").notNull(),
});

export const interviewQuestions = sqliteTable("interview_questions", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull(),
  questionType: text("question_type").notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const interviewAnalyses = sqliteTable("interview_analyses", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull(),
  advantagesJson: text("advantages_json"),
  skillScoresJson: text("skill_scores_json"),
  risksJson: text("risks_json"),
  reasoningChain: text("reasoning_chain"),
  overallScore: real("overall_score"),
  createdAt: text("created_at").notNull(),
});

export const routingSuggestions = sqliteTable("routing_suggestions", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull(),
  routeType: text("route_type").notNull(),
  suggestedJobPositionId: text("suggested_job_position_id"),
  opcProjectHint: text("opc_project_hint"),
  rationale: text("rationale").notNull(),
  confidence: real("confidence"),
  createdAt: text("created_at").notNull(),
});

export const hiringDecisions = sqliteTable("hiring_decisions", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull(),
  decision: text("decision").notNull(),
  decidedById: text("decided_by_id").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const interviewRecordingConsents = sqliteTable(
  "interview_recording_consents",
  {
    id: text("id").primaryKey(),
    candidateId: text("candidate_id").notNull(),
    sessionId: text("session_id"),
    consented: integer("consented", { mode: "boolean" }).notNull(),
    consentNote: text("consent_note"),
    createdAt: text("created_at").notNull(),
  }
);

export const mbtiAssessments = sqliteTable("mbti_assessments", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
});

export const mbtiResults = sqliteTable("mbti_results", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id").notNull(),
  typeCode: text("type_code").notNull(),
  dimensionsJson: text("dimensions_json"),
  summary: text("summary"),
  createdAt: text("created_at").notNull(),
});
