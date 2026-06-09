import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  uploadedById: text("uploaded_by_id").notNull(),
  targetAudience: text("target_audience"),
  durationMinutes: integer("duration_minutes"),
  bitableSyncStatus: text("bitable_sync_status").default("mock_synced"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const courseSkillTags = sqliteTable("course_skill_tags", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(),
  skillTag: text("skill_tag").notNull(),
  createdAt: text("created_at").notNull(),
});

export const trainingCourseAssignments = sqliteTable(
  "training_course_assignments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    courseId: text("course_id").notNull(),
    isRequired: integer("is_required", { mode: "boolean" })
      .notNull()
      .default(true),
    progressPercent: integer("progress_percent").notNull().default(0),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull(),
  }
);
