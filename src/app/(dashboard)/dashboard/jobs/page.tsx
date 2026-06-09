import Link from "next/link";
import {
  bindKpiTemplateForm,
  createJobForm,
  getJob,
  getJobCompletenessOverview,
  getJobKpiTemplates,
  getJobs,
  updateJobForm,
} from "@/actions/jobs";
import { FormHiddenId } from "@/components/dashboard/form-hidden-id";
import { SelectableListItem, EmptyState } from "@/components/dashboard/selectable-list";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { SplitPanel, PanelHeader, PanelBody } from "@/components/layout/split-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/db";
import { departments, users } from "@/db/schema";
import { verifySession } from "@/lib/auth/session";
import { canManageJobs, hasRole } from "@/lib/auth/permissions";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await verifySession();
  const jobs = await getJobs();
  const templates = await getJobKpiTemplates();
  const selectedId = id ?? jobs[0]?.id;
  const selected = selectedId ? await getJob(selectedId) : null;
  const allDepts = await db.select().from(departments);
  const allUsers = await db.select().from(users);
  const canManage = session ? canManageJobs(session) : false;
  const canViewOverview = session
    ? hasRole(session, "ceo", "ops_manager")
    : false;
  const completeness = canViewOverview ? await getJobCompletenessOverview() : null;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div>
        <h1 className="text-2xl font-bold">岗位结果定义</h1>
        <p className="text-muted-foreground text-sm mt-1">
          管理岗位预期结果、完成标准与 KPI 模板关联
        </p>
      </div>

      {completeness && (
        <div className="border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold text-sm">全公司岗位完整度（营运视图）</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">总岗位 </span>
              {completeness.totalJobs}
            </div>
            <div>
              <span className="text-muted-foreground">已完备 </span>
              {completeness.completeJobs}
            </div>
            <div>
              <span className="text-muted-foreground">待补齐 </span>
              {completeness.issueCount}
            </div>
          </div>
          <ul className="text-xs space-y-1">
            {completeness.byDepartment.map((d) => (
              <li key={d.departmentId}>
                {d.departmentName}：{d.complete}/{d.total}（{d.rate}%）
              </li>
            ))}
          </ul>
        </div>
      )}

      <SplitPanel
        list={
          <>
            <PanelHeader
              title="岗位列表"
              action={
                canManage ? (
                  <Badge variant="outline">{jobs.length} 个</Badge>
                ) : undefined
              }
            />
            <PanelBody className="p-0!">
              {jobs.length === 0 ? (
                <EmptyState message="暂无岗位，HR 可新建岗位" />
              ) : (
                jobs.map((job) => (
                  <SelectableListItem
                    key={job.id}
                    href={`/dashboard/jobs?id=${job.id}`}
                    selected={job.id === selectedId}
                    title={job.title}
                    subtitle={job.status === "published" ? "已发布" : "草稿"}
                    badge={job.status === "published" ? "发布" : "草稿"}
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
                title={selected.title}
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/jobs?id=${selected.id}&tab=templates`}>
                      KPI 模板 ({templates.length})
                    </Link>
                  </Button>
                }
              />
              <PanelBody>
                {canManage ? (
                  <form action={updateJobForm} className="space-y-4 max-w-xl">
                    <FormHiddenId name="jobId" value={selected.id} />
                    <div className="space-y-2">
                      <Label htmlFor="title">岗位名称</Label>
                      <Input id="title" name="title" defaultValue={selected.title} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expectedResult">预期结果</Label>
                      <Textarea
                        id="expectedResult"
                        name="expectedResult"
                        defaultValue={selected.expectedResult}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="completionStandard">完成标准</Label>
                      <Textarea
                        id="completionStandard"
                        name="completionStandard"
                        defaultValue={selected.completionStandard}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="primaryOwnerId">主负责人</Label>
                      <select
                        id="primaryOwnerId"
                        name="primaryOwnerId"
                        defaultValue={selected.primaryOwnerId}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {allUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkerId">检查人</Label>
                      <select
                        id="checkerId"
                        name="checkerId"
                        defaultValue={selected.checkerId}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {allUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="collaboratorIds">协作人 ID（逗号分隔）</Label>
                      <Input
                        id="collaboratorIds"
                        name="collaboratorIds"
                        defaultValue={selected.collaboratorIds ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">状态</Label>
                      <select
                        id="status"
                        name="status"
                        defaultValue={selected.status}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="draft">草稿</option>
                        <option value="published">已发布</option>
                      </select>
                    </div>
                    <SubmitButton>保存岗位</SubmitButton>
                  </form>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">预期结果：</span>
                      {selected.expectedResult}
                    </div>
                    <div>
                      <span className="text-muted-foreground">完成标准：</span>
                      {selected.completionStandard}
                    </div>
                    <Badge>{selected.status === "published" ? "已发布" : "草稿"}</Badge>
                  </div>
                )}

                <div className="mt-8 border-t pt-6 space-y-4">
                  <h3 className="font-semibold text-sm">KPI 模板库</h3>
                  <ul className="space-y-2 text-sm">
                    {templates.map((t) => (
                      <li key={t.id} className="flex justify-between border rounded-md px-3 py-2">
                        <span>{t.name}</span>
                        <span className="text-muted-foreground text-xs">{t.departmentType}</span>
                      </li>
                    ))}
                  </ul>
                  {canManage && templates.length > 0 && (
                    <form action={bindKpiTemplateForm} className="space-y-2 max-w-md">
                      <FormHiddenId name="jobId" value={selected.id} />
                      <Label htmlFor="templateId">绑定 KPI 模板到本岗位</Label>
                      <select
                        id="templateId"
                        name="templateId"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <SubmitButton variant="outline">绑定并生成结果标准</SubmitButton>
                    </form>
                  )}
                </div>
              </PanelBody>
            </>
          ) : (
            <>
              <PanelHeader title="岗位详情" />
              <PanelBody>
                {canManage ? (
                  <form action={createJobForm} className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                      <Label htmlFor="title">岗位名称</Label>
                      <Input id="title" name="title" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="departmentId">部门</Label>
                      <select
                        id="departmentId"
                        name="departmentId"
                        required
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {allDepts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expectedResult">预期结果</Label>
                      <Textarea id="expectedResult" name="expectedResult" required rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="completionStandard">完成标准</Label>
                      <Textarea id="completionStandard" name="completionStandard" required rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="primaryOwnerId">主负责人</Label>
                      <select
                        id="primaryOwnerId"
                        name="primaryOwnerId"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {allUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkerId">检查人</Label>
                      <select
                        id="checkerId"
                        name="checkerId"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {allUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <SubmitButton>新建岗位</SubmitButton>
                  </form>
                ) : (
                  <EmptyState message="请从左侧选择岗位查看详情" />
                )}
              </PanelBody>
            </>
          )
        }
      />
    </div>
  );
}
