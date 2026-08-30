"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { VerificationBadge } from "@/components/status/verification-badge";
import type { VerificationStatus } from "@/domain";

export interface WorkbenchPlace {
  placeId: string;
  name: string;
  mapX: number;
  mapY: number;
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
                "font-display min-h-11 rounded-t-[2px] px-4 pt-2 text-base tracking-wide transition-colors",
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
              "font-display min-h-11 flex-1 rounded-[3px] border px-3 text-base tracking-wide",
              mobileTab === tab
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border bg-surface text-muted",
            )}
          >
            {tab === "timeline" ? "时间轴" : "地图"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        <ol
          aria-label="日程时间轴"
          className={cn(
            "relative space-y-5 border-l border-border pl-5",
            mobileTab === "map" && "hidden md:block",
          )}
        >
          {dayItems.map((item) => {
            const isBlocking = item.conflictSeverities.includes("BLOCKING");
            const isSelected = selectedId === item.id;
            return (
              <li
                key={item.id}
                id={`plan-item-${item.id}`}
                className="relative"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -left-[27px] top-2 h-2.5 w-2.5 rounded-full border",
                    isBlocking
                      ? "border-cinnabar bg-cinnabar-wash"
                      : "border-primary bg-primary/20",
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
                    isBlocking && "border-l-4 border-l-cinnabar",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-medium tracking-wider text-muted">
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
                    </div>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>

        <div
          className={cn(
            "rounded-[3px] border border-border bg-surface p-3.5",
            mobileTab === "timeline" && "hidden md:block",
          )}
        >
          <p className="mb-2 flex items-center gap-2 text-sm tracking-wide text-muted">
            <span
              aria-hidden="true"
              className="font-display rounded-[2px] bg-warning/10 px-1.5 text-warning-foreground"
            >
              ◇
            </span>
            示意地图 · 路线为演示数据，不代表真实导航
          </p>
          <svg
            viewBox="0 0 100 100"
            role="img"
            aria-label={`Day ${activeDay} 行程示意地图`}
            className="aspect-square w-full rounded-[2px] bg-[#ecf0e8]"
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
                    {index + 1}. {place.name.slice(0, 8)}
                  </text>
                </g>
              );
            })}
          </svg>
          {selectedItem?.placeId ? (
            <p className="mt-2 text-sm text-muted">
              已定位：
              {places.find((place) => place.placeId === selectedItem.placeId)
                ?.name ?? selectedItem.title}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">
              点击时间轴节点或地图标记可互相定位。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
