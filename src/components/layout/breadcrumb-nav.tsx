"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { findNavGroupByPath, navItems, navOverview } from "./nav-config";

type Crumb = { href: string; label: string; isLast: boolean };

function buildCrumbs(pathname: string): Crumb[] {
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return [{ href: "/dashboard", label: navOverview.title, isLast: true }];
  }

  const activeItem = navItems.find(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  const activeGroup = findNavGroupByPath(pathname);

  const crumbs: Crumb[] = [
    { href: "/dashboard", label: navOverview.title, isLast: false },
  ];

  if (activeGroup && activeItem && activeItem.href !== navOverview.href) {
    crumbs.push({
      href: activeItem.href,
      label: activeGroup.title,
      isLast: false,
    });
    crumbs.push({
      href: pathname,
      label: activeItem.title,
      isLast: pathname === activeItem.href,
    });
  } else if (activeItem) {
    crumbs.push({
      href: pathname,
      label: activeItem.title,
      isLast: pathname === activeItem.href,
    });
  }

  // 详情页追加末级段（如 /dashboard/interviews/xxx）
  if (activeItem && pathname !== activeItem.href) {
    const tail = pathname.slice(activeItem.href.length + 1);
    if (tail) {
      crumbs[crumbs.length - 1] = {
        ...crumbs[crumbs.length - 1],
        isLast: false,
      };
      crumbs.push({ href: pathname, label: tail, isLast: true });
    }
  }

  if (crumbs.length > 0) {
    crumbs[crumbs.length - 1].isLast = true;
  }

  return crumbs;
}

export function BreadcrumbNav() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  return (
    <Breadcrumb className="px-4 py-2 border-b bg-muted/20">
      <BreadcrumbList>
        {crumbs.map((crumb, idx) => (
          <span key={`${crumb.href}-${idx}`} className="contents">
            {idx > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
