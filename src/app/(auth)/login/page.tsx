import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { verifySession } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { from, error } = await searchParams;
  const session = await verifySession();
  if (session) {
    redirect(from?.startsWith("/") && !from.startsWith("//") ? from : "/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-100 p-6">
      <Card className="w-full max-w-md shadow-lg border-emerald-100/80">
        <CardHeader className="text-center space-y-2 pb-2">
          <CardTitle className="text-2xl tracking-tight">师选人才路由系统</CardTitle>
          <CardDescription>使用企业邮箱与密码登录</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <LoginForm from={from} error={error} />
        </CardContent>
      </Card>
    </div>
  );
}
