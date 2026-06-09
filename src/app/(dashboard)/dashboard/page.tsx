import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  candidates,
  courses,
  dailyReports,
  jobPositions,
  opcPartners,
  tasks,
  users,
} from "@/db/schema";
import { verifySession } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/constants/roles";
import { todayDate } from "@/lib/utils/time";

export default async function DashboardPage() {
  const session = await verifySession();
  const today = todayDate();

  const [
    jobCount,
    candidateCount,
    courseCount,
    taskCount,
    opcCount,
    reportToday,
  ] = await Promise.all([
    db.select({ c: count() }).from(jobPositions).where(eq(jobPositions.status, "published")),
    db.select({ c: count() }).from(candidates),
    db.select({ c: count() }).from(courses),
    db.select({ c: count() }).from(tasks).where(eq(tasks.taskDate, today)),
    db.select({ c: count() }).from(opcPartners),
    db.select().from(dailyReports).where(eq(dailyReports.reportDate, today)).limit(1),
  ]);

  const stats = [
    { label: "已发布岗位", value: jobCount[0]?.c ?? 0 },
    { label: "候选人", value: candidateCount[0]?.c ?? 0 },
    { label: "课程数", value: courseCount[0]?.c ?? 0 },
    { label: "今日任务", value: taskCount[0]?.c ?? 0 },
    { label: "OPC 合伙人", value: opcCount[0]?.c ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">经营总览</h1>
        <p className="text-muted-foreground text-sm mt-1">
          欢迎，{session?.name}（{session ? ROLE_LABELS[session.role] : ""}）
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">今日简报状态</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {reportToday[0]
            ? `今日日报已生成（${reportToday[0].reportDate}），可在「日报/简报」模块查看。`
            : "今日日报尚未生成，可在日报模块手动触发生成。"}
        </CardContent>
      </Card>
    </div>
  );
}
