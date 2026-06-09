import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const dailyReports = sqliteTable("daily_reports", {
  id: text("id").primaryKey(),
  reportDate: text("report_date").notNull(),
  summaryJson: text("summary_json").notNull(),
  feishuPreviewUrl: text("feishu_preview_url"),
  generatedAt: text("generated_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const dailyReportItems = sqliteTable("daily_report_items", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull(),
  itemType: text("item_type").notNull(),
  title: text("title").notNull(),
  contentJson: text("content_json").notNull(),
  businessLineId: text("business_line_id"),
  departmentId: text("department_id"),
  createdAt: text("created_at").notNull(),
});

export const dailyReportAnnotations = sqliteTable("daily_report_annotations", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull(),
  authorId: text("author_id").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});
