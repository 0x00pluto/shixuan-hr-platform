import { getAnalyticsOverview, getAnalyticsSnapshots } from "@/actions/page-adapters";
import { SplitPanel, PanelHeader, PanelBody } from "@/components/layout/split-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifySession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";

export default async function AnalyticsPage() {
  const session = await verifySession();
  const overview = await getAnalyticsOverview();
  const snapshots = await getAnalyticsSnapshots();

  if (!session || !overview) {
    return (
      <div className="text-sm text-muted-foreground">您无权查看深度复盘数据</div>
    );
  }

  const metrics = [
    { label: "已发布岗位", value: overview.publishedJobs, unit: "个" },
    { label: "候选人总数", value: overview.totalCandidates, unit: "人" },
    { label: "录用率", value: overview.hireRate, unit: "%" },
    { label: "课程数", value: overview.courseCount, unit: "门" },
    { label: "今日任务完成率", value: overview.todayTaskCompletion, unit: "%" },
    { label: "进行中培训", value: overview.activeTraining, unit: "人" },
  ];

  const funnel = [
    { stage: "初筛", count: overview.funnel.screening },
    { stage: "面试中", count: overview.funnel.interviewing },
    { stage: "路由中", count: overview.funnel.routing },
    { stage: "已录用", count: overview.funnel.hired },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div>
        <h1 className="text-2xl font-bold">深度复盘</h1>
        <p className="text-muted-foreground text-sm mt-1">
          招聘漏斗、经营指标与历史快照分析
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {m.value}
                <span className="text-base font-normal text-muted-foreground ml-1">
                  {m.unit}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SplitPanel
        list={
          <>
            <PanelHeader title="招聘漏斗" />
            <PanelBody className="p-0">
              {funnel.map((f) => (
                <div
                  key={f.stage}
                  className="flex items-center justify-between px-4 py-3 border-b text-sm"
                >
                  <span>{f.stage}</span>
                  <span className="font-semibold tabular-nums">{f.count}</span>
                </div>
              ))}
            </PanelBody>
          </>
        }
        detail={
          <>
            <PanelHeader title="历史快照" />
            <PanelBody>
              {snapshots.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无分析快照</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {snapshots.map((s) => (
                    <li key={s.id} className="border rounded-md p-3">
                      <div className="font-medium">
                        {s.snapshotType} · {s.period}
                      </div>
                      <pre className="text-xs text-muted-foreground mt-2 overflow-auto max-h-32">
                        {JSON.stringify(s.summary, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ul>
              )}
              {session && hasRole(session, "ceo", "ops_manager") && (
                <p className="text-xs text-muted-foreground mt-4">
                  快照由定时任务或手动触发写入，用于跨周期对比分析。
                </p>
              )}
            </PanelBody>
          </>
        }
      />
    </div>
  );
}
