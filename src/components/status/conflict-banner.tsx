import type { ConflictSeverity } from "@/domain";
import { cn } from "@/lib/cn";

const SEVERITY_COPY: Record<
  ConflictSeverity,
  { icon: string; label: string; className: string }
> = {
  BLOCKING: {
    icon: "⛔",
    label: "阻断",
    className: "border-danger/40 bg-danger/10 text-danger",
  },
  HIGH: {
    icon: "!",
    label: "高风险",
    className: "border-warning/40 bg-warning/10 text-warning-foreground",
  },
  MEDIUM: {
    icon: "!",
    label: "建议调整",
    className: "border-info/30 bg-[#e8f1fb] text-info",
  },
  LOW: {
    icon: "i",
    label: "提示",
    className: "border-border bg-surface-muted text-muted",
  },
};

export function ConflictBanner({
  severity,
  title,
  description,
  action,
}: {
  severity: ConflictSeverity;
  title: string;
  description: string;
  action?: string;
}) {
  const copy = SEVERITY_COPY[severity];
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border p-4",
        copy.className,
      )}
    >
      <p className="flex items-center gap-2 text-base font-medium">
        <span aria-hidden="true">{copy.icon}</span>
        <span>
          {copy.label}：{title}
        </span>
      </p>
      <p className="mt-1 text-base">
        {description}
        {action ? ` 建议：${action}` : ""}
      </p>
    </div>
  );
}
