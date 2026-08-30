import type { DataMode } from "@/domain";
import { cn } from "@/lib/cn";

export function ModeBadge({
  dataMode,
  persistenceLabel,
  demoReason,
}: {
  dataMode: DataMode;
  persistenceLabel?: string;
  demoReason?: string | null;
}) {
  const label =
    dataMode === "DEMO"
      ? `演示模式：${demoReason ?? "真实模型未启用"}`
      : "AI 实时理解＋地图/票务演示数据";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "font-display inline-flex min-h-11 items-center rounded-[3px] border px-3 text-sm font-medium tracking-wide",
          dataMode === "DEMO"
            ? "border-warning/40 bg-warning/10 text-warning-foreground"
            : "border-info/30 bg-info-wash text-info",
        )}
      >
        <span aria-hidden="true" className="mr-2">
          {dataMode === "DEMO" ? "◇" : "◆"}
        </span>
        {label}
      </span>
      {persistenceLabel ? (
        <span className="text-sm text-muted">{persistenceLabel}</span>
      ) : null}
    </div>
  );
}
