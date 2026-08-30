import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { ModeBadge } from "@/components/status/mode-badge";
import type { DataMode } from "@/domain";
import { cn } from "@/lib/cn";

export type StatusTone = "neutral" | "warning" | "info" | "cinnabar" | "primary";

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-surface-muted text-muted",
  warning: "bg-warning/10 text-warning-foreground",
  info: "bg-info-wash text-info",
  cinnabar: "bg-cinnabar/10 text-cinnabar",
  primary: "bg-primary/10 text-primary",
};

export function SiteHeader({
  dataMode,
  persistenceLabel,
  tripTitle,
  statusLabel,
  statusTone = "neutral",
  demoReason,
}: {
  dataMode: DataMode;
  persistenceLabel?: string;
  tripTitle?: string;
  statusLabel?: string;
  statusTone?: StatusTone;
  demoReason?: string | null;
}) {
  return (
    <header className="border-b border-border bg-surface/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-wide text-primary"
          >
            <BrandMark className="text-cinnabar" />
            风来成行
          </Link>
          {tripTitle ? (
            <span className="text-base text-muted">{tripTitle}</span>
          ) : (
            <span className="font-display text-base tracking-widest text-muted">
              懂变化的 AI 旅行搭子
            </span>
          )}
          {statusLabel ? (
            <span
              className={cn(
                "font-display rounded-[2px] px-2 py-0.5 text-sm font-medium tracking-wide",
                TONE_CLASS[statusTone],
              )}
            >
              {statusLabel}
            </span>
          ) : null}
        </div>
        <ModeBadge
          dataMode={dataMode}
          persistenceLabel={persistenceLabel}
          demoReason={demoReason}
        />
      </div>
    </header>
  );
}
