"use client";

import { loginAction } from "@/actions/auth";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "请输入邮箱和密码",
  invalid: "邮箱或密码错误，请重试",
};

export function LoginForm({
  from,
  error,
}: {
  from?: string;
  error?: string;
}) {
  const errorMessage = error ? ERROR_MESSAGES[error] ?? "登录失败，请重试" : null;

  return (
    <form action={loginAction} className="space-y-5">
      {from ? <input type="hidden" name="from" value={from} /> : null}
      <div className="space-y-2">
        <Label htmlFor="email">邮箱</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="name@company.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="请输入密码"
          required
        />
      </div>
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <SubmitButton className="w-full">登录</SubmitButton>
    </form>
  );
}
