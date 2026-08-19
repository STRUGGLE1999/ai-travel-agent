import type { VerificationStatus } from "@/domain";
import { cn } from "@/lib/cn";

const STATUS_COPY: Record<
  VerificationStatus,
  { icon: string; label: string; className: string }
> = {
  VERIFIED: {
    icon: "✓",
    label: "已核验",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  STALE: {
    icon: "⏱",
    label: "可能过期",
    className: "border-warning/40 bg-warning/10 text-warning-foreground",
  },
  UNKNOWN: {
    icon: "?",
    label: "无法确认",
    className: "border-dashed border-muted text-muted",
  },
  MOCK: {
    icon: "◇",
    label: "演示数据",
    className: "border-warning/40 bg-warning/10 text-warning-foreground",
  },
  NOT_REQUIRED: {
    icon: "–",
    label: "无需核验",
    className: "border-border bg-surface-muted text-muted",
  },
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const copy = STATUS_COPY[status];
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-sm",
        copy.className,
      )}
    >
      <span aria-hidden="true">{copy.icon}</span>
      <span>{copy.label}</span>
    </span>
  );
}
