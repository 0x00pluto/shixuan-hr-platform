import {
  checkTaskForm,
  completeTaskForm,
  createTaskForm,
  getTask,
  getTasksOverview,
  getTasksOverviewByDepartment,
  getTodayTasks,
} from "@/actions/tasks";
import { FormHiddenId } from "@/components/dashboard/form-hidden-id";
import { SelectableListItem, EmptyState } from "@/components/dashboard/selectable-list";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { SplitPanel, PanelHeader, PanelBody } from "@/components/layout/split-panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifySession } from "@/lib/auth/session";
import { canCreateTasks, hasRole } from "@/lib/auth/permissions";

const STATUS_LABELS: Record<string, string> = {
  open: "待完成",
  completed: "待检查",
  checked: "已通过",
  rejected: "已驳回",
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await verifySession();
  const tasks = await getTodayTasks();
  const selectedId = id ?? tasks[0]?.id;
  const selected = selectedId ? await getTask(selectedId) : null;
  const allUsers = await db.select().from(users);
  const canCreate = session ? canCreateTasks(session) : false;
  const canViewOverview = session
    ? hasRole(session, "ceo", "ops_manager", "hr")
    : false;
  const overview = canViewOverview ? await getTasksOverview() : null;
  const byDepartment = canViewOverview ? await getTasksOverviewByDepartment() : null;
  const isAssignee = selected?.assigneeId === session?.id;
  const isChecker =
    selected?.checkerId === session?.id ||
    ["ceo", "ops_manager"].includes(session?.role ?? "");

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div>
        <h1 className="text-2xl font-bold">任务管理</h1>
        <p className="text-muted-foreground text-sm mt-1">今日任务创建、完成、检查与落实率概览</p>
      </div>

      {overview && (
        <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border rounded-lg p-3 text-sm">
            <div className="text-muted-foreground text-xs">总任务数</div>
            <div className="text-2xl font-bold">{overview.total}</div>
          </div>
          <div className="border rounded-lg p-3 text-sm">
            <div className="text-muted-foreground text-xs">完成率</div>
            <div className="text-2xl font-bold">{overview.completionRate}%</div>
          </div>
          <div className="border rounded-lg p-3 text-sm">
            <div className="text-muted-foreground text-xs">今日任务</div>
            <div className="text-2xl font-bold">{overview.todayCount}</div>
          </div>
          <div className="border rounded-lg p-3 text-sm">
            <div className="text-muted-foreground text-xs">逾期 open</div>
            <div className="text-2xl font-bold text-amber-600">{overview.overdueCount}</div>
          </div>
        </div>
        {byDepartment && (
          <div className="border rounded-lg p-3 text-sm">
            <h3 className="font-semibold text-xs text-muted-foreground mb-2">
              按部门落实率
            </h3>
            <ul className="space-y-1">
              {byDepartment.map((d) => (
                <li key={d.departmentId}>
                  {d.departmentName}：{d.completionRate}%（{d.total} 项）
                </li>
              ))}
            </ul>
          </div>
        )}
        </div>
      )}

      <SplitPanel
        list={
          <>
            <PanelHeader title="今日任务" />
            <PanelBody className="p-0">
              {tasks.length === 0 ? (
                <EmptyState message="今日暂无任务" />
              ) : (
                tasks.map((t) => (
                  <SelectableListItem
                    key={t.id}
                    href={`/dashboard/tasks?id=${t.id}`}
                    selected={t.id === selectedId}
                    title={t.title}
                    subtitle={STATUS_LABELS[t.status] ?? t.status}
                    badge={STATUS_LABELS[t.status]}
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
                  <Badge>{STATUS_LABELS[selected.status] ?? selected.status}</Badge>
                }
              />
              <PanelBody className="space-y-4">
                <p className="text-sm text-muted-foreground">{selected.description}</p>
                <div className="text-sm">
                  <span className="text-muted-foreground">完成标准：</span>
                  {selected.completionStandard}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">截止：</span>
                  {selected.dueAt.slice(0, 16).replace("T", " ")}
                </div>

                {selected.status === "open" && isAssignee && (
                  <form action={completeTaskForm}>
                    <FormHiddenId name="taskId" value={selected.id} />
                    <SubmitButton>标记完成</SubmitButton>
                  </form>
                )}

                {selected.status === "completed" && isChecker && (
                  <form
                    action={checkTaskForm}
                    className="space-y-3 border-t pt-4 max-w-md"
                  >
                    <FormHiddenId name="taskId" value={selected.id} />
                    <h3 className="font-semibold text-sm">任务检查</h3>
                    <div className="space-y-2">
                      <Label htmlFor="passed">检查结果</Label>
                      <select
                        id="passed"
                        name="passed"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="true">通过</option>
                        <option value="false">驳回</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feedback">反馈</Label>
                      <Textarea id="feedback" name="feedback" rows={2} />
                    </div>
                    <SubmitButton>提交检查</SubmitButton>
                  </form>
                )}
              </PanelBody>
            </>
          ) : (
            <>
              <PanelHeader title="任务详情 / 新建" />
              <PanelBody>
                {canCreate ? (
                  <form action={createTaskForm} className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                      <Label htmlFor="title">任务标题</Label>
                      <Input id="title" name="title" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">描述</Label>
                      <Textarea id="description" name="description" rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assigneeId">执行人</Label>
                      <select
                        id="assigneeId"
                        name="assigneeId"
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
                    <div className="space-y-2">
                      <Label htmlFor="completionStandard">完成标准</Label>
                      <Textarea id="completionStandard" name="completionStandard" required rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueAt">截止时间</Label>
                      <Input id="dueAt" name="dueAt" type="datetime-local" required />
                    </div>
                    <SubmitButton>创建任务</SubmitButton>
                  </form>
                ) : (
                  <EmptyState message="请从左侧选择任务" />
                )}
              </PanelBody>
            </>
          )
        }
      />
    </div>
  );
}
