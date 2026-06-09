"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  findNavGroupByPath,
  navGroups,
  navOverview,
  type NavGroup,
} from "./nav-config";

function NavGroupSection({
  group,
  pathname,
  defaultOpen,
}: {
  group: NavGroup;
  pathname: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const GroupIcon = group.icon;
  const isGroupActive = group.items.some((item) => pathname === item.href);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel asChild>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isGroupActive && "text-sidebar-accent-foreground"
          )}
        >
          <span className="flex items-center gap-2">
            <GroupIcon className="size-4 shrink-0 opacity-70" />
            {group.title}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 opacity-60 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </SidebarGroupLabel>
      {open && (
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSub>
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuSubItem key={item.href}>
                      <SidebarMenuSubButton asChild isActive={isActive}>
                        <Link href={item.href}>
                          <ItemIcon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const activeGroup = findNavGroupByPath(pathname);

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-sm">师选人才路由</span>
          <span className="text-xs text-muted-foreground">Talent Routing v1.0</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>工作台</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === navOverview.href}
                >
                  <Link href={navOverview.href}>
                    <navOverview.icon />
                    <span>{navOverview.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {navGroups.map((group) => (
          <NavGroupSection
            key={group.title}
            group={group}
            pathname={pathname}
            defaultOpen={activeGroup?.title === group.title}
          />
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
