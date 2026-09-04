import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepositories } from "@/server/repositories";
import { getOwnedTrip } from "@/server/page-guards";
import { AiStatusNotice } from "@/components/status/ai-status-notice";
import { getFixture } from "@/fixtures";
import { readItemMeta, humanNotes } from "@/domain/planner/candidate";
import { ConflictBanner } from "@/components/status/conflict-banner";
import { VerificationBadge } from "@/components/status/verification-badge";
import {
  PlanWorkbench,
  type WorkbenchItem,
} from "@/components/itinerary/plan-workbench";
import {
  applyChangeAction,
  confirmVersionAction,
  previewChangeAction,
  selectTicketAction,
} from "@/app/actions";
import { cn } from "@/lib/cn";
import { calculateTripBudget } from "@/domain/budget/calculator";
import { BudgetCard } from "@/components/budget/budget-card";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    preview?: string;
    ai?: string;
    aireason?: string;
  }>;
}) {
  const { id } = await params;
  const { error, preview, ai, aireason } = await searchParams;
  const repos = getRepositories();
  const trip = await getOwnedTrip(repos, id);
  if (!trip) {
    notFound();
  }
  const fixture = getFixture(trip.fixtureId);
  const versions = await repos.planVersions.listByTrip(id);
  const latest = versions[versions.length - 1] ?? null;

  if (!latest || !fixture) {
    return (
      <section>
        <h1 className="font-display text-2xl font-semibold tracking-wide">行程工作台</h1>
        <p className="mt-3 max-w-2xl text-base text-muted">
          暂未生成行程方案。请先完成行前底线把关，AI 搭子将为您规划最顺畅的可行路线。
        </p>
        <Link
          href={`/trips/${id}/constraints`}
          className="mt-4 inline-flex min-h-11 items-center rounded-[3px] bg-primary px-5 text-base font-medium tracking-wide text-primary-foreground"
        >
          前往行前底线把关
        </Link>
      </section>
    );
  }

  const [items, conflicts, evidence, tasks, constraints] = await Promise.all([
    repos.planItems.listByVersion(latest.id),
    repos.conflicts.listByVersion(latest.id),
    repos.evidence.listByVersion(latest.id),
    repos.bookingTasks.listByVersion(latest.id),
    repos.constraints.listByTrip(id),
  ]);

  const activeConflicts = conflicts.filter((conflict) => !conflict.resolved);
  const peakTask = tasks.find((task) => task.title.includes("缆车"));
  const selectedTicketId = peakTask?.ticketType ?? null;

  const budget = calculateTripBudget({
    items,
    fixture,
    selectedTicketId,
    constraints,
  });

  const workbenchItems: WorkbenchItem[] = items.map((item) => {
    const meta = readItemMeta(item);
    const relatedEvidence = evidence
      .filter(
        (entry) =>
          (item.placeId && entry.factKey.includes(item.placeId)) ||
          (item.type === "TRANSIT" && entry.factKey.startsWith("route:")),
      )
      .slice(0, 3)
      .map((entry) => ({
        factKey: entry.factKey,
        summary: summarizeFact(entry.factKey, entry.value),
        status: entry.status,
        sourceName: entry.sourceName,
      }));
    return {
      id: item.id,
      day: item.day,
      startAt: item.startAt,
      endAt: item.endAt,
      type: item.type,
      title: item.title,
      placeId: item.placeId,
      transportMode: item.transportMode,
      locked: meta.locked,
      notes: humanNotes(item),
      evidence: relatedEvidence,
      conflictSeverities: activeConflicts
        .filter((conflict) => conflict.affectedItemIds.includes(item.id))
        .map((conflict) => conflict.severity),
    };
  });

  const places = fixture.places.map((place) => ({
    placeId: place.placeId,
    name: place.name,
    mapX: place.mapX,
    mapY: place.mapY,
    lat: place.lat ?? null,
    lng: place.lng ?? null,
  }));

  const previewRecord = preview
    ? await repos.changeImpacts.getByRequestId(preview)
    : null;
  const previewRequest = preview
    ? await repos.changeRequests.getById(preview)
    : null;

  const itemTitle = (itemId: string): string =>
    items.find((item) => item.id === itemId)?.title ?? itemId;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-wide">行程工作台</h1>
          <p className="mt-1 text-base text-muted">
            方案 v{latest.versionNumber} ·{" "}
            {latest.confirmedAt ? "已定稿" : "规划中"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/trips/${id}/handout`}
            className="inline-flex min-h-11 items-center rounded-[3px] border border-border bg-surface px-4 text-base font-medium tracking-wide text-foreground transition-colors hover:bg-surface-muted"
          >
            📜 导出手账
          </Link>
          {!latest.confirmedAt ? (
            <form action={confirmVersionAction}>
              <input type="hidden" name="tripId" value={id} />
              <input type="hidden" name="planVersionId" value={latest.id} />
              <button
                type="submit"
                className="min-h-11 rounded-[3px] border border-primary px-4 text-base font-medium tracking-wide text-primary transition-colors hover:bg-primary/10"
              >
                确认此版本
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-base text-danger"
        >
          {error}
        </p>
      ) : null}

      <AiStatusNotice ai={ai} aireason={aireason} />

      {/* Guarded Bottom-lines Bar */}
      {constraints.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[3px] border border-[#c2cdca] bg-[#faf8f4] px-3.5 py-2.5 text-xs text-[#52635e]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-[#1e2d29]">
              🔒 已锁定守护底线：
            </span>
            {constraints
              .filter((c) => c.locked)
              .slice(0, 4)
              .map((c) => (
                <span
                  key={c.id}
                  className="rounded-[2px] border border-[#d5cfc2] bg-white px-2 py-0.5 text-[#34584e]"
                >
                  {c.summary}
                </span>
              ))}
            {constraints.filter((c) => c.locked).length > 4 ? (
              <span className="text-muted">
                等共 {constraints.filter((c) => c.locked).length} 项
              </span>
            ) : null}
          </div>
          <Link
            href={`/trips/${id}/constraints`}
            className="font-medium text-[#34584e] transition-colors hover:text-[#1e2d29] hover:underline"
          >
            查看/调整底线 →
          </Link>
        </div>
      ) : null}

      {activeConflicts.length > 0 ? (
        <div className="space-y-3">
          {activeConflicts.map((conflict) => (
            <ConflictBanner
              key={conflict.id}
              severity={conflict.severity}
              title={conflict.title}
              description={conflict.description}
              action={conflict.suggestedActions[0]}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-base text-primary">
          ✓ 当前动线顺畅，暂无待协调冲突。
        </p>
      )}

      {fixture.tickets.length > 0 ? (
        <div className="rounded-[3px] border border-border bg-surface p-4">
          <h2 className="font-display text-lg font-medium tracking-wide">💡 动线决策：山顶缆车票种选择</h2>
          <p className="mt-1 text-sm text-muted">
            票价基于基准参考标准。当前规划的下山方式是「出租车」，
            请选择与之匹配的票种以避免浪费。
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {fixture.tickets.map((ticket) => (
              <form
                key={ticket.id}
                action={selectTicketAction}
                className={cn(
                  "flex flex-col rounded-[3px] border p-3",
                  selectedTicketId === ticket.id
                    ? "border-primary bg-primary/5"
                    : "border-border",
                )}
              >
                <input type="hidden" name="tripId" value={id} />
                <input type="hidden" name="planVersionId" value={latest.id} />
                <input type="hidden" name="ticketId" value={ticket.id} />
                <p className="font-display text-base font-medium tracking-wide">{ticket.name}</p>
                <p className="mt-1 flex items-center gap-2 text-base">
                  <VerificationBadge status="MOCK" />
                  <span>
                    {ticket.price !== null
                      ? `${ticket.price} ${ticket.currency}/人`
                      : "价格待现场确认"}
                  </span>
                </p>
                <ul className="mt-2 flex-1 space-y-1 text-sm text-muted">
                  {ticket.includes.map((include) => (
                    <li key={include}>· {include}</li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-muted">{ticket.notes}</p>
                <button
                  type="submit"
                  disabled={Boolean(latest.confirmedAt)}
                  className={cn(
                    "mt-3 min-h-11 rounded-[3px] px-3 text-base font-medium tracking-wide disabled:cursor-not-allowed disabled:opacity-50",
                    selectedTicketId === ticket.id
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-surface",
                  )}
                >
                  {selectedTicketId === ticket.id ? "当前选择" : "选择此票种"}
                </button>
              </form>
            ))}
          </div>
        </div>
      ) : null}

      <BudgetCard budget={budget} />

      {previewRecord && previewRequest ? (
        <div className="rounded-[3px] border border-info/40 bg-info-wash p-4">
          <h2 className="font-display text-lg font-medium tracking-wide text-info">变更影响预览</h2>
          <p className="mt-1 text-base">
            变更请求：“{previewRequest.rawText}”
          </p>
          <p className="mt-1 text-sm text-muted">
            以下内容将发生变化；未列出的锁定决定会保留。
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              {previewRecord.impact.additions.length > 0 ? (
                <div>
                  <h3 className="text-base font-medium text-primary">
                    新增 {previewRecord.impact.additions.length} 项
                  </h3>
                  <ul className="mt-1 space-y-1 text-base">
                    {previewRecord.impact.additions.map((item) => (
                      <li key={item.id}>
                        Day {item.day} {item.startAt}-{item.endAt} {item.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {previewRecord.impact.removals.length > 0 ? (
                <div>
                  <h3 className="text-base font-medium text-danger">
                    删除 {previewRecord.impact.removals.length} 项
                  </h3>
                  <ul className="mt-1 space-y-1 text-base">
                    {previewRecord.impact.removals.map((itemId) => (
                      <li key={itemId}>{itemTitle(itemId)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {previewRecord.impact.updates.length > 0 ? (
                <div>
                  <h3 className="text-base font-medium text-info">
                    修改 {previewRecord.impact.updates.length} 项
                  </h3>
                  <ul className="mt-1 space-y-1 text-base">
                    {previewRecord.impact.updates.map((update) => (
                      <li key={update.itemId}>
                        {itemTitle(update.itemId)} →{" "}
                        {Object.entries(update.fields)
                          .filter(([key]) =>
                            ["startAt", "endAt", "title"].includes(key),
                          )
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join("，") || "内容更新"}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {previewRecord.impact.moves.length > 0 ? (
                <div>
                  <h3 className="text-base font-medium">
                    顺延 {previewRecord.impact.moves.length} 项
                  </h3>
                  <ul className="mt-1 space-y-1 text-base">
                    {previewRecord.impact.moves.map((move) => (
                      <li key={move.itemId}>
                        {itemTitle(move.itemId)}：{move.from} → {move.to}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <div>
                <h3 className="text-base font-medium">保留的锁定决定</h3>
                <ul className="mt-1 space-y-1 text-base text-muted">
                  {previewRecord.impact.preservedLockedItemIds.map((itemId) => (
                    <li key={itemId}>{itemTitle(itemId)}</li>
                  ))}
                </ul>
              </div>
              {previewRecord.impact.newConflicts.length > 0 ? (
                <div>
                  <h3 className="text-base font-medium text-danger">
                   新出现的冲突
                  </h3>
                  <ul className="mt-1 space-y-1 text-base">
                    {previewRecord.impact.newConflicts.map((conflict) => (
                      <li key={conflict.id}>
                        [{conflict.severity}] {conflict.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {previewRecord.impact.resolvedConflictIds.length > 0 ? (
                <p className="text-base text-primary">
                  将解决 {previewRecord.impact.resolvedConflictIds.length}{" "}
                  个现有冲突
                </p>
              ) : null}
              {previewRecord.impact.bookingTaskImpacts.length > 0 ? (
                <div>
                  <h3 className="text-base font-medium">预约影响</h3>
                  <ul className="mt-1 space-y-1 text-base text-muted">
                    {previewRecord.impact.bookingTaskImpacts.map((impact) => (
                      <li key={impact}>· {impact}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={applyChangeAction}>
              <input type="hidden" name="tripId" value={id} />
              <input
                type="hidden"
                name="changeRequestId"
                value={previewRequest.id}
              />
              <button
                type="submit"
                className="min-h-11 rounded-[3px] bg-primary px-5 text-base font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
              >
                确认并创建新版本
              </button>
            </form>
            <Link
              href={`/trips/${id}/plan`}
              className="inline-flex min-h-11 items-center rounded-[3px] border border-border bg-surface px-5 text-base tracking-wide transition-colors hover:bg-surface-muted"
            >
              取消
            </Link>
          </div>
        </div>
      ) : null}

      <div className="rounded-[3px] border border-border bg-surface p-4">
        <h2 className="font-display text-lg font-medium tracking-wide">随时告诉搭子您的新想法</h2>
        <p className="mt-1 text-sm text-muted">
          输入想临时调整的内容或突发情况（例如：“加入香港历史博物馆，如果暴雨就不要去山顶” 或
          “返程航班改成 16:15”）。系统将保持其余行程稳定，为您预览调整方案。
        </p>
        <form action={previewChangeAction} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="tripId" value={id} />
          <input
            type="text"
            name="changeText"
            required
            maxLength={500}
            className="min-h-11 flex-1 rounded-[3px] border border-border bg-background px-3 text-base"
            placeholder="输入变更请求… 例如：下暴雨改去室内博物馆、下山改乘缆车"
          />
          <button
            type="submit"
            className="min-h-11 rounded-[3px] bg-primary px-5 text-base font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
          >
            预览影响
          </button>
        </form>
      </div>

      <PlanWorkbench items={workbenchItems} places={places} />
    </section>
  );
}

function summarizeFact(factKey: string, value: unknown): string {
  if (factKey.startsWith("openingHours:")) {
    const hours = value as { open?: string; close?: string };
    return `营业时间 ${hours.open ?? "?"}-${hours.close ?? "?"}`;
  }
  if (factKey.startsWith("route:")) {
    const route = value as { durationMinutes?: number; walkMeters?: number };
    return `路线约 ${route.durationMinutes ?? "?"} 分钟，步行约 ${route.walkMeters ?? "?"} 米`;
  }
  if (factKey.startsWith("ticket:")) {
    const ticket = value as { name?: string; price?: number; currency?: string };
    return `${ticket.name ?? "票种"} ${ticket.price ?? "?"} ${ticket.currency ?? ""}`;
  }
  if (factKey.startsWith("mobility:")) {
    const mobility = value as { totalWalk?: number; totalTransfers?: number };
    return `全程步行约 ${mobility.totalWalk ?? "?"} 米，换乘 ${mobility.totalTransfers ?? "?"} 次`;
  }
  return factKey;
}
