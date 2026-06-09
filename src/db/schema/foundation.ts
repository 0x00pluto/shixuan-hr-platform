import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const businessLines = sqliteTable("business_lines", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const departments = sqliteTable("departments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  businessLineId: text("business_line_id")
    .notNull()
    .references(() => businessLines.id),
  leaderId: text("leader_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  departmentId: text("department_id").references(() => departments.id),
  jobPositionId: text("job_position_id"),
  avatarUrl: text("avatar_url"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  actorId: text("actor_id").references(() => users.id),
  payloadJson: text("payload_json"),
  createdAt: text("created_at").notNull(),
});

export const mockNotifications = sqliteTable("mock_notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  channel: text("channel").notNull().default("feishu"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});
