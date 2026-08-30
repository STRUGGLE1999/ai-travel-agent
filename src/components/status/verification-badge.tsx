import type { VerificationStatus } from "@/domain";
import { cn } from "@/lib/cn";

const STATUS_COPY: Record<
  VerificationStatus,
  { icon: string; label: string; className: string }
> = {
  VERIFIED: {
    icon: "✓",
    label: "已核验",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  STALE: {
    icon: "⏱",
    label: "可能过期",
    className: "bg-warning/10 text-warning-foreground border-warning/40",
  },
  UNKNOWN: {
    icon: "?",
    label: "无法确认",
    className: "border-dashed border-muted/60 text-muted bg-transparent",
  },
  MOCK: {
    icon: "◇",
    label: "演示数据",
    className: "bg-warning/10 text-warning-foreground border-warning/40",
  },
  NOT_REQUIRED: {
    icon: "–",
    label: "无需核验",
    className: "bg-surface-muted text-muted border-border",
  },
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const copy = STATUS_COPY[status];
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-[2px] border px-2.5 text-sm tracking-wide",
        copy.className,
      )}
    >
      <span aria-hidden="true">{copy.icon}</span>
      <span>{copy.label}</span>
    </span>
  );
}
