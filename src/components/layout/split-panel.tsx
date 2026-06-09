import { cn } from "@/lib/utils";

export function SplitPanel({
  list,
  detail,
  className,
}: {
  list: React.ReactNode;
  detail: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-1 min-h-0 gap-4", className)}>
      <aside className="w-80 shrink-0 flex flex-col min-h-0 border rounded-lg bg-card overflow-hidden">
        {list}
      </aside>
      <section className="flex-1 min-w-0 flex flex-col min-h-0 border rounded-lg bg-card overflow-hidden">
        {detail}
      </section>
    </div>
  );
}

export function PanelHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
      <h2 className="font-semibold text-sm">{title}</h2>
      {action}
    </div>
  );
}

export function PanelBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex-1 overflow-auto p-4", className)}>{children}</div>
  );
}
