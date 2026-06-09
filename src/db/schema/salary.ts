import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const salaryProfiles = sqliteTable("salary_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  baseSalary: real("base_salary").notNull(),
  salaryRatio: real("salary_ratio").notNull().default(1),
  status: text("status").notNull().default("training"),
  structureJson: text("structure_json"),
  auditStatus: text("audit_status").notNull().default("draft"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const salaryStatusHistory = sqliteTable("salary_status_history", {
  id: text("id").primaryKey(),
  salaryProfileId: text("salary_profile_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  fromRatio: real("from_ratio"),
  toRatio: real("to_ratio").notNull(),
  changedById: text("changed_by_id").notNull(),
  reason: text("reason"),
  createdAt: text("created_at").notNull(),
});

export const salaryAuditSubmissions = sqliteTable("salary_audit_submissions", {
  id: text("id").primaryKey(),
  salaryProfileId: text("salary_profile_id").notNull(),
  submittedById: text("submitted_by_id").notNull(),
  reviewerId: text("reviewer_id"),
  status: text("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  createdAt: text("created_at").notNull(),
  reviewedAt: text("reviewed_at"),
});
