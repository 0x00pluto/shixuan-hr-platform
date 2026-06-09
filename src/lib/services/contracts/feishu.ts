export interface FeishuService {
  pushDailyReport(input: {
    reportId: string;
    title: string;
    content: string;
    recipientRoles: string[];
  }): Promise<{ previewUrl: string; mockMessageId: string }>;

  notifyTask(input: {
    userId: string;
    title: string;
    body: string;
  }): Promise<void>;

  syncCourseToBitable(input: {
    courseId: string;
    title: string;
    skillTags: string[];
    videoUrl: string;
  }): Promise<{ syncStatus: string }>;
}
