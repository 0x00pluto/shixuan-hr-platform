import {
  createRecruitmentRetrospectiveForm,
  createTrainingRetrospectiveForm,
  listRecruitmentRetrospectives,
  listTrainingRetrospectives,
} from "@/actions/retrospectives";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { SplitPanel, PanelHeader, PanelBody } from "@/components/layout/split-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { verifySession } from "@/lib/auth/session";

export default async function RetrospectivesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const session = await verifySession();
  const recruitment = await listRecruitmentRetrospectives();
  const training = await listTrainingRetrospectives();
  const canCreate = ["hr", "ops_manager", "ceo"].includes(session?.role ?? "");

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div>
        <h1 className="text-2xl font-bold">复盘中心</h1>
        <p className="text-muted-foreground text-sm mt-1">
          招聘复盘与培训复盘归档
        </p>
      </div>

      <Tabs defaultValue={tab ?? "recruitment"}>
        <TabsList>
          <TabsTrigger value="recruitment">招聘复盘</TabsTrigger>
          <TabsTrigger value="training">培训复盘</TabsTrigger>
        </TabsList>

        <TabsContent value="recruitment" className="mt-4">
          <SplitPanel
            list={
              <>
                <PanelHeader title="招聘复盘列表" />
                <PanelBody className="p-0">
                  <ul className="text-sm">
                    {recruitment.map((r) => (
                      <li key={r.id} className="px-4 py-3 border-b">
                        <div className="font-medium">{r.title}</div>
                        <div className="text-xs text-muted-foreground">{r.period}</div>
                      </li>
                    ))}
                  </ul>
                </PanelBody>
              </>
            }
            detail={
              <>
                <PanelHeader title="复盘详情 / 新建" />
                <PanelBody>
                  {recruitment[0] && (
                    <div className="mb-6 text-sm border rounded-md p-4 bg-muted/20">
                      <h3 className="font-semibold">{recruitment[0].title}</h3>
                      <p className="mt-2 text-muted-foreground">{recruitment[0].summary}</p>
                    </div>
                  )}
                  {canCreate && (
                    <form action={createRecruitmentRetrospectiveForm} className="space-y-4 max-w-xl">
                      <div className="space-y-2">
                        <Label htmlFor="period">周期</Label>
                        <Input id="period" name="period" placeholder="2026-Q1" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="title">标题</Label>
                        <Input id="title" name="title" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="summary">总结</Label>
                        <Textarea id="summary" name="summary" required rows={4} />
                      </div>
                      <input type="hidden" name="metricsJson" value="{}" />
                      <SubmitButton>创建招聘复盘</SubmitButton>
                    </form>
                  )}
                </PanelBody>
              </>
            }
          />
        </TabsContent>

        <TabsContent value="training" className="mt-4">
          <SplitPanel
            list={
              <>
                <PanelHeader title="培训复盘列表" />
                <PanelBody className="p-0">
                  <ul className="text-sm">
                    {training.map((r) => (
                      <li key={r.id} className="px-4 py-3 border-b">
                        <div className="font-medium">{r.title}</div>
                        <div className="text-xs text-muted-foreground">{r.period}</div>
                      </li>
                    ))}
                  </ul>
                </PanelBody>
              </>
            }
            detail={
              <>
                <PanelHeader title="复盘详情 / 新建" />
                <PanelBody>
                  {training[0] && (
                    <div className="mb-6 text-sm border rounded-md p-4 bg-muted/20">
                      <h3 className="font-semibold">{training[0].title}</h3>
                      <p className="mt-2 text-muted-foreground">{training[0].summary}</p>
                    </div>
                  )}
                  {canCreate && (
                    <form action={createTrainingRetrospectiveForm} className="space-y-4 max-w-xl">
                      <div className="space-y-2">
                        <Label htmlFor="period">周期</Label>
                        <Input id="period" name="period" placeholder="2026-Q1" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="title">标题</Label>
                        <Input id="title" name="title" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="summary">总结</Label>
                        <Textarea id="summary" name="summary" required rows={4} />
                      </div>
                      <input type="hidden" name="metricsJson" value="{}" />
                      <SubmitButton>创建培训复盘</SubmitButton>
                    </form>
                  )}
                </PanelBody>
              </>
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
