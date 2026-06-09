"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ROLE_LABELS, type Role } from "@/lib/constants/roles";
import { logoutAction } from "@/actions/auth";

export function AppHeader({
  user,
}: {
  user: { name: string; email: string; role: Role };
}) {
  const router = useRouter();

  async function handleLogout() {
    await logoutAction();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center gap-3 border-b px-4 bg-background shrink-0">
      <SidebarTrigger />
      <div className="flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-2">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">
                {user.name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm hidden sm:inline">{user.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div>{user.name}</div>
            <div className="text-xs font-normal text-muted-foreground">
              {ROLE_LABELS[user.role]} · {user.email}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/profile">
              <User className="size-4" />
              个人中心
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="size-4" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
