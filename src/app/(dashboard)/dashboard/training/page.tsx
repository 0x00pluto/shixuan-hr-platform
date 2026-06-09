import {
  assignCourseToTrainingForm,
  getCourses,
  getTrainingCourseAssignments,
  updateCourseProgressForm,
} from "@/actions/courses";
import {
  approveTrainingExtensionForm,
  ceoAcceptTrainingForm,
  createTrainingExamForm,
  createTrainingPlanForm,
  extendTrainingForm,
  getTrainingPlan,
  submitExamAttemptForm,
} from "@/actions/training";
import {
  getCeoAcceptance,
  getTrainingPlans,
} from "@/actions/page-adapters";
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
import { hasRole } from "@/lib/auth/permissions";

const STATUS_LABELS: Record<string, string> = {
  in_progress: "进行中",
  completed: "已完成",
  extended: "已延期",
  failed: "未通过",
};

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await verifySession();
  const plans = await getTrainingPlans();
  const selectedId = id ?? plans[0]?.id;
  const selected = selectedId ? await getTrainingPlan(selectedId) : null;
  const exams = selected?.exams ?? [];
  const extensions = selected?.extensions ?? [];
  const acceptance = selected?.ceoAcceptance ?? null;
  const courses = await getCourses();
  const courseAssignments = selected?.userId
    ? await getTrainingCourseAssignments(selected.userId)
    : [];
  const courseMap = new Map(courses.map((c) => [c.id, c.title]));
  const allUsers = await db.select().from(users);

  const canManageExam = session
    ? hasRole(session, "hr", "tech_director", "dept_leader")
    : false;
  const canExtend = session ? hasRole(session, "hr", "dept_leader") : false;
  const canCreatePlan = session ? hasRole(session, "hr", "dept_leader") : false;
  const canTakeExam = !!(
    session &&
    selected &&
    (selected.userId === session.id ||
      hasRole(session, "newcomer", "employee"))
  );
  const canAccept = session?.role === "ceo";
  const pendingExtensions = extensions.filter((e) => !e.approvedById);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div>
        <h1 className="text-2xl font-bold">新人培训</h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI 答题考核、培训延长、CEO 验收与转正联动
        </p>
      </div>

      <SplitPanel
        list={
          <>
            <PanelHeader title="培训计划" />
            <PanelBody className="p-0">
              {plans.length === 0 ? (
                <EmptyState message="暂无培训计划" />
              ) : (
                plans.map((p) => (
                  <SelectableListItem
                    key={p.id}
                    href={`/dashboard/training?id=${p.id}`}
                    selected={p.id === selectedId}
                    title={`计划 ${p.id.slice(0, 8)}`}
                    subtitle={STATUS_LABELS[p.status] ?? p.status}
                    badge={STATUS_LABELS[p.status]}
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
                title="培训详情"
                action={
                  <Badge>{STATUS_LABELS[selected.status] ?? selected.status}</Badge>
                }
              />
              <PanelBody className="space-y-6">
                <div className="text-sm grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">开始：</span>
                    {selected.startedAt.slice(0, 10)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">预计结束：</span>
                    {selected.expectedEndAt?.slice(0, 10) ?? "—"}
                  </div>
                </div>

                {canManageExam && selected.status === "in_progress" && (
                  <form
                    action={createTrainingExamForm}
                    className="space-y-3 border rounded-lg p-4 max-w-md"
                  >
                    <FormHiddenId name="planId" value={selected.id} />
                    <h3 className="font-semibold text-sm">创建答题考核</h3>
                    <div className="space-y-2">
                      <Label htmlFor="title">考试名称</Label>
                      <Input id="title" name="title" required placeholder="新人技能考核" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passThreshold">及格线 (0-1)</Label>
                      <Input id="passThreshold" name="passThreshold" type="number" step="0.05" defaultValue={0.8} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="skillTags">技能标签 (逗号分隔)</Label>
                      <Input id="skillTags" name="skillTags" placeholder="新媒体,海报制作" />
                    </div>
                    <SubmitButton variant="secondary">生成考题 (AI)</SubmitButton>
                  </form>
                )}

                <div>
                  <h3 className="font-semibold text-sm mb-2">考试 ({exams.length})</h3>
                  {exams.map((exam) => (
                    <div key={exam.id} className="border rounded-md p-4 mb-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-sm">{exam.title}</div>
                        <span className="text-xs text-muted-foreground">
                          及格线 {(exam.passThreshold * 100).toFixed(0)}%
                        </span>
                      </div>

                      {exam.attempts.length > 0 && (
                        <ul className="text-xs text-muted-foreground">
                          {exam.attempts.map((a) => (
                            <li key={a.id}>
                              得分 {a.score != null ? (a.score * 100).toFixed(0) : "—"}%
                              {a.passed != null && (a.passed ? " · 通过" : " · 未通过")}
                            </li>
                          ))}
                        </ul>
                      )}

                      {canTakeExam && selected.status === "in_progress" && exam.questions.length > 0 && (
                        <form
                          action={submitExamAttemptForm}
                          className="space-y-3 border-t pt-3"
                        >
                          <FormHiddenId name="examId" value={exam.id} />
                          <h4 className="text-sm font-medium">答题考核</h4>
                          {exam.questions.map((q, idx) => {
                            const options = q.optionsJson
                              ? (JSON.parse(q.optionsJson) as string[])
                              : null;
                            return (
                              <div key={q.id} className="space-y-1 text-sm">
                                <p>
                                  {idx + 1}. [{q.questionType}] {q.content}
                                </p>
                                {options ? (
                                  <div className="space-y-1 pl-2">
                                    {options.map((opt) => (
                                      <label key={opt} className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          name={`answer_${q.id}`}
                                          value={opt}
                                          required
                                        />
                                        {opt}
                                      </label>
                                    ))}
                                  </div>
                                ) : (
                                  <Textarea
                                    name={`answer_${q.id}`}
                                    rows={2}
                                    required
                                    placeholder="实操作答…"
                                  />
                                )}
                              </div>
                            );
                          })}
                          <SubmitButton>提交答卷</SubmitButton>
                        </form>
                      )}
                    </div>
                  ))}
                </div>

                {extensions.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">延期记录</h3>
                    <ul className="text-sm space-y-2">
                      {extensions.map((ext) => (
                        <li key={ext.id} className="border rounded-md px-3 py-2 flex justify-between items-center">
                          <span className="text-muted-foreground">
                            +{ext.extendedDays} 天 · {ext.reason}
                          </span>
                          {!ext.approvedById && canExtend && (
                            <form action={approveTrainingExtensionForm}>
                              <FormHiddenId name="extensionId" value={ext.id} />
                              <SubmitButton variant="outline">批准延期</SubmitButton>
                            </form>
                          )}
                          {ext.approvedById && (
                            <Badge variant="secondary">已批准</Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {pendingExtensions.length > 0 && canExtend && (
                  <p className="text-sm text-amber-700">
                    有 {pendingExtensions.length} 条延期申请待批准
                  </p>
                )}

                {acceptance && (
                  <div className="text-sm border rounded-md px-3 py-2 bg-muted/30">
                    CEO 验收：{acceptance.accepted ? "通过" : "未通过"}
                    {acceptance.notes && (
                      <p className="text-muted-foreground mt-1">{acceptance.notes}</p>
                    )}
                  </div>
                )}

                {canExtend && selected.status === "in_progress" && (
                  <form
                    action={extendTrainingForm}
                    className="space-y-3 border-t pt-4 max-w-md"
                  >
                    <FormHiddenId name="planId" value={selected.id} />
                    <h3 className="font-semibold text-sm">申请延期</h3>
                    <div className="space-y-2">
                      <Label htmlFor="reason">延期原因</Label>
                      <Textarea id="reason" name="reason" required rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="extendedDays">延期天数</Label>
                      <Input id="extendedDays" name="extendedDays" type="number" defaultValue={7} />
                    </div>
                    <SubmitButton variant="secondary">提交延期</SubmitButton>
                  </form>
                )}

                {canAccept && !acceptance && selected.status === "in_progress" && (
                  <form
                    action={ceoAcceptTrainingForm}
                    className="space-y-3 border-t pt-4 max-w-md"
                  >
                    <FormHiddenId name="planId" value={selected.id} />
                    <h3 className="font-semibold text-sm">CEO 培训验收</h3>
                    <div className="space-y-2">
                      <Label htmlFor="accepted">验收结果</Label>
                      <select
                        id="accepted"
                        name="accepted"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="true">通过（联动转正 100%）</option>
                        <option value="false">不通过</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">备注</Label>
                      <Textarea id="notes" name="notes" rows={2} />
                    </div>
                    <SubmitButton>提交验收</SubmitButton>
                  </form>
                )}

                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-semibold text-sm">课程学习关联</h3>
                  {courseAssignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">暂未分配课程</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {courseAssignments.map((a) => (
                        <li key={a.id} className="border rounded-md px-3 py-2">
                          <div className="font-medium">
                            {courseMap.get(a.courseId) ?? a.courseId}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            进度 {a.progressPercent}%
                            {a.isRequired ? " · 必修" : ""}
                          </p>
                          {canTakeExam && a.progressPercent < 100 && (
                            <form action={updateCourseProgressForm} className="flex gap-2 mt-2">
                              <FormHiddenId name="assignmentId" value={a.id} />
                              <Input
                                name="progressPercent"
                                type="number"
                                min={0}
                                max={100}
                                defaultValue={Math.min(a.progressPercent + 25, 100)}
                                className="h-8"
                              />
                              <SubmitButton variant="outline">更新进度</SubmitButton>
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {canCreatePlan && selected?.userId && courses.length > 0 && (
                    <form action={assignCourseToTrainingForm} className="space-y-2 max-w-md">
                      <FormHiddenId name="userId" value={selected.userId} />
                      <Label htmlFor="courseId">分配课程</Label>
                      <select
                        id="courseId"
                        name="courseId"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                      <SubmitButton variant="secondary">分配课程</SubmitButton>
                    </form>
                  )}
                </div>
              </PanelBody>
            </>
          ) : (
            <>
              <PanelHeader title="新建培训计划" />
              <PanelBody>
                {canCreatePlan ? (
                  <form action={createTrainingPlanForm} className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                      <Label htmlFor="userId">学员</Label>
                      <select
                        id="userId"
                        name="userId"
                        required
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {allUsers
                          .filter((u) => ["newcomer", "employee"].includes(u.role))
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expectedEndAt">预计结束日期</Label>
                      <Input id="expectedEndAt" name="expectedEndAt" type="date" />
                    </div>
                    <SubmitButton>创建培训计划</SubmitButton>
                  </form>
                ) : (
                  <EmptyState message="请从左侧选择培训计划" />
                )}
              </PanelBody>
            </>
          )
        }
      />
    </div>
  );
}
