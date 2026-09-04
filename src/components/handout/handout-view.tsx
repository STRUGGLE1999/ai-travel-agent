import type { BookingTask, Constraint, PlanItem, PlanVersion, Trip } from "@/domain";
import type { BudgetSummary } from "@/domain/budget/types";
import type { FixturePlace, TripFixture } from "@/fixtures/types";
import { BrandMark } from "@/components/brand/brand-mark";
import { toMinutes } from "@/domain/planner/time";
import { humanNotes } from "@/domain/planner/candidate";
import { getOrInferImpression } from "@/domain/destinations/catalog";

interface HandoutViewProps {
  trip: Trip;
  planVersion: PlanVersion;
  items: PlanItem[];
  constraints: Constraint[];
  bookingTasks: BookingTask[];
  budget: BudgetSummary;
  places: FixturePlace[];
  fixture: TripFixture;
}

export function HandoutView({
  trip,
  planVersion,
  items,
  constraints,
  bookingTasks,
  budget,
  places,
  fixture,
}: HandoutViewProps) {
  // Group items by day
  const itemsByDay = new Map<number, PlanItem[]>();
  for (const item of items) {
    const list = itemsByDay.get(item.day) ?? [];
    list.push(item);
    itemsByDay.set(item.day, list);
  }
  for (const [, list] of itemsByDay) {
    list.sort((a, b) => toMinutes(a.startAt) - toMinutes(b.startAt));
  }
  const days = Array.from(itemsByDay.keys()).sort((a, b) => a - b);

  // Key locked constraints
  const lockedConstraints = constraints.filter((c) => c.locked);

  // Calculate SVG topology coordinates for visited places in order of travel
  const placeMap = new Map(places.map((p) => [p.placeId, p]));
  const visitedPlaces: FixturePlace[] = [];
  const visitedPlaceIds = new Set<string>();
  for (const item of items) {
    if (item.placeId && !visitedPlaceIds.has(item.placeId)) {
      const p = placeMap.get(item.placeId);
      if (p) {
        visitedPlaceIds.add(item.placeId);
        visitedPlaces.push(p);
      }
    }
  }

  const topologyPlaces = (visitedPlaces.length > 0 ? visitedPlaces : places).slice(0, 8);

  return (
    <div className="mx-auto max-w-4xl py-6 px-4 sm:px-6 print:m-0 print:p-0 print:max-w-none print:w-full">
      <div
        id="trip-handout-content"
        className="space-y-6 print:space-y-0 text-[#22302c]"
        style={{
          fontFamily:
            "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', system-ui, -apple-system, sans-serif",
          letterSpacing: "normal",
        }}
      >
        {/* ============================================================ */}
        {/* PAGE 1: 封面首页 (Cover Page) */}
        {/* ============================================================ */}
        <section
          className="print-page-break flex flex-col justify-between rounded-[4px] border border-[#e2ded6] bg-[#faf8f4] p-6 sm:p-10 text-[#22302c] print:rounded-none print:border-none print:shadow-none print:p-0 print:bg-transparent"
          style={{
            breakAfter: "page",
            pageBreakAfter: "always",
          }}
        >
          <div>
            {/* 1. Cover Header & Seal */}
            <header className="border-b-2 border-[#c2cdca] pb-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded-[2px] bg-[#a63a2f] px-3 py-1 text-xs font-semibold text-white leading-normal">
                      出行手账 · 封面
                    </span>
                    <span className="text-xs text-[#63726d] leading-normal">
                      版本 <span className="tabular-nums font-medium">v{planVersion.versionNumber}</span> · {planVersion.confirmedAt ? "已确认锁定" : "候选方案"}
                    </span>
                  </div>
                  <h1 className="mt-2.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1e2d29] leading-tight">
                    {trip.title}
                  </h1>
                  <p className="mt-1.5 text-sm text-[#52635e] leading-relaxed">
                    风来成行 ｜ 懂变化的 AI 旅行搭子 · 确定性出行备忘手账
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right leading-tight">
                    <p className="text-xs text-[#70807b]">落款认证</p>
                    <p className="text-xs font-medium text-[#34584e] mt-0.5">确定性规划</p>
                  </div>
                  <BrandMark className="h-12 w-12" />
                </div>
              </div>

              {/* 2. Trip Meta Grid (行前档案) */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-[3px] border border-[#e8e4dc] bg-[#f4f0e8] p-3.5 text-xs leading-relaxed">
                <div>
                  <span className="text-[#70807b]">目的地：</span>
                  <span className="font-semibold text-[#22302c]">{fixture.destination}</span>
                </div>
                <div>
                  <span className="text-[#70807b]">同行人：</span>
                  <span className="font-semibold text-[#22302c]"><span className="tabular-nums">{budget.partySize}</span> 人同行</span>
                </div>
                <div>
                  <span className="text-[#70807b]">行程天数：</span>
                  <span className="font-semibold text-[#22302c]"><span className="tabular-nums">{fixture.days}</span> 天</span>
                </div>
                <div>
                  <span className="text-[#70807b]">预估费用：</span>
                  <span className="font-semibold text-[#34584e]">
                    约 <span className="tabular-nums">{budget.totalAmount.toLocaleString()}</span> {budget.currency}
                  </span>
                </div>
              </div>

              {/* 3. Locked Constraints Pills */}
              {lockedConstraints.length > 0 ? (
                <div className="mt-4 rounded-[3px] border border-[#d6dedb] bg-[#f4f7f6] p-3.5 text-xs">
                  <p className="font-semibold text-[#29423b] mb-2 flex items-center gap-1.5 leading-normal">
                    <span>★</span> 核心锁定原则与出行约定：
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {lockedConstraints.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center rounded-[2px] border border-[#ccd6d3] bg-white px-3 py-1 text-xs text-[#29423b] leading-normal max-w-full"
                      >
                        <span className="mr-1.5 font-bold text-[#34584e] shrink-0">✓</span>
                        <span className="break-words">{c.summary}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </header>

            {/* 4. Journey Topology Map on Cover Page */}
            {topologyPlaces.length > 0 ? (
              <section className="mt-6 rounded-[3px] border border-[#e2ded6] bg-[#f5f2eb] p-4">
                <div className="flex items-center justify-between border-b border-[#e2ded6] pb-2 mb-3">
                  <h2 className="text-sm font-bold text-[#1e2d29] flex items-center gap-1.5 leading-normal">
                    <span className="inline-block h-3.5 w-1 bg-[#34584e] rounded-full" />
                    行程全景动线拓扑
                  </h2>
                  <span className="text-[11px] text-[#70807b] leading-normal">
                    纯矢量拓扑 · 离线全景一览
                  </span>
                </div>

                <div className="flex items-center justify-center">
                  <svg
                    viewBox="0 0 100 70"
                    className="w-full max-h-52 select-none"
                    aria-label="行程动线示意图"
                    style={{
                      fontFamily:
                        "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
                    }}
                  >
                    {/* Connecting lines */}
                    {topologyPlaces.map((place, idx, arr) => {
                      if (idx === 0) return null;
                      const prev = arr[idx - 1];
                      return (
                        <line
                          key={`line-${idx}`}
                          x1={prev.mapX}
                          y1={(prev.mapY * 0.7).toFixed(1)}
                          x2={place.mapX}
                          y2={(place.mapY * 0.7).toFixed(1)}
                          stroke="#34584e"
                          strokeWidth="1.2"
                          strokeDasharray="2,2"
                          strokeOpacity="0.65"
                        />
                      );
                    })}

                    {/* Node Points */}
                    {topologyPlaces.map((place, idx) => {
                      const cx = place.mapX;
                      const cy = Number((place.mapY * 0.7).toFixed(1));
                      const isTop = idx % 2 === 1;
                      return (
                        <g key={place.placeId}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r="3.5"
                            fill="#a63a2f"
                            stroke="#ffffff"
                            strokeWidth="1"
                          />
                          <text
                            x={cx}
                            y={cy}
                            dominantBaseline="central"
                            textAnchor="middle"
                            fontSize="2.6"
                            fill="#ffffff"
                            fontWeight="bold"
                          >
                            {idx + 1}
                          </text>
                          <text
                            x={cx}
                            y={isTop ? cy - 5.5 : cy + 7.5}
                            dominantBaseline="middle"
                            textAnchor="middle"
                            fontSize="2.8"
                            fill="#22302c"
                            fontWeight="500"
                          >
                            {place.name.length > 7 ? `${place.name.slice(0, 6)}…` : place.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </section>
            ) : null}
          </div>

          {/* 5. Cover Bottom / 卷首结语 */}
          <footer className="mt-8 border-t border-[#e2ded6] pt-4 text-center text-xs text-[#70807b]">
            <p className="font-medium text-[#52635e]">
              — 风来成行 确定性规划手账 · 卷首 —
            </p>
            <p className="mt-1 text-[11px] text-[#8e9c97]">
              离线出行专用备忘 · 详细每日动线行历、预约锦囊与费用看板见正文内页 →
            </p>
          </footer>
        </section>

        {/* ============================================================ */}
        {/* 屏幕预览分页分隔提示 (Screen-only Visual Page Divider) */}
        {/* ============================================================ */}
        <div
          className="no-print my-6 flex items-center justify-center gap-3 text-xs text-[#70807b]"
          data-html2canvas-ignore="true"
        >
          <div className="h-px flex-1 border-t border-dashed border-[#d8d2c5]" />
          <span className="rounded bg-[#ece7dc] px-3 py-1 font-medium text-[#52635e]">
            ✂️ 第 1 页（手账封面）完 ｜ 存为 PDF 或打印时自动分页 ｜ 第 2 页（正文动线与锦囊）始 ⬇️
          </span>
          <div className="h-px flex-1 border-t border-dashed border-[#d8d2c5]" />
        </div>

        {/* ============================================================ */}
        {/* PAGE 2+: 正文内页 (Content Pages) */}
        {/* ============================================================ */}
        <section className="handout-content-page rounded-[4px] border border-[#e2ded6] bg-[#faf8f4] p-6 sm:p-10 text-[#22302c] print:rounded-none print:border-none print:shadow-none print:p-0 print:bg-transparent print:mt-0">
          {/* Inner Page Header (visible in print for continuity) */}
          <div className="hidden print:flex items-center justify-between border-b border-[#c2cdca] pb-2 mb-6 text-xs text-[#70807b]">
            <span className="font-semibold text-[#34584e]">
              风来成行 · {trip.title}
            </span>
            <span>正文内页 · 每日动线行历与出行锦囊</span>
          </div>

          {/* Section 1: Daily Itinerary Schedule */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#e2ded6] pb-2">
              <h2 className="text-lg font-bold text-[#1e2d29] flex items-center gap-2">
                <span className="inline-block h-4 w-1 bg-[#34584e] rounded-full" />
                折页每日动线行历
              </h2>
              <span className="text-xs text-[#70807b]">按时间动线排序 · 包含交通缓冲</span>
            </div>

            {days.map((dayNum) => {
              const dayItems = itemsByDay.get(dayNum) ?? [];
              return (
                <div
                  key={dayNum}
                  className="rounded-[3px] border border-[#e5e0d7] bg-white p-4 sm:p-5 break-inside-avoid"
                >
                  <div className="flex items-center justify-between border-b border-[#ece8df] pb-2 mb-3">
                    <h3 className="text-base font-bold text-[#34584e]">
                      第 {dayNum} 天 · 行程规划
                    </h3>
                    <span className="text-xs text-[#70807b]">
                      共 {dayItems.length} 个行程节点
                    </span>
                  </div>

                  <div className="relative pl-4 sm:pl-6 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#d8d2c5]">
                    {dayItems.map((item) => {
                      const isMeal = item.type === "MEAL";
                      const isTransit = item.type === "TRANSIT";
                      const place = item.placeId ? placeMap.get(item.placeId) : null;

                      return (
                        <div key={item.id} className="relative pb-4 last:pb-1">
                          {/* Node circle */}
                          <div
                            className={`absolute -left-[1.3rem] top-1.5 h-3 w-3 rounded-full border-2 border-white ${
                              isTransit
                                ? "bg-[#70807b]"
                                : isMeal
                                ? "bg-[#d97706]"
                                : "bg-[#a63a2f]"
                            }`}
                          />

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-[#34584e] leading-normal tabular-nums">
                                {item.startAt} – {item.endAt}
                              </span>
                              <span
                                className={`inline-flex items-center justify-center rounded px-2.5 py-1 text-xs font-medium leading-normal ${
                                  isTransit
                                    ? "bg-[#f3f4f6] text-[#374151]"
                                    : isMeal
                                    ? "bg-[#fef3c7] text-[#92400e]"
                                    : "bg-[#e6eeeb] text-[#34584e]"
                                }`}
                              >
                                {isTransit ? "交通" : isMeal ? "就餐" : "游览"}
                              </span>
                              <span className="text-sm font-bold text-[#22302c] leading-normal">
                                {item.title}
                              </span>
                            </div>
                            {place?.indoor ? (
                              <span className="inline-flex items-center justify-center text-xs font-medium text-[#047857] bg-[#ecfdf5] px-2.5 py-1 rounded leading-normal">
                                室内
                              </span>
                            ) : null}
                          </div>

                          {(() => {
                            const note = humanNotes(item);
                            if (!note) return null;
                            return (
                              <p className="mt-1 text-xs text-[#52635e] pl-1 leading-relaxed">
                                ℹ️ {note}
                              </p>
                            );
                          })()}

                          {(() => {
                            if (!item.placeId || !place) return null;
                            const imp = getOrInferImpression(item.placeId, place.name, item.type);
                            if (!imp.seniorTips) return null;
                            return (
                              <div className="mt-1.5 rounded-[2px] border-l-2 border-[#a63a2f] bg-[#faf8f4] px-2.5 py-1 text-[11px] leading-relaxed text-[#52635e]">
                                <span className="font-semibold text-[#1e2d29]">锦囊 · </span>
                                {imp.seniorTips}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section 2: Reservation & Booking Tasks */}
          {bookingTasks.length > 0 ? (
            <div className="mt-8 break-inside-avoid">
              <div className="flex items-center justify-between border-b border-[#e2ded6] pb-2 mb-3">
                <h2 className="text-lg font-bold text-[#1e2d29] flex items-center gap-2">
                  <span className="inline-block h-4 w-1 bg-[#34584e] rounded-full" />
                  行前预约与凭证锦囊
                </h2>
                <span className="text-xs text-[#70807b]">
                  共 {bookingTasks.length} 项预约待办 · 建议提前确认放票规则
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {bookingTasks.map((task) => {
                  const template = fixture.bookingTasks.find(
                    (t) => (task.placeId && t.placeId === task.placeId) || t.title === task.title,
                  );
                  return (
                    <div
                      key={task.id}
                      className="rounded-[3px] border border-[#e5e0d7] bg-white p-3.5 text-xs leading-relaxed"
                    >
                      <div className="flex items-center justify-between font-bold text-[#22302c] leading-normal mb-1">
                        <span>{task.title}</span>
                        <span className="inline-flex items-center justify-center text-xs font-medium text-[#34584e] bg-[#e6eeeb] px-2.5 py-1 rounded leading-normal">
                          {template?.usageDay ? `第 ${template.usageDay} 天` : task.usageDate}
                        </span>
                      </div>
                      {task.suggestedTimeWindow ? (
                        <p className="mt-1 text-[#52635e] leading-normal">
                          ⏰ 建议时段：{task.suggestedTimeWindow}
                        </p>
                      ) : null}
                      {task.ticketType ? (
                        <p className="text-[#52635e] leading-normal">
                          🎫 票种类型：{task.ticketType}（{task.partySize ?? budget.partySize} 人）
                        </p>
                      ) : null}
                      {template?.reservationRule ? (
                        <p className="mt-1 text-[#a63a2f] leading-normal">
                          📌 放票规则：{template.reservationRule}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Section 3: Budget and Cost Summary */}
          <div className="mt-8 break-inside-avoid">
            <div className="flex items-center justify-between border-b border-[#e2ded6] pb-2 mb-3">
              <h2 className="text-lg font-bold text-[#1e2d29] flex items-center gap-2">
                <span className="inline-block h-4 w-1 bg-[#34584e] rounded-full" />
                行前账本与预算看板
              </h2>
              <span className="text-xs text-[#70807b]">
                已确定与预估费用汇总 · 实报实销参考
              </span>
            </div>

            <div className="rounded-[3px] border border-[#e2ded6] bg-white overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f2eee6] text-[#52635e] border-b border-[#e2ded6]">
                    <th className="py-2.5 px-3 font-semibold">项目类别</th>
                    <th className="py-2.5 px-3 font-semibold">明细项目</th>
                    <th className="py-2.5 px-3 font-semibold">性质</th>
                    <th className="py-2.5 px-3 font-semibold text-right">金额 ({budget.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece8df]">
                  {budget.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3 text-[#70807b] align-middle">{item.category}</td>
                      <td className="py-2.5 px-3 font-medium text-[#22302c] align-middle">
                        <span className="leading-normal">{item.name}</span>
                        {item.notes ? (
                          <span className="block text-[11px] text-[#70807b] leading-normal mt-0.5">{item.notes}</span>
                        ) : null}
                      </td>
                      <td className="py-2.5 px-3 align-middle">
                        {item.isConfirmed ? (
                          <span className="inline-flex items-center justify-center text-xs font-medium text-[#047857] bg-[#ecfdf5] px-2.5 py-1 rounded leading-normal">
                            已确定
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center text-xs font-medium text-[#b45309] bg-[#fef3c7] px-2.5 py-1 rounded leading-normal">
                            预估
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-[#22302c] align-middle leading-normal tabular-nums">
                        {item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#f7f4ed] font-bold text-[#1e2d29] border-t-2 border-[#c2cdca]">
                    <td colSpan={3} className="py-2.5 px-3 text-right">
                      总计支出预估：
                    </td>
                    <td className="py-2.5 px-3 text-right text-sm text-[#34584e] tabular-nums">
                      {budget.totalAmount.toLocaleString()} {budget.currency}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Final Footer */}
          <footer className="mt-10 border-t border-[#e2ded6] pt-4 text-center text-xs text-[#70807b]">
            <p>风来成行 ｜ 懂变化的 AI 旅行搭子 · 出行前请核验当地实时营业与天气</p>
            <p className="mt-0.5 text-[10px] text-[#8e9c97]">
              本手账由确定性规划引擎生成 · 打印时支持标准 A4 纸张
            </p>
          </footer>
        </section>
      </div>
    </div>
  );
}
