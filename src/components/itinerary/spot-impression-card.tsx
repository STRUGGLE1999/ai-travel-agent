import Image from "next/image";
import { cn } from "@/lib/cn";
import { InkSketch } from "@/components/itinerary/ink-sketches";
import type { DestinationImpression } from "@/domain/destinations/catalog";

export function SpotImpressionCard({
  impression,
  className,
}: {
  impression: DestinationImpression;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[3px] border border-border bg-surface shadow-xs transition-all",
        className,
      )}
      aria-label={`景点印象与出行锦囊 · ${impression.name}`}
    >
      {/* Visual media banner */}
      <div className="relative aspect-16/9 w-full overflow-hidden bg-[#f4efe6]">
        {impression.coverImage ? (
          <div className="relative h-full w-full">
            {/* Real photography */}
            <Image
              src={impression.coverImage}
              alt={impression.name}
              fill
              className="object-cover transition-transform duration-500 hover:scale-105"
              sizes="(max-width: 768px) 100vw, 480px"
              priority={false}
            />
            {/* Subtle bottom gradient & ink-tinted frame overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1e2d29]/60 via-transparent to-transparent" />
            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs text-white drop-shadow-xs">
              <span className="font-display tracking-wider">实景印象 · 真实采撷</span>
              <span className="rounded-[2px] bg-[#a63a2f]/90 px-1.5 py-0.5 text-[11px] font-medium tracking-wide text-white">
                官方标准采信
              </span>
            </div>
          </div>
        ) : (
          <div className="relative h-full w-full">
            <InkSketch type={impression.sketchType} className="h-full w-full rounded-none border-0" />
            <div className="absolute bottom-2 left-3 text-xs tracking-wider text-[#52635e]">
              意境线稿 · 黛青墨韵
            </div>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title & Subtitle */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold tracking-wide text-foreground">
              {impression.name}
            </h3>
            <div className="flex items-center gap-1 text-xs text-[#a63a2f]" title={`长者适宜度评分 ${impression.accessibilityRating}/5`}>
              <span className="font-medium">长者适宜</span>
              {"★".repeat(impression.accessibilityRating)}
              {"☆".repeat(5 - impression.accessibilityRating)}
            </div>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {impression.subtitle}
          </p>
        </div>

        {/* Quick metrics pills */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-[2px] border border-border bg-surface-muted/60 px-2 py-0.5 text-muted">
            ⏱ 建议 {impression.suggestedDuration}
          </span>
          <span className="rounded-[2px] border border-border bg-surface-muted/60 px-2 py-0.5 text-muted">
            🌤 {impression.bestTime}
          </span>
        </div>

        {/* Senior / Accessibility Tips Callout */}
        <div className="mt-3.5 rounded-[2px] border-l-3 border-[#a63a2f] bg-[#faf8f4] p-2.5 text-xs leading-relaxed text-[#404d49]">
          <p className="font-semibold text-[#1e2d29]">
            💡 顺路避坑 · 长者出行锦囊
          </p>
          <p className="mt-1 text-[#52635e]">
            {impression.seniorTips}
          </p>
        </div>

        {/* Key Highlights */}
        {impression.highlights.length > 0 ? (
          <ul className="mt-3 space-y-1 text-xs text-muted">
            {impression.highlights.map((highlight, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-[#a63a2f]">•</span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
