import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { departments } from "./foundation";

export const jobPositions = sqliteTable("job_positions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  departmentId: text("department_id")
    .notNull()
    .references(() => departments.id),
  expectedResult: text("expected_result").notNull(),
  primaryOwnerId: text("primary_owner_id").notNull(),
  collaboratorIds: text("collaborator_ids"),
  completionStandard: text("completion_standard").notNull(),
  checkerId: text("checker_id").notNull(),
  status: text("status").notNull().default("draft"),
  isQuantifiable: integer("is_quantifiable", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const jobKpiTemplates = sqliteTable("job_kpi_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  departmentType: text("department_type").notNull(),
  metricsJson: text("metrics_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const jobPositionTemplates = sqliteTable("job_position_templates", {
  id: text("id").primaryKey(),
  jobPositionId: text("job_position_id")
    .notNull()
    .references(() => jobPositions.id),
  templateId: text("template_id")
    .notNull()
    .references(() => jobKpiTemplates.id),
  createdAt: text("created_at").notNull(),
});

export const headcountPlans = sqliteTable("headcount_plans", {
  id: text("id").primaryKey(),
  businessLineId: text("business_line_id").notNull(),
  departmentId: text("department_id").references(() => departments.id),
  plannedCount: integer("planned_count").notNull(),
  actualCount: integer("actual_count").notNull().default(0),
  period: text("period").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const recruitmentRequests = sqliteTable("recruitment_requests", {
  id: text("id").primaryKey(),
  jobPositionId: text("job_position_id")
    .notNull()
    .references(() => jobPositions.id),
  title: text("title").notNull(),
  isKeyPosition: integer("is_key_position", { mode: "boolean" })
    .notNull()
    .default(false),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const archivedRecruitmentRequests = sqliteTable(
  "archived_recruitment_requests",
  {
    id: text("id").primaryKey(),
    originalRequestId: text("original_request_id").notNull(),
    candidateId: text("candidate_id"),
    originalTitle: text("original_title").notNull(),
    originalJobPositionId: text("original_job_position_id").notNull(),
    newJobPositionId: text("new_job_position_id"),
    reason: text("reason"),
    archivedAt: text("archived_at").notNull(),
  }
);
