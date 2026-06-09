import { v4 as uuidv4 } from "uuid";
import { db } from "@/db";
import { mockNotifications } from "@/db/schema";
import type { FeishuService } from "../contracts/feishu";
import { nowIso } from "@/lib/utils/time";

export class MockFeishuService implements FeishuService {
  async pushDailyReport(input: {
    reportId: string;
    title: string;
    content: string;
    recipientRoles: string[];
  }) {
    const previewUrl = `/api/mocks/feishu/daily-report/${input.reportId}`;
    return {
      previewUrl,
      mockMessageId: `mock-feishu-${uuidv4().slice(0, 8)}`,
    };
  }

  async notifyTask(input: {
    userId: string;
    title: string;
    body: string;
  }) {
    await db.insert(mockNotifications).values({
      id: uuidv4(),
      userId: input.userId,
      title: input.title,
      body: input.body,
      channel: "feishu",
      isRead: false,
      createdAt: nowIso(),
    });
  }

  async syncCourseToBitable(input: {
    courseId: string;
    title: string;
    skillTags: string[];
    videoUrl: string;
  }) {
    return { syncStatus: `mock_synced:${input.courseId}` };
  }
}
