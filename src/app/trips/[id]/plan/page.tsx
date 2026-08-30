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
          还没有候选计划。请先在约束页确认硬约束，然后生成候选计划。
        </p>
        <Link
          href={`/trips/${id}/constraints`}
          className="font-display mt-4 inline-flex min-h-11 items-center rounded-[3px] bg-primary px-5 text-base font-medium tracking-wide text-primary-foreground"
        >
          前往约束确认
        </Link>
      </section>
    );
  }

  const [items, conflicts, evidence, tasks] = await Promise.all([
    repos.planItems.listByVersion(latest.id),
    repos.conflicts.listByVersion(latest.id),
    repos.evidence.listByVersion(latest.id),
    repos.bookingTasks.listByVersion(latest.id),
  ]);

  const activeConflicts = conflicts.filter((conflict) => !conflict.resolved);
  const peakTask = tasks.find((task) => task.title.includes("缆车"));
  const selectedTicketId = peakTask?.ticketType ?? null;

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
            版本 v{latest.versionNumber} ·{" "}
            {latest.confirmedAt ? "已确认（不可修改）" : "候选（可调整）"} ·
            状态 {latest.status}
          </p>
        </div>
        {!latest.confirmedAt ? (
          <form action={confirmVersionAction}>
            <input type="hidden" name="tripId" value={id} />
            <input type="hidden" name="planVersionId" value={latest.id} />
            <button
              type="submit"
              className="font-display min-h-11 rounded-[3px] border border-primary px-4 text-base font-medium tracking-wide text-primary transition-colors hover:bg-primary/10"
            >
              确认此版本
            </button>
          </form>
        ) : null}
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
          当前版本没有未解决的冲突。
        </p>
      )}

      {fixture.tickets.length > 0 ? (
        <div className="rounded-[3px] border border-border bg-surface p-4">
          <h2 className="font-display text-lg font-medium tracking-wide">决策卡：山顶缆车票种比较</h2>
          <p className="mt-1 text-sm text-muted">
            价格为演示数据，不代表实时票价。当前计划的下山方式是「出租车」，
            请选择与之匹配的票种。
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
                      : "价格未知，不编造"}
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
                    "font-display mt-3 min-h-11 rounded-[3px] px-3 text-base font-medium tracking-wide disabled:cursor-not-allowed disabled:opacity-50",
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
                className="font-display min-h-11 rounded-[3px] bg-primary px-5 text-base font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
              >
                确认并创建新版本
              </button>
            </form>
            <Link
              href={`/trips/${id}/plan`}
              className="font-display inline-flex min-h-11 items-center rounded-[3px] border border-border bg-surface px-5 text-base tracking-wide transition-colors hover:bg-surface-muted"
            >
              取消
            </Link>
          </div>
        </div>
      ) : null}

      <div className="rounded-[3px] border border-border bg-surface p-4">
        <h2 className="font-display text-lg font-medium tracking-wide">用自然语言提出变更</h2>
        <p className="mt-1 text-sm text-muted">
          例如：“加入香港历史博物馆，如果暴雨就不要去山顶” 或
          “返程航班改成 16:15”。系统会先展示影响，确认后才创建新版本。
        </p>
        <form action={previewChangeAction} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="tripId" value={id} />
          <input
            type="text"
            name="changeText"
            required
            maxLength={500}
            className="font-display min-h-11 flex-1 rounded-[3px] border border-border bg-background px-3 text-base"
            placeholder="输入变更请求…"
          />
          <button
            type="submit"
            className="font-display min-h-11 rounded-[3px] bg-primary px-5 text-base font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
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
