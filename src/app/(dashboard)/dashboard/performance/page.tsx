import { getJobKpiTemplates, getJobs } from "@/actions/jobs";
import {
  batchApplyKpiTemplatesForm,
  createCapabilityStandardForm,
  createPerformanceReviewForm,
  createResultStandardForm,
  getPerformanceAnomalies,
} from "@/actions/performance";
import {
  getCapabilityStandards,
  getCareerPaths,
  getPerformanceReviews,
  getResultStandards,
  getSanJiangMingbai,
} from "@/actions/page-adapters";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { SplitPanel, PanelHeader, PanelBody } from "@/components/layout/split-panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { verifySession } from "@/lib/auth/session";
import { canManagePerformance, hasRole } from "@/lib/auth/permissions";

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const session = await verifySession();
  const capability = await getCapabilityStandards();
  const results = await getResultStandards();
  const reviews = await getPerformanceReviews();
  const sanJiang = await getSanJiangMingbai();
  const paths = await getCareerPaths();
  const jobs = await getJobs();
  const kpiTemplates = await getJobKpiTemplates();
  const canManage = session ? canManagePerformance(session) : false;
  const canViewAnomalies = session
    ? hasRole(session, "ceo", "ops_manager", "hr")
    : false;
  const anomalies = canViewAnomalies ? await getPerformanceAnomalies() : [];

  const pathsByType = paths.reduce<Record<string, typeof paths>>((acc, p) => {
    (acc[p.pathType] ??= []).push(p);
    return acc;
  }, {});

  const jobMap = new Map(jobs.map((j) => [j.id, j.title]));

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div>
        <h1 className="text-2xl font-bold">绩效考核</h1>
        <p className="text-muted-foreground text-sm mt-1">
          能力/结果标准维护、评审、三讲明白与绩效异常概览
        </p>
      </div>

      <Tabs defaultValue={tab ?? "standards"} className="flex flex-col flex-1 min-h-0">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="standards">考核标准</TabsTrigger>
          <TabsTrigger value="reviews">绩效评审</TabsTrigger>
          <TabsTrigger value="anomalies">绩效异常</TabsTrigger>
          <TabsTrigger value="sanjiang">三讲明白</TabsTrigger>
          <TabsTrigger value="career">职业路径</TabsTrigger>
        </TabsList>

        <TabsContent value="standards" className="flex flex-col flex-1 min-h-0 mt-4">
          <SplitPanel
            list={
              <>
                <PanelHeader title="能力标准" />
                <PanelBody className="p-0">
                  <ul className="text-sm">
                    {capability.map((s) => (
                      <li key={s.id} className="px-4 py-3 border-b">
                        <div className="font-medium">{s.title}</div>
                        <div className="text-muted-foreground text-xs mt-1">
                          {jobMap.get(s.jobPositionId) ?? s.jobPositionId}
                        </div>
                        <div className="text-muted-foreground text-xs mt-1 line-clamp-2">
                          {s.criteria}
                        </div>
                      </li>
                    ))}
                  </ul>
                </PanelBody>
              </>
            }
            detail={
              <>
                <PanelHeader title="结果标准" />
                <PanelBody className="space-y-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>岗位</TableHead>
                        <TableHead>指标</TableHead>
                        <TableHead>目标值</TableHead>
                        <TableHead>单位</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">
                            {jobMap.get(r.jobPositionId) ?? "—"}
                          </TableCell>
                          <TableCell>{r.metricName}</TableCell>
                          <TableCell>{r.targetValue}</TableCell>
                          <TableCell>{r.unit ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {canManage && (
                    <div className="grid gap-4 lg:grid-cols-2 border-t pt-4">
                      <form action={createCapabilityStandardForm} className="space-y-3">
                        <h3 className="font-semibold text-sm">新建能力标准</h3>
                        <div className="space-y-2">
                          <Label htmlFor="cap-job">岗位</Label>
                          <select
                            id="cap-job"
                            name="jobPositionId"
                            required
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                          >
                            {jobs.map((j) => (
                              <option key={j.id} value={j.id}>
                                {j.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cap-title">考核项</Label>
                          <Input id="cap-title" name="title" required placeholder="能否做出标准海报" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cap-criteria">评判标准</Label>
                          <Textarea id="cap-criteria" name="criteria" required rows={2} />
                        </div>
                        <SubmitButton variant="secondary">添加能力标准</SubmitButton>
                      </form>

                      <form action={createResultStandardForm} className="space-y-3">
                        <h3 className="font-semibold text-sm">新建结果标准</h3>
                        <div className="space-y-2">
                          <Label htmlFor="res-job">岗位</Label>
                          <select
                            id="res-job"
                            name="jobPositionId"
                            required
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                          >
                            {jobs.map((j) => (
                              <option key={j.id} value={j.id}>
                                {j.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="res-metric">指标名称</Label>
                          <Input id="res-metric" name="metricName" required placeholder="ROI" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label htmlFor="res-target">目标值</Label>
                            <Input id="res-target" name="targetValue" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="res-unit">单位</Label>
                            <Input id="res-unit" name="unit" placeholder="倍" />
                          </div>
                        </div>
                        <SubmitButton variant="secondary">添加结果标准</SubmitButton>
                      </form>

                      {kpiTemplates.length > 0 && (
                        <form
                          action={batchApplyKpiTemplatesForm}
                          className="space-y-3 lg:col-span-2 border rounded-lg p-4"
                        >
                          <h3 className="font-semibold text-sm">批量应用 KPI 模板</h3>
                          <div className="space-y-2">
                            <Label htmlFor="templateId">KPI 模板</Label>
                            <select
                              id="templateId"
                              name="templateId"
                              required
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                            >
                              {kpiTemplates.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="jobPositionIds">岗位 ID（逗号分隔）</Label>
                            <Input
                              id="jobPositionIds"
                              name="jobPositionIds"
                              placeholder={jobs.map((j) => j.id).join(",")}
                              required
                            />
                          </div>
                          <SubmitButton variant="outline">批量生成结果标准</SubmitButton>
                        </form>
                      )}
                    </div>
                  )}
                </PanelBody>
              </>
            }
          />
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="border rounded-lg">
              <PanelHeader title="评审记录" />
              <PanelBody className="p-0 max-h-96 overflow-auto">
                <ul className="text-sm">
                  {reviews.map((r) => (
                    <li key={r.id} className="px-4 py-3 border-b">
                      <div className="flex justify-between">
                        <span className="font-medium">{r.period}</span>
                        <Badge variant="secondary">{r.reviewType}</Badge>
                      </div>
                      {r.score != null && (
                        <div className="text-xs text-muted-foreground mt-1">
                          得分 {r.score}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </PanelBody>
            </div>
            {canManage && (
              <div className="border rounded-lg">
                <PanelHeader title="新建评审" />
                <PanelBody>
                  <form action={createPerformanceReviewForm} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="userId">被评人 ID</Label>
                      <Input id="userId" name="userId" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="period">周期</Label>
                      <Input id="period" name="period" placeholder="2026-Q1" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reviewType">类型</Label>
                      <select
                        id="reviewType"
                        name="reviewType"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="monthly">月度</option>
                        <option value="quarterly">季度</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="score">得分</Label>
                      <Input id="score" name="score" type="number" step="0.1" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feedback">反馈</Label>
                      <Textarea id="feedback" name="feedback" rows={3} />
                    </div>
                    <SubmitButton>提交评审</SubmitButton>
                  </form>
                </PanelBody>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="anomalies" className="mt-4">
          <div className="border rounded-lg">
            <PanelHeader title="绩效异常概览（得分 &lt; 70）" />
            <PanelBody>
              {anomalies.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无绩效异常记录</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>员工</TableHead>
                      <TableHead>周期</TableHead>
                      <TableHead>得分</TableHead>
                      <TableHead>类型</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anomalies.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.userName}</TableCell>
                        <TableCell>{a.period}</TableCell>
                        <TableCell className="text-red-600 font-medium">{a.score}</TableCell>
                        <TableCell>{a.reviewType}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </PanelBody>
          </div>
        </TabsContent>

        <TabsContent value="sanjiang" className="mt-4 space-y-4">
          {sanJiang.map((s) => (
            <div key={s.id} className="border rounded-lg p-4 text-sm space-y-2">
              <h3 className="font-semibold">三讲明白</h3>
              <p>
                <span className="text-muted-foreground">规则：</span>
                {s.rulesText}
              </p>
              <p>
                <span className="text-muted-foreground">方向：</span>
                {s.directionText}
              </p>
              <p>
                <span className="text-muted-foreground">收益：</span>
                {s.benefitText}
              </p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="career" className="mt-4 space-y-6">
          {Object.entries(pathsByType).map(([type, levels]) => (
            <div key={type} className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">
                {type === "management" ? "管理路径" : type === "expert" ? "专家路径" : type}
              </h3>
              <ol className="space-y-2">
                {levels
                  .sort((a, b) => a.levelOrder - b.levelOrder)
                  .map((l) => (
                    <li key={l.id} className="flex gap-3 text-sm">
                      <Badge>{l.levelOrder}</Badge>
                      <div>
                        <div className="font-medium">{l.levelName}</div>
                        <div className="text-muted-foreground text-xs">{l.description}</div>
                      </div>
                    </li>
                  ))}
              </ol>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
