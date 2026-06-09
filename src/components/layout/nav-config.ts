import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Route,
  Target,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
};

/** 一级：工作台 */
export const navOverview: NavItem = {
  title: "经营总览",
  href: "/dashboard",
  icon: LayoutDashboard,
};

export const navProfile: NavItem = {
  title: "个人中心",
  href: "/dashboard/profile",
  icon: User,
};

/** 一级分组 + 二级菜单 */
export const navGroups: NavGroup[] = [
  {
    title: "组织与标准",
    icon: Briefcase,
    items: [
      { title: "岗位结果定义", href: "/dashboard/jobs", icon: Briefcase },
      { title: "日报/简报", href: "/dashboard/daily-reports", icon: FileText },
      { title: "任务管理", href: "/dashboard/tasks", icon: ClipboardList },
    ],
  },
  {
    title: "人才路由",
    icon: UserCheck,
    items: [
      { title: "面试评估", href: "/dashboard/interviews", icon: UserCheck },
      { title: "MBTI 测评", href: "/dashboard/mbti", icon: Route },
      { title: "课程库", href: "/dashboard/courses", icon: BookOpen },
      { title: "新人培训", href: "/dashboard/training", icon: GraduationCap },
    ],
  },
  {
    title: "绩效与薪酬",
    icon: Wallet,
    items: [
      { title: "绩效考核", href: "/dashboard/performance", icon: Target },
      { title: "薪酬管理", href: "/dashboard/salary", icon: Wallet },
      { title: "OPC 管理", href: "/dashboard/opc", icon: Users },
      { title: "考勤管理", href: "/dashboard/attendance", icon: CalendarCheck },
    ],
  },
  {
    title: "发展与流动",
    icon: TrendingUp,
    items: [
      { title: "晋升流程", href: "/dashboard/promotions", icon: TrendingUp },
      {
        title: "晋升条件库",
        href: "/dashboard/promotion-conditions",
        icon: Target,
      },
      { title: "离职管理", href: "/dashboard/resignations", icon: LogOut },
    ],
  },
  {
    title: "复盘分析",
    icon: BarChart3,
    items: [
      { title: "复盘中心", href: "/dashboard/retrospectives", icon: BarChart3 },
      { title: "深度复盘", href: "/dashboard/analytics", icon: BarChart3 },
    ],
  },
];

/** 扁平列表，供面包屑等复用 */
export const navItems: NavItem[] = [
  navOverview,
  navProfile,
  ...navGroups.flatMap((group) => group.items),
];

export function findNavGroupByPath(pathname: string): NavGroup | undefined {
  return navGroups.find((group) =>
    group.items.some(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
  );
}
