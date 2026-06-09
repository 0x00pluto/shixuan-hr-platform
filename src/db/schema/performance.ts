import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const performanceCapabilityStandards = sqliteTable(
  "performance_capability_standards",
  {
    id: text("id").primaryKey(),
    jobPositionId: text("job_position_id").notNull(),
    title: text("title").notNull(),
    criteria: text("criteria").notNull(),
    createdAt: text("created_at").notNull(),
  }
);

export const performanceResultStandards = sqliteTable(
  "performance_result_standards",
  {
    id: text("id").primaryKey(),
    jobPositionId: text("job_position_id").notNull(),
    metricName: text("metric_name").notNull(),
    targetValue: text("target_value").notNull(),
    unit: text("unit"),
    createdAt: text("created_at").notNull(),
  }
);

export const performanceReviews = sqliteTable("performance_reviews", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  reviewerId: text("reviewer_id").notNull(),
  reviewType: text("review_type").notNull(),
  period: text("period").notNull(),
  score: real("score"),
  conclusion: text("conclusion"),
  feedback: text("feedback"),
  actualValue: text("actual_value"),
  createdAt: text("created_at").notNull(),
});

export const careerPathDefinitions = sqliteTable("career_path_definitions", {
  id: text("id").primaryKey(),
  pathType: text("path_type").notNull(),
  levelName: text("level_name").notNull(),
  levelOrder: integer("level_order").notNull(),
  description: text("description"),
  createdAt: text("created_at").notNull(),
});

export const sanJiangMingbai = sqliteTable("san_jiang_mingbai", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  jobPositionId: text("job_position_id"),
  rulesText: text("rules_text").notNull(),
  directionText: text("direction_text").notNull(),
  benefitText: text("benefit_text").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});
