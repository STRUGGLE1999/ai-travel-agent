"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { VerificationBadge } from "@/components/status/verification-badge";
import { AmapView } from "@/components/itinerary/amap-view";
import { SpotImpressionCard } from "@/components/itinerary/spot-impression-card";
import { getOrInferImpression } from "@/domain/destinations/catalog";
import type { VerificationStatus } from "@/domain";

export interface WorkbenchPlace {
  placeId: string;
  name: string;
  mapX: number;
  mapY: number;
  lat?: number | null;
  lng?: number | null;
}

export interface WorkbenchItem {
  id: string;
  day: number;
  startAt: string;
  endAt: string;
  type: string;
  title: string;
  placeId: string | null;
  transportMode: string | null;
  locked: boolean;
  notes: string;
  evidence: Array<{
    factKey: string;
    summary: string;
    status: VerificationStatus;
    sourceName: string;
  }>;
  conflictSeverities: string[];
}

const TYPE_LABEL: Record<string, string> = {
  PLACE: "地点",
  TRANSIT: "交通",
  MEAL: "用餐",
  REST: "休息",
  CHECK_IN: "节点",
  BUFFER: "缓冲",
};

export function PlanWorkbench({
  items,
  places,
}: {
  items: WorkbenchItem[];
  places: WorkbenchPlace[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"timeline" | "map">("timeline");
  const [mapMode, setMapMode] = useState<"amap" | "schematic">(() =>
    Boolean(process.env.NEXT_PUBLIC_AMAP_KEY) ? "amap" : "schematic",
  );
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const days = [...new Set(items.map((item) => item.day))].sort(
    (a, b) => a - b,
  );
  const [activeDay, setActiveDay] = useState<number>(days[0] ?? 1);

  const dayItems = items.filter((item) => item.day === activeDay);
  const visitedPlaceIds = dayItems
    .map((item) => item.placeId)
    .filter((id): id is string => Boolean(id));
  const dayPlaces = places.filter((place) =>
    visitedPlaceIds.includes(place.placeId),
  );
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

  // Derive impression for selected item or fallback to first visited place of the day
  const effectiveItem =
    selectedItem ??
    dayItems.find((it) => Boolean(it.placeId)) ??
    dayItems[0] ??
    null;

  const effectivePlace = effectiveItem?.placeId
    ? places.find((p) => p.placeId === effectiveItem.placeId)
    : null;

  const currentImpression = effectiveItem
    ? getOrInferImpression(
        effectiveItem.placeId,
        effectivePlace?.name ?? effectiveItem.title,
        effectiveItem.type,
        { title: effectiveItem.title, notes: effectiveItem.notes },
      )
    : null;

  const selectItem = (item: WorkbenchItem) => {
    setSelectedId(item.id === selectedId ? null : item.id);
  };
  const selectMarker = (placeId: string) => {
    const target = dayItems.find((item) => item.placeId === placeId);
    if (target) {
      setSelectedId(target.id === selectedId ? null : target.id);
      const el = document.getElementById(`plan-item-${target.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  // Route polyline follows the visit order of the day.
  const routePoints = visitedPlaceIds
    .map((placeId) => places.find((place) => place.placeId === placeId))
    .filter((place): place is WorkbenchPlace => Boolean(place))
    .map((place) => `${place.mapX},${place.mapY}`)
    .join(" ");

  // Fit the SVG viewport to the day's places so a handful of points still
  // fill the frame instead of clustering in a 100x100 corner.
  const dayPoints = visitedPlaceIds
    .map((placeId) => places.find((place) => place.placeId === placeId))
    .filter((place): place is WorkbenchPlace => Boolean(place));
  const bounds = (() => {
    if (dayPoints.length === 0) return null;
    const xs = dayPoints.map((p) => p.mapX);
    const ys = dayPoints.map((p) => p.mapY);
    let minX = Math.min(...xs);
    let maxX = Math.max(...xs);
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);
    const pad = 8;
    if (maxX - minX < 14) {
      minX -= (14 - (maxX - minX)) / 2;
      maxX += (14 - (maxX - minX)) / 2;
    }
    if (maxY - minY < 14) {
      minY -= (14 - (maxY - minY)) / 2;
      maxY += (14 - (maxY - minY)) / 2;
    }
    return {
      x: minX - pad,
      y: minY - pad,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2,
    };
  })();

  const labelFor = (name: string) =>
    name.length > 6 ? `${name.slice(0, 6)}…` : name;

  // Highest-present conflict severity drives the accent line, reusing the
  // same cinnabar/warning/info ladder as the conflict banner.
  const severityAccent = (severities: string[]): string | null => {
    if (severities.includes("BLOCKING")) return "border-l-cinnabar";
    if (severities.includes("HIGH")) return "border-l-warning/60";
    if (severities.includes("MEDIUM")) return "border-l-info/50";
    if (severities.includes("LOW")) return "border-l-border";
    return null;
  };

  const hasVerifiedRoute = dayItems.some((it) =>
    it.evidence.some((e) => e.status === "VERIFIED"),
  );

  return (
    <div>
      {days.length > 1 ? (
        <div
          role="tablist"
          aria-label="选择日期"
          className="mb-6 flex gap-2 border-b border-border"
        >
          {days.map((day) => (
            <button
              key={day}
              role="tab"
              aria-selected={day === activeDay}
              onClick={() => setActiveDay(day)}
              className={cn(
                "min-h-11 rounded-t-[2px] px-4 pt-2 text-base tracking-wide transition-colors",
                day === activeDay
                  ? "border-b-2 border-cinnabar font-medium text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              Day {day}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className="mb-4 flex gap-2 md:hidden"
        role="tablist"
        aria-label="切换视图"
      >
        {(["timeline", "map"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={mobileTab === tab}
            onClick={() => setMobileTab(tab)}
            className={cn(
              "min-h-11 flex-1 rounded-[3px] border px-3 text-base tracking-wide",
              mobileTab === tab
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border bg-surface text-muted",
            )}
          >
            {tab === "timeline" ? "时间轴" : "地图"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:gap-8">
        <ol
          aria-label="日程时间轴"
          className={cn(
            "relative flex-1 space-y-5 border-l-2 border-dashed border-cinnabar/40 pl-5 md:w-2/5 md:flex-none",
            mobileTab === "map" && "hidden md:block",
          )}
        >
          <div
            aria-hidden="true"
            className="absolute -left-[31px] top-0 flex h-7 w-7 flex-col items-center justify-center rounded-[3px] bg-cinnabar font-display text-sm font-semibold text-danger-foreground"
          >
            行
          </div>
          {dayItems.map((item) => {
            const isBlocking = item.conflictSeverities.includes("BLOCKING");
            const isSelected = selectedId === item.id;
            const accent = severityAccent(item.conflictSeverities);
            return (
              <li
                key={item.id}
                id={`plan-item-${item.id}`}
                className="relative"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -left-[27px] top-2 h-2.5 w-2.5 rounded-full border-2",
                    isBlocking
                      ? "border-cinnabar bg-cinnabar-wash"
                      : "border-cinnabar bg-surface",
                  )}
                />
                <button
                  onClick={() => selectItem(item)}
                  aria-expanded={isSelected}
                  className={cn(
                    "w-full rounded-[3px] border bg-surface p-3.5 text-left transition-colors",
                    isSelected
                      ? "border-primary/50"
                      : "border-border hover:bg-surface-muted",
                    accent && "border-l-4",
                    accent,
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium tracking-wider text-muted tabular-nums">
                      {item.startAt}–{item.endAt}
                    </span>
                    <span className="rounded-[2px] bg-surface-muted px-1.5 text-sm text-muted">
                      {TYPE_LABEL[item.type] ?? item.type}
                    </span>
                    {item.locked ? (
                      <span className="rounded-[2px] bg-primary/10 px-1.5 text-sm text-primary">
                        锁定
                      </span>
                    ) : null}
                    {isBlocking ? (
                      <span className="rounded-[2px] bg-cinnabar/10 px-1.5 text-sm text-cinnabar">
                        阻断
                      </span>
                    ) : null}
                    {item.placeId ? (
                      <span className="rounded-[2px] border border-[#d5cfc2] bg-[#f5f1e8] px-1.5 text-xs text-[#52635e]">
                        📷 景点图文
                      </span>
                    ) : null}
                  </div>
                  <p className="font-display mt-1.5 text-base font-medium tracking-wide">
                    {item.title}
                  </p>
                  {isSelected ? (
                    <div className="mt-2.5 space-y-2 border-t border-border pt-2.5">
                      {item.notes ? (
                        <p className="text-sm text-muted">{item.notes}</p>
                      ) : null}
                      {item.evidence.length > 0 ? (
                        <ul className="space-y-1">
                          {item.evidence.map((entry) => (
                            <li
                              key={entry.factKey}
                              className="flex flex-wrap items-center gap-2 text-sm"
                            >
                              <VerificationBadge status={entry.status} />
                              <span>{entry.summary}</span>
                              <span className="text-muted">
                                来源：{entry.sourceName}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted">
                          暂无与此节点直接关联的来源记录。
                        </p>
                      )}
                      {item.placeId && currentImpression ? (
                        <div className="mt-3 md:hidden">
                          <SpotImpressionCard impression={currentImpression} />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>

        <div
          className={cn(
            "flex flex-1 flex-col rounded-[3px] border border-border bg-surface p-4",
            mobileTab === "timeline" && "hidden md:block",
          )}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm tracking-wide text-muted">
              <span
                aria-hidden="true"
                className={cn(
                  "rounded-[2px] px-1.5",
                  hasVerifiedRoute
                    ? "bg-primary/10 text-primary"
                    : "bg-warning/10 text-warning-foreground",
                )}
              >
                {hasVerifiedRoute ? "✓" : "◇"}
              </span>
              {mapMode === "amap"
                ? `Day ${activeDay} 高德地图 · ${hasVerifiedRoute ? "路线已实时核验" : "路线为演示数据"}`
                : `Day ${activeDay} 拓扑图 · ${hasVerifiedRoute ? "路线已实时核验" : "路线为演示数据"}`}
            </p>
            <div className="flex items-center rounded-[3px] border border-border bg-surface-muted/60 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setFallbackNotice(null);
                  setMapMode("amap");
                }}
                className={cn(
                  "rounded-[2px] px-2 py-0.5 transition-colors tracking-wide",
                  mapMode === "amap"
                    ? "bg-surface font-medium text-primary shadow-xs"
                    : "text-muted hover:text-foreground",
                )}
              >
                高德地图
              </button>
              <button
                type="button"
                onClick={() => setMapMode("schematic")}
                className={cn(
                  "rounded-[2px] px-2 py-0.5 transition-colors tracking-wide",
                  mapMode === "schematic"
                    ? "bg-surface font-medium text-primary shadow-xs"
                    : "text-muted hover:text-foreground",
                )}
              >
                拓扑图
              </button>
            </div>
          </div>

          {fallbackNotice && mapMode === "schematic" ? (
            <p className="mb-2 text-xs text-danger/80">
              {fallbackNotice}
            </p>
          ) : null}

          {mapMode === "amap" ? (
            <div className="flex min-h-[19rem] flex-1 items-center overflow-hidden rounded-[2px] border border-cinnabar/15 bg-[#ecf0e8]">
              <AmapView
                places={dayPlaces.map((p) => ({
                  placeId: p.placeId,
                  name: p.name,
                  lat: p.lat ?? null,
                  lng: p.lng ?? null,
                }))}
                selectedPlaceId={selectedItem?.placeId ?? null}
                onSelectPlace={selectMarker}
                onFallback={(reason) => {
                  setFallbackNotice(reason);
                  setMapMode("schematic");
                }}
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 items-center rounded-[2px] border border-cinnabar/15 bg-[#ecf0e8] px-3 py-4">
              <svg
                viewBox={
                  bounds
                    ? `${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`
                    : "0 0 100 100"
                }
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label={`Day ${activeDay} 行程示意地图`}
                className="mx-auto h-full w-full max-w-[26rem]"
              >
                {routePoints ? (
                  <polyline
                    points={routePoints}
                    fill="none"
                    stroke="#34584e"
                    strokeWidth="0.8"
                    strokeDasharray="2 1.4"
                  />
                ) : null}
                {dayPlaces.map((place, index) => {
                  const isSelected = selectedItem?.placeId === place.placeId;
                  return (
                    <g
                      key={place.placeId}
                      onClick={() => selectMarker(place.placeId)}
                      className="cursor-pointer"
                      role="button"
                      aria-label={`定位到 ${place.name}`}
                    >
                      <circle
                        cx={place.mapX}
                        cy={place.mapY}
                        r={isSelected ? 4 : 3}
                        fill={isSelected ? "#a63a2f" : "#34584e"}
                        stroke="#faf6ee"
                        strokeWidth="0.8"
                      />
                      <text
                        x={place.mapX}
                        y={place.mapY - 5}
                        textAnchor="middle"
                        fontSize="3.4"
                        fill="#2b2e2a"
                      >
                        {index + 1}. {labelFor(place.name)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
          {selectedItem?.placeId ? (
            <p className="mt-2 text-sm text-muted">
              已定位：
              <strong className="text-foreground">
                {places.find((place) => place.placeId === selectedItem.placeId)?.name ?? selectedItem.title}
              </strong>
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">
              点击时间轴节点或地图标记可互相定位。
            </p>
          )}

          {currentImpression ? (
            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-[#34584e]">
                  {selectedItem ? "✦ 当前选中 · 景点图文锦囊" : "✦ 当日精选 · 景点图文锦囊"}
                </span>
                <span className="text-[11px] text-muted">
                  点击左侧节点切换
                </span>
              </div>
              <SpotImpressionCard impression={currentImpression} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
