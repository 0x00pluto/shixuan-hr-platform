import {
  createSalaryProfileForm,
  reviewSalaryAuditForm,
  setSalaryStatusForm,
  submitSalaryAuditForm,
} from "@/actions/salary";
import {
  getSalaryAudits,
  getSalaryProfile,
  getSalaryProfiles,
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
import { canAuditSalary, hasRole } from "@/lib/auth/permissions";

const AUDIT_LABELS: Record<string, string> = {
  draft: "草稿",
  pending: "待审计",
  approved: "已通过",
  rejected: "已驳回",
};

export default async function SalaryPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await verifySession();
  const profiles = await getSalaryProfiles();
  const allUsers = await db.select().from(users);
  const usersWithoutProfile = allUsers.filter(
    (u) =>
      ["employee", "newcomer", "dept_leader", "hr"].includes(u.role) &&
      !profiles.some((p) => p.userId === u.id)
  );
  const selectedId = id ?? profiles[0]?.id;
  const selected = selectedId ? await getSalaryProfile(selectedId) : null;
  const audits = selected ? await getSalaryAudits(selected.id) : [];
  const canAudit = session ? canAuditSalary(session) : false;
  const canReview = ["ceo", "ops_manager"].includes(session?.role ?? "");
  const canManage = session ? hasRole(session, "hr", "ops_manager") : false;
  const pendingAudit = audits.find((a) => a.status === "pending");

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div>
        <h1 className="text-2xl font-bold">薪酬管理</h1>
        <p className="text-muted-foreground text-sm mt-1">
          薪酬建档、培训期/转正状态、审计与审批
        </p>
      </div>

      <SplitPanel
        list={
          <>
            <PanelHeader title="薪酬档案" />
            <PanelBody className="p-0">
              {profiles.length === 0 ? (
                <EmptyState message="暂无可见薪酬档案" />
              ) : (
                profiles.map((p) => (
                  <SelectableListItem
                    key={p.id}
                    href={`/dashboard/salary?id=${p.id}`}
                    selected={p.id === selectedId}
                    title={p.user?.name ?? p.userId}
                    subtitle={`基数 ¥${p.baseSalary} · ${p.status === "training" ? "培训期" : "正式"}`}
                    badge={AUDIT_LABELS[p.auditStatus] ?? p.auditStatus}
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
                title={selected.user?.name ?? "薪酬详情"}
                action={
                  <Badge>{AUDIT_LABELS[selected.auditStatus] ?? selected.auditStatus}</Badge>
                }
              />
              <PanelBody className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">基本薪资：</span>¥
                    {selected.baseSalary}
                  </div>
                  <div>
                    <span className="text-muted-foreground">薪资比例：</span>
                    {(selected.salaryRatio * 100).toFixed(0)}%
                  </div>
                  <div>
                    <span className="text-muted-foreground">状态：</span>
                    {selected.status === "training" ? "培训期 (80%)" : "正式 (100%)"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">应发估算：</span>¥
                    {Math.round(selected.baseSalary * selected.salaryRatio)}
                  </div>
                </div>

                {canManage && (
                  <form
                    action={setSalaryStatusForm}
                    className="space-y-3 border rounded-lg p-4 max-w-md"
                  >
                    <FormHiddenId name="profileId" value={selected.id} />
                    <h3 className="font-semibold text-sm">变更薪酬状态</h3>
                    <div className="space-y-2">
                      <Label htmlFor="status">状态</Label>
                      <select
                        id="status"
                        name="status"
                        defaultValue={selected.status}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="training">培训期 (80%)</option>
                        <option value="regular">转正 (100%)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reason">变更原因</Label>
                      <Input id="reason" name="reason" placeholder="培训验收通过 / 手动调整…" />
                    </div>
                    <SubmitButton variant="secondary">更新状态</SubmitButton>
                  </form>
                )}

                {canAudit && selected.auditStatus === "draft" && (
                  <form action={submitSalaryAuditForm}>
                    <FormHiddenId name="profileId" value={selected.id} />
                    <SubmitButton>提交营运审计</SubmitButton>
                  </form>
                )}

                <div>
                  <h3 className="font-semibold text-sm mb-2">审计记录</h3>
                  <ul className="space-y-2 text-sm">
                    {audits.map((a) => (
                      <li key={a.id} className="border rounded-md px-3 py-2">
                        <div className="flex justify-between">
                          <Badge variant="secondary">{a.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {a.createdAt.slice(0, 10)}
                          </span>
                        </div>
                        {a.reviewNote && (
                          <p className="mt-1 text-muted-foreground">{a.reviewNote}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {canReview && pendingAudit && (
                  <form
                    action={reviewSalaryAuditForm}
                    className="border-t pt-4 space-y-3 max-w-md"
                  >
                    <FormHiddenId name="auditId" value={pendingAudit.id} />
                    <h3 className="font-semibold text-sm">审批审计</h3>
                    <div className="space-y-2">
                      <Label htmlFor="approved">审批结果</Label>
                      <select
                        id="approved"
                        name="approved"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="true">通过</option>
                        <option value="false">驳回</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reviewNote">审批意见</Label>
                      <Textarea id="reviewNote" name="reviewNote" rows={2} />
                    </div>
                    <SubmitButton>提交审批</SubmitButton>
                  </form>
                )}
              </PanelBody>
            </>
          ) : (
            <>
              <PanelHeader title="新建薪酬档案" />
              <PanelBody>
                {canManage && usersWithoutProfile.length > 0 ? (
                  <form action={createSalaryProfileForm} className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                      <Label htmlFor="userId">员工</Label>
                      <select
                        id="userId"
                        name="userId"
                        required
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {usersWithoutProfile.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="baseSalary">基本薪资 (元)</Label>
                      <Input id="baseSalary" name="baseSalary" type="number" required min={0} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">初始状态</Label>
                      <select
                        id="status"
                        name="status"
                        defaultValue="training"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="training">培训期 (80%)</option>
                        <option value="regular">正式 (100%)</option>
                      </select>
                    </div>
                    <SubmitButton>创建薪酬档案</SubmitButton>
                  </form>
                ) : (
                  <EmptyState
                    message={
                      canManage
                        ? "所有员工已有薪酬档案，请从左侧选择"
                        : "请从左侧选择薪酬档案"
                    }
                  />
                )}
              </PanelBody>
            </>
          )
        }
      />
    </div>
  );
}
