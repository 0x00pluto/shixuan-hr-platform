"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db";
import { courseSkillTags, courses, trainingCourseAssignments } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { canUploadCourses } from "@/lib/auth/permissions";
import { getFeishuService } from "@/lib/services";
import { reqFormId } from "@/lib/form-data";
import { nowIso } from "@/lib/utils/time";

export async function getCourses() {
  await requireSession();
  return db.select().from(courses).orderBy(desc(courses.updatedAt));
}

export async function getCourse(id: string) {
  await requireSession();
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1);
  return course ?? null;
}

export async function getCourseSkillTags(courseId: string) {
  await requireSession();
  return db
    .select()
    .from(courseSkillTags)
    .where(eq(courseSkillTags.courseId, courseId));
}

export async function getSkillCoverageMatrix() {
  await requireSession();
  const allCourses = await db.select().from(courses);
  const allTags = await db.select().from(courseSkillTags);
  const skillMap = new Map<string, string[]>();
  for (const tag of allTags) {
    const list = skillMap.get(tag.skillTag) ?? [];
    list.push(tag.courseId);
    skillMap.set(tag.skillTag, list);
  }
  return {
    skills: Array.from(skillMap.keys()).sort(),
    courses: allCourses,
    coverage: Object.fromEntries(skillMap),
  };
}

export async function uploadCourse(formData: FormData) {
  const session = await requireSession();
  if (!canUploadCourses(session)) throw new Error("无权限");

  const id = uuidv4();
  const now = nowIso();
  const skillTagsRaw = String(formData.get("skillTags") ?? "");
  const skillTags = skillTagsRaw
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);

  await db.insert(courses).values({
    id,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    videoUrl: String(formData.get("videoUrl") ?? ""),
    uploadedById: session.id,
    targetAudience: String(formData.get("targetAudience") ?? ""),
    durationMinutes: Number(formData.get("durationMinutes") ?? 0) || null,
    bitableSyncStatus: "pending",
    createdAt: now,
    updatedAt: now,
  });

  for (const skillTag of skillTags) {
    await db.insert(courseSkillTags).values({
      id: uuidv4(),
      courseId: id,
      skillTag,
      createdAt: now,
    });
  }

  const feishu = getFeishuService();
  const sync = await feishu.syncCourseToBitable({
    courseId: id,
    title: String(formData.get("title") ?? ""),
    skillTags,
    videoUrl: String(formData.get("videoUrl") ?? ""),
  });

  await db
    .update(courses)
    .set({ bitableSyncStatus: sync.syncStatus, updatedAt: nowIso() })
    .where(eq(courses.id, id));

  revalidatePath("/dashboard/courses");
  return id;
}

export async function syncCourseToBitable(courseId: string) {
  const session = await requireSession();
  if (!canUploadCourses(session)) throw new Error("无权限");

  const course = await getCourse(courseId);
  if (!course) throw new Error("课程不存在");
  const tags = await getCourseSkillTags(courseId);

  const feishu = getFeishuService();
  const sync = await feishu.syncCourseToBitable({
    courseId,
    title: course.title,
    skillTags: tags.map((t) => t.skillTag),
    videoUrl: course.videoUrl,
  });

  await db
    .update(courses)
    .set({ bitableSyncStatus: sync.syncStatus, updatedAt: nowIso() })
    .where(eq(courses.id, courseId));

  revalidatePath("/dashboard/courses");
}

export async function syncCourseToBitableForm(formData: FormData) {
  await syncCourseToBitable(reqFormId(formData, "courseId"));
}

export async function uploadCourseForm(formData: FormData) {
  await uploadCourse(formData);
}

export async function getTrainingCourseAssignments(userId: string) {
  await requireSession();
  return db
    .select()
    .from(trainingCourseAssignments)
    .where(eq(trainingCourseAssignments.userId, userId));
}

export async function assignCourseToTrainingForm(formData: FormData) {
  const session = await requireSession();
  if (!canUploadCourses(session)) throw new Error("无权限");

  const userId = reqFormId(formData, "userId");
  const courseId = reqFormId(formData, "courseId");
  const now = nowIso();

  const [existing] = await db
    .select()
    .from(trainingCourseAssignments)
    .where(
      and(
        eq(trainingCourseAssignments.userId, userId),
        eq(trainingCourseAssignments.courseId, courseId)
      )
    )
    .limit(1);

  if (existing) return;

  await db.insert(trainingCourseAssignments).values({
    id: uuidv4(),
    userId,
    courseId,
    isRequired: formData.get("isRequired") !== "false",
    progressPercent: 0,
    createdAt: now,
  });

  revalidatePath("/dashboard/training");
}

export async function updateCourseProgressForm(formData: FormData) {
  await requireSession();
  const assignmentId = reqFormId(formData, "assignmentId");
  const progress = Math.min(
    100,
    Math.max(0, Number(formData.get("progressPercent") ?? 0))
  );
  const now = nowIso();

  await db
    .update(trainingCourseAssignments)
    .set({
      progressPercent: progress,
      completedAt: progress >= 100 ? now : null,
    })
    .where(eq(trainingCourseAssignments.id, assignmentId));

  revalidatePath("/dashboard/training");
}
