import {
  getPromotionConditionRule,
  getPromotionConditionRules,
} from "@/actions/promotion-conditions";
import {
  createPromotionConditionRuleForm,
  deletePromotionConditionRuleForm,
  updatePromotionConditionRuleForm,
} from "@/actions/promotion-conditions";
import { FormHiddenId } from "@/components/dashboard/form-hidden-id";
import { SelectableListItem, EmptyState } from "@/components/dashboard/selectable-list";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { SplitPanel, PanelHeader, PanelBody } from "@/components/layout/split-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { verifySession } from "@/lib/auth/session";

export default async function PromotionConditionsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await verifySession();
  const rules = await getPromotionConditionRules();
  const selectedId = id ?? rules[0]?.id;
  const selected = selectedId ? await getPromotionConditionRule(selectedId) : null;
  const canManage = ["hr", "ops_manager"].includes(session?.role ?? "");

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div>
        <h1 className="text-2xl font-bold">晋升条件库</h1>
        <p className="text-muted-foreground text-sm mt-1">
          各路径职级晋升条件的增删改查
        </p>
      </div>

      <SplitPanel
        list={
          <>
            <PanelHeader title="条件规则" />
            <PanelBody className="p-0">
              {rules.length === 0 ? (
                <EmptyState message="暂无条件规则" />
              ) : (
                rules.map((r) => (
                  <SelectableListItem
                    key={r.id}
                    href={`/dashboard/promotion-conditions?id=${r.id}`}
                    selected={r.id === selectedId}
                    title={r.conditionTitle}
                    subtitle={`${r.pathType} · ${r.levelName}`}
                  />
                ))
              )}
            </PanelBody>
          </>
        }
        detail={
          selected && canManage ? (
            <>
              <PanelHeader title="编辑条件" />
              <PanelBody>
                <form
                  action={updatePromotionConditionRuleForm}
                  className="space-y-4 max-w-xl"
                >
                  <FormHiddenId name="ruleId" value={selected.id} />
                  <div className="space-y-2">
                    <Label htmlFor="pathType">路径类型</Label>
                    <select
                      id="pathType"
                      name="pathType"
                      defaultValue={selected.pathType}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      <option value="management">管理路径</option>
                      <option value="expert">专家路径</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="levelName">职级</Label>
                    <Input id="levelName" name="levelName" defaultValue={selected.levelName} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conditionTitle">条件标题</Label>
                    <Input id="conditionTitle" name="conditionTitle" defaultValue={selected.conditionTitle} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conditionDescription">条件描述</Label>
                    <Textarea
                      id="conditionDescription"
                      name="conditionDescription"
                      defaultValue={selected.conditionDescription}
                      required
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="metricKey">指标键</Label>
                    <Input id="metricKey" name="metricKey" defaultValue={selected.metricKey ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetValue">目标值</Label>
                    <Input id="targetValue" name="targetValue" defaultValue={selected.targetValue ?? ""} />
                  </div>
                  <SubmitButton>保存</SubmitButton>
                </form>
                <form action={deletePromotionConditionRuleForm} className="mt-2">
                  <FormHiddenId name="ruleId" value={selected.id} />
                  <Button type="submit" variant="destructive">
                    删除
                  </Button>
                </form>
              </PanelBody>
            </>
          ) : selected ? (
            <>
              <PanelHeader title={selected.conditionTitle} />
              <PanelBody className="text-sm space-y-2">
                <p>
                  <span className="text-muted-foreground">路径：</span>
                  {selected.pathType} / {selected.levelName}
                </p>
                <p>{selected.conditionDescription}</p>
                {selected.metricKey && (
                  <p className="text-muted-foreground">
                    指标 {selected.metricKey} ≥ {selected.targetValue}
                  </p>
                )}
              </PanelBody>
            </>
          ) : (
            <>
              <PanelHeader title="新建条件" />
              <PanelBody>
                {canManage ? (
                  <form action={createPromotionConditionRuleForm} className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                      <Label htmlFor="pathType">路径类型</Label>
                      <select
                        id="pathType"
                        name="pathType"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="management">管理路径</option>
                        <option value="expert">专家路径</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="levelName">职级</Label>
                      <Input id="levelName" name="levelName" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="conditionTitle">条件标题</Label>
                      <Input id="conditionTitle" name="conditionTitle" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="conditionDescription">条件描述</Label>
                      <Textarea id="conditionDescription" name="conditionDescription" required rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="metricKey">指标键（可选）</Label>
                      <Input id="metricKey" name="metricKey" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetValue">目标值（可选）</Label>
                      <Input id="targetValue" name="targetValue" />
                    </div>
                    <SubmitButton>创建条件</SubmitButton>
                  </form>
                ) : (
                  <EmptyState message="仅 HR / 营运经理可管理晋升条件" />
                )}
              </PanelBody>
            </>
          )
        }
      />
    </div>
  );
}
