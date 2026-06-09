import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: text("assignee_id").notNull(),
  collaboratorIds: text("collaborator_ids"),
  checkerId: text("checker_id").notNull(),
  creatorId: text("creator_id").notNull(),
  departmentId: text("department_id"),
  dueAt: text("due_at").notNull(),
  completionStandard: text("completion_standard").notNull(),
  status: text("status").notNull().default("open"),
  taskDate: text("task_date").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const taskCheckResults = sqliteTable("task_check_results", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  checkerId: text("checker_id").notNull(),
  passed: integer("passed", { mode: "boolean" }).notNull(),
  feedback: text("feedback"),
  createdAt: text("created_at").notNull(),
});
