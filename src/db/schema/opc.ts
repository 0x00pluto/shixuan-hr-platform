import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const opcPartners = sqliteTable("opc_partners", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  candidateId: text("candidate_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  advantages: text("advantages"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const opcProjects = sqliteTable("opc_projects", {
  id: text("id").primaryKey(),
  partnerId: text("partner_id").notNull(),
  projectName: text("project_name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
});

export const opcRevenueShares = sqliteTable("opc_revenue_shares", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  sharePercent: real("share_percent").notNull(),
  effectiveFrom: text("effective_from").notNull(),
  createdAt: text("created_at").notNull(),
});

export const opcAgreements = sqliteTable("opc_agreements", {
  id: text("id").primaryKey(),
  partnerId: text("partner_id").notNull(),
  title: text("title").notNull(),
  fileUrl: text("file_url"),
  signedAt: text("signed_at"),
  createdAt: text("created_at").notNull(),
});
