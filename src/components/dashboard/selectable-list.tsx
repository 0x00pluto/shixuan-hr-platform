import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function SelectableListItem({
  href,
  selected,
  title,
  subtitle,
  badge,
}: {
  href: string;
  selected?: boolean;
  title: string;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block px-4 py-3 border-b text-sm hover:bg-muted/50 transition-colors",
        selected && "bg-muted"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate">{title}</div>
          {subtitle && (
            <div className="text-muted-foreground text-xs mt-0.5 truncate">
              {subtitle}
            </div>
          )}
        </div>
        {badge && (
          <Badge variant="secondary" className="shrink-0">
            {badge}
          </Badge>
        )}
      </div>
    </Link>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-8 text-center">
      {message}
    </div>
  );
}
