import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const attendanceRules = sqliteTable("attendance_rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  workStartTime: text("work_start_time").notNull(),
  workEndTime: text("work_end_time").notNull(),
  lateThresholdMinutes: integer("late_threshold_minutes").notNull().default(15),
  appliesToRoles: text("applies_to_roles").notNull().default("employee"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const attendanceRecords = sqliteTable("attendance_records", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  recordDate: text("record_date").notNull(),
  checkInAt: text("check_in_at"),
  checkOutAt: text("check_out_at"),
  status: text("status").notNull().default("normal"),
  note: text("note"),
  createdAt: text("created_at").notNull(),
});

export const promotionConditionRules = sqliteTable("promotion_condition_rules", {
  id: text("id").primaryKey(),
  pathType: text("path_type").notNull(),
  levelName: text("level_name").notNull(),
  conditionTitle: text("condition_title").notNull(),
  conditionDescription: text("condition_description").notNull(),
  metricKey: text("metric_key"),
  targetValue: text("target_value"),
  createdAt: text("created_at").notNull(),
});

export const analyticsSnapshots = sqliteTable("analytics_snapshots", {
  id: text("id").primaryKey(),
  snapshotType: text("snapshot_type").notNull(),
  period: text("period").notNull(),
  dataJson: text("data_json").notNull(),
  createdAt: text("created_at").notNull(),
});
