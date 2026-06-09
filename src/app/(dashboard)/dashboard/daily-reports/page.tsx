import Link from "next/link";
import {
  annotateDailyReportForm,
  generateDailyReportForm,
  getDailyReport,
  getDailyReportAnnotations,
  getDailyReportItems,
  getDailyReports,
  getDepartmentDailySummary,
} from "@/actions/daily-reports";
import { FormHiddenId } from "@/components/dashboard/form-hidden-id";
import { SelectableListItem, EmptyState } from "@/components/dashboard/selectable-list";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { SplitPanel, PanelHeader, PanelBody } from "@/components/layout/split-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { verifySession } from "@/lib/auth/session";
import { canAnnotateDailyReport } from "@/lib/auth/permissions";

export default async function DailyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await verifySession();
  const reports = await getDailyReports();
  const selectedId = id ?? reports[0]?.id;
  const selected = selectedId ? await getDailyReport(selectedId) : null;
  const items = selected ? await getDailyReportItems(selected.id) : [];
  const annotations = selected
    ? await getDailyReportAnnotations(selected.id)
    : [];
  const displaySummary = selected
    ? await getDepartmentDailySummary(selected.id)
    : null;
  const canAnnotate = session ? canAnnotateDailyReport(session) : false;
  const canGenerate = ["ceo", "ops_manager", "hr"].includes(session?.role ?? "");

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">日报 / 简报</h1>
          <p className="text-muted-foreground text-sm mt-1">
            经营日报生成、营运经理批注与飞书预览
          </p>
        </div>
        {canGenerate && (
          <form action={generateDailyReportForm}>
            <SubmitButton>生成今日日报</SubmitButton>
          </form>
        )}
      </div>

      <SplitPanel
        list={
          <>
            <PanelHeader title="日报列表" />
            <PanelBody className="p-0!">
              {reports.length === 0 ? (
                <EmptyState message="暂无日报，点击右上角生成" />
              ) : (
                reports.map((r) => (
                  <SelectableListItem
                    key={r.id}
                    href={`/dashboard/daily-reports?id=${r.id}`}
                    selected={r.id === selectedId}
                    title={r.reportDate}
                    subtitle={r.generatedAt.slice(0, 16).replace("T", " ")}
                  />
                ))
              )}
            </PanelBody>
          </>
        }
        detail={
          selected ? (
            <>
              <PanelHeader
                title={`日报 ${selected.reportDate}`}
                action={
                  selected.feishuPreviewUrl ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={selected.feishuPreviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        飞书预览
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
              <PanelBody className="space-y-6">
                <div>
                  <h3 className="font-semibold text-sm mb-2">摘要</h3>
                  <pre className="text-xs bg-muted rounded-md p-3 overflow-auto">
                    {JSON.stringify(displaySummary, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2">
                    明细条目
                    {session?.role === "dept_leader" && (
                      <span className="text-muted-foreground font-normal ml-2">
                        （本部门）
                      </span>
                    )}
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {items.length === 0 ? (
                      <li className="text-muted-foreground">本部门暂无相关条目</li>
                    ) : (
                      items.map((item) => {
                        const content = JSON.parse(item.contentJson) as Record<string, unknown>;
                        return (
                          <li key={item.id} className="border rounded-md px-3 py-2">
                            <div className="font-medium">{item.title}</div>
                            <Badge variant="secondary" className="mt-1">
                              {item.itemType}
                            </Badge>
                            {item.itemType === "hc_usage" && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {String(content.actual)}/{String(content.planned)} · 使用率 {String(content.usageRate)}%
                              </p>
                            )}
                            {item.itemType === "key_candidate" && (
                              <p className="text-xs text-muted-foreground mt-1">
                                环节：{String(content.stageLabel ?? content.stage)}
                              </p>
                            )}
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2">营运批注</h3>
                  {annotations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">暂无批注</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {annotations.map((a) => (
                        <li key={a.id} className="border rounded-md px-3 py-2 bg-muted/30">
                          {a.content}
                          <div className="text-xs text-muted-foreground mt-1">
                            {a.createdAt.slice(0, 16).replace("T", " ")}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {canAnnotate && (
                    <form
                      action={annotateDailyReportForm}
                      className="mt-4 space-y-2"
                    >
                      <FormHiddenId name="reportId" value={selected.id} />
                      <Label htmlFor="content">添加批注</Label>
                      <Textarea id="content" name="content" rows={3} required />
                      <SubmitButton variant="secondary">提交批注</SubmitButton>
                    </form>
                  )}
                </div>
              </PanelBody>
            </>
          ) : (
            <>
              <PanelHeader title="日报详情" />
              <PanelBody>
                <EmptyState message="请从左侧选择日报或生成今日日报" />
              </PanelBody>
            </>
          )
        }
      />
    </div>
  );
}
