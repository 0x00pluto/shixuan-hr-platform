import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  if (!session) redirect("/api/auth/clear-session");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <AppHeader user={session} />
        <BreadcrumbNav />
        <main className="flex flex-1 flex-col min-h-0 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
