import { notFound } from "next/navigation";
import { getRepositories } from "@/server/repositories";
import { getOwnedTrip } from "@/server/page-guards";
import { VerificationBadge } from "@/components/status/verification-badge";
import { updateBookingTaskAction } from "@/app/actions";
import { cn } from "@/lib/cn";
import type { BookingTaskStatus } from "@/domain";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<BookingTaskStatus, string> = {
  UNVERIFIED: "未核验",
  TO_BOOK: "待预订",
  BOOKED: "已预订",
  CANCELLED: "已取消",
};

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repos = getRepositories();
  const trip = await getOwnedTrip(repos, id);
  if (!trip) {
    notFound();
  }
  const versions = await repos.planVersions.listByTrip(id);
  const latest = versions[versions.length - 1] ?? null;
  const tasks = latest
    ? await repos.bookingTasks.listByVersion(latest.id)
    : [];
  const sorted = [...tasks].sort((a, b) =>
    a.usageDate.localeCompare(b.usageDate),
  );

  return (
    <section>
      <h1 className="text-2xl font-semibold">预约与预订清单</h1>
      <p className="mt-2 max-w-2xl text-base text-muted">
        任务保留使用日期、票种、人数和来源状态。本产品不执行支付，预订完成后请手动标记。
      </p>

      {sorted.length === 0 ? (
        <p className="mt-6 rounded-xl border border-border bg-surface p-6 text-base text-muted">
          生成候选计划后，这里会列出需要预约或购票的任务。
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {sorted.map((task) => (
            <li
              key={task.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-sm",
                    task.status === "BOOKED"
                      ? "bg-primary/10 text-primary"
                      : task.status === "CANCELLED"
                        ? "bg-surface-muted text-muted line-through"
                        : "bg-warning/10 text-warning-foreground",
                  )}
                >
                  {STATUS_LABEL[task.status]}
                </span>
                <VerificationBadge status="MOCK" />
              </div>
              <p className="mt-2 text-base font-medium">{task.title}</p>
              <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm text-muted sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt>使用日期</dt>
                  <dd className="font-mono">{task.usageDate}</dd>
                </div>
                {task.suggestedTimeWindow ? (
                  <div className="flex gap-2">
                    <dt>建议时段</dt>
                    <dd>{task.suggestedTimeWindow}</dd>
                  </div>
                ) : null}
                {task.ticketType ? (
                  <div className="flex gap-2">
                    <dt>票种</dt>
                    <dd>{task.ticketType}</dd>
                  </div>
                ) : null}
                {task.partySize ? (
                  <div className="flex gap-2">
                    <dt>人数</dt>
                    <dd>{task.partySize} 人</dd>
                  </div>
                ) : null}
                {task.sourceName ? (
                  <div className="flex gap-2">
                    <dt>来源</dt>
                    <dd>{task.sourceName}</dd>
                  </div>
                ) : null}
                {task.jumpParams ? (
                  <div className="flex gap-2">
                    <dt>跳转参数</dt>
                    <dd className="truncate font-mono text-xs">
                      {JSON.stringify(task.jumpParams).slice(0, 60)}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  ["TO_BOOK", "BOOKED", "CANCELLED"] as BookingTaskStatus[]
                ).map((status) =>
                  status !== task.status ? (
                    <form key={status} action={updateBookingTaskAction}>
                      <input type="hidden" name="tripId" value={id} />
                      <input type="hidden" name="taskId" value={task.id} />
                      <input
                        type="hidden"
                        name="planVersionId"
                        value={task.planVersionId}
                      />
                      <input type="hidden" name="status" value={status} />
                      <button
                        type="submit"
                        className="min-h-11 rounded-lg border border-border bg-surface px-4 text-base hover:bg-surface-muted"
                      >
                        标记为{STATUS_LABEL[status]}
                      </button>
                    </form>
                  ) : null,
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
