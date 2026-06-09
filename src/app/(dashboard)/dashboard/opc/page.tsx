import {
  createOpcAgreementForm,
  createOpcPartnerForm,
  createOpcProjectForm,
  getOpcCeoOverview,
  getOpcPartner,
  listOpcPartners,
  setRevenueShareForm,
} from "@/actions/opc";
import { FormHiddenId } from "@/components/dashboard/form-hidden-id";
import { SelectableListItem, EmptyState } from "@/components/dashboard/selectable-list";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { SplitPanel, PanelHeader, PanelBody } from "@/components/layout/split-panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { verifySession } from "@/lib/auth/session";
import { canManageOpc, hasRole } from "@/lib/auth/permissions";

export default async function OpcPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; tab?: string }>;
}) {
  const { id, tab } = await searchParams;
  const session = await verifySession();
  const partners = await listOpcPartners();
  const selectedId = id ?? partners[0]?.id;
  const selected = selectedId ? await getOpcPartner(selectedId) : null;
  const projects = selected?.projects ?? [];
  const agreements = selected?.agreements ?? [];
  const canManage = session ? canManageOpc(session) : false;
  const ceoOverview =
    session && hasRole(session, "ceo", "ops_manager")
      ? await getOpcCeoOverview()
      : null;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div>
        <h1 className="text-2xl font-bold">OPC 管理</h1>
        <p className="text-muted-foreground text-sm mt-1">
          OPC 合伙人、合作项目与协议管理
        </p>
        {ceoOverview && (
          <div className="flex flex-wrap gap-2 mt-2 text-sm">
            <Badge variant="outline">合伙人 {ceoOverview.partnerCount}</Badge>
            <Badge variant="outline">活跃 {ceoOverview.activePartners}</Badge>
            <Badge variant="outline">项目 {ceoOverview.projectCount}</Badge>
            <Badge variant="outline">均分成 {ceoOverview.avgShare}%</Badge>
          </div>
        )}
      </div>

      <SplitPanel
        list={
          <>
            <PanelHeader title="OPC 合伙人" />
            <PanelBody className="p-0">
              {partners.length === 0 ? (
                <EmptyState message="暂无 OPC 合伙人" />
              ) : (
                partners.map((p) => (
                  <SelectableListItem
                    key={p.id}
                    href={`/dashboard/opc?id=${p.id}`}
                    selected={p.id === selectedId}
                    title={p.name}
                    subtitle={p.email ?? p.phone ?? ""}
                    badge={p.status === "active" ? "活跃" : p.status}
                  />
                ))
              )}
            </PanelBody>
          </>
        }
        detail={
          selected ? (
            <>
              <PanelHeader title={selected.name} />
              <PanelBody>
                <Tabs defaultValue={tab ?? "projects"}>
                  <TabsList>
                    <TabsTrigger value="projects">项目 ({projects.length})</TabsTrigger>
                    <TabsTrigger value="agreements">协议 ({agreements.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="projects" className="space-y-4 mt-4">
                    <ul className="space-y-2 text-sm">
                      {projects.map((proj) => (
                        <li key={proj.id} className="border rounded-md px-3 py-2 space-y-2">
                          <div className="font-medium">{proj.projectName}</div>
                          <p className="text-muted-foreground text-xs mt-1">
                            {proj.description}
                          </p>
                          <Badge variant="secondary" className="mt-1">
                            {proj.status}
                          </Badge>
                          {proj.revenueShares?.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              分成：{proj.revenueShares.map((s) => `${s.sharePercent}%`).join("、")}
                            </p>
                          )}
                          {canManage && (
                            <form action={setRevenueShareForm} className="flex gap-2 items-end">
                              <FormHiddenId name="projectId" value={proj.id} />
                              <div className="space-y-1 flex-1">
                                <Label htmlFor={`share-${proj.id}`}>分成比例 %</Label>
                                <Input
                                  id={`share-${proj.id}`}
                                  name="sharePercent"
                                  type="number"
                                  min={0}
                                  max={100}
                                  defaultValue={30}
                                />
                              </div>
                              <SubmitButton variant="outline">设置</SubmitButton>
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                    {canManage && (
                      <form
                        action={createOpcProjectForm}
                        className="space-y-3 border-t pt-4 max-w-md"
                      >
                        <FormHiddenId name="partnerId" value={selected.id} />
                        <h3 className="font-semibold text-sm">新建项目</h3>
                        <div className="space-y-2">
                          <Label htmlFor="projectName">项目名称</Label>
                          <Input id="projectName" name="projectName" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">描述</Label>
                          <Textarea id="description" name="description" rows={2} />
                        </div>
                        <SubmitButton>创建项目</SubmitButton>
                      </form>
                    )}
                  </TabsContent>

                  <TabsContent value="agreements" className="space-y-4 mt-4">
                    <ul className="space-y-2 text-sm">
                      {agreements.map((a) => (
                        <li key={a.id} className="border rounded-md px-3 py-2">
                          <div className="font-medium">{a.title}</div>
                          {a.signedAt && (
                            <span className="text-xs text-muted-foreground">
                              签署于 {a.signedAt}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {canManage && (
                      <form
                        action={createOpcAgreementForm}
                        className="space-y-3 border-t pt-4 max-w-md"
                      >
                        <FormHiddenId name="partnerId" value={selected.id} />
                        <h3 className="font-semibold text-sm">新建协议</h3>
                        <div className="space-y-2">
                          <Label htmlFor="title">协议标题</Label>
                          <Input id="title" name="title" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fileUrl">文件链接</Label>
                          <Input id="fileUrl" name="fileUrl" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signedAt">签署日期</Label>
                          <Input id="signedAt" name="signedAt" type="date" />
                        </div>
                        <SubmitButton>创建协议</SubmitButton>
                      </form>
                    )}
                  </TabsContent>
                </Tabs>
              </PanelBody>
            </>
          ) : (
            <>
              <PanelHeader title="新建 OPC 合伙人" />
              <PanelBody>
                {canManage ? (
                  <form action={createOpcPartnerForm} className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                      <Label htmlFor="name">姓名</Label>
                      <Input id="name" name="name" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="email">邮箱</Label>
                        <Input id="email" name="email" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">电话</Label>
                        <Input id="phone" name="phone" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="advantages">优势标签</Label>
                      <Textarea id="advantages" name="advantages" rows={2} />
                    </div>
                    <SubmitButton>创建合伙人档案</SubmitButton>
                  </form>
                ) : (
                  <EmptyState message="请从左侧选择 OPC 合伙人" />
                )}
              </PanelBody>
            </>
          )
        }
      />
    </div>
  );
}
