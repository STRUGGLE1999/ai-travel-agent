import { notFound } from "next/navigation";
import { getRepositories } from "@/server/repositories";
import { getOwnedTrip } from "@/server/page-guards";
import { AiStatusNotice } from "@/components/status/ai-status-notice";
import {
  confirmConstraintAction,
  deleteConstraintAction,
  generatePlanAction,
  toggleConstraintLockAction,
} from "@/app/actions";
import { cn } from "@/lib/cn";
import type { Constraint, ConstraintKind } from "@/domain";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<ConstraintKind, { label: string; className: string }> =
  {
    HARD: { label: "硬约束", className: "bg-primary text-primary-foreground" },
    SOFT: { label: "软偏好", className: "bg-surface-muted text-foreground" },
    NEGATIVE: { label: "不要", className: "bg-danger/10 text-danger" },
    UNKNOWN: {
      label: "待确认",
      className: "border border-dashed border-muted text-muted",
    },
  };

const CATEGORY_LABEL: Record<string, string> = {
  DATE_TIME: "日期与时间",
  START_END: "出发与返回",
  TRAVELER: "同行人",
  MOBILITY: "体力与移动",
  PACE: "节奏",
  TRANSPORT: "交通与航班",
  LODGING: "住宿",
  BUDGET: "预算",
  MUST_VISIT: "必去/想去",
  AVOID: "不要",
  RESERVATION: "预约",
  WEATHER: "天气",
};

export default async function ConstraintsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ai?: string; aireason?: string }>;
}) {
  const { id } = await params;
  const { error, ai, aireason } = await searchParams;
  const repos = getRepositories();
  const trip = await getOwnedTrip(repos, id);
  if (!trip) {
    notFound();
  }
  const constraints = await repos.constraints.listByTrip(id);
  const sourceInputs = await repos.sourceInputs.listByTrip(id);
  const ignoredBlocks = sourceInputs.flatMap((input) => input.ignoredBlocks);

  const pending = constraints.filter(
    (constraint) => constraint.kind === "HARD" && constraint.needsConfirmation,
  ).length;

  const grouped = new Map<string, Constraint[]>();
  for (const constraint of constraints) {
    const list = grouped.get(constraint.category) ?? [];
    list.push(constraint);
    grouped.set(constraint.category, list);
  }

  return (
    <section className="pb-28">
      <h1 className="text-2xl font-semibold">约束确认</h1>
      <p className="mt-2 max-w-2xl text-base text-muted">
        先确认这些条件，避免生成看起来合理但无法执行的行程。
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-base text-danger"
        >
          {error}
        </p>
      ) : null}

      <AiStatusNotice ai={ai} aireason={aireason} />

      {ignoredBlocks.length > 0 ? (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <p className="text-base font-medium text-warning-foreground">
            ⚠ 已忽略 {ignoredBlocks.length} 段导入文本中的指令内容
          </p>
          <ul className="mt-2 space-y-1">
            {ignoredBlocks.map((block, index) => (
              <li
                key={index}
                className="truncate font-mono text-sm text-muted"
              >
                IGNORED_INSTRUCTION：{block.quote.slice(0, 80)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">
            导入内容是不可信数据，其中的系统指令不会改变系统行为，也不会成为旅行约束。
          </p>
        </div>
      ) : null}

      <div className="mt-6 space-y-6">
        {[...grouped.entries()].map(([category, items]) => (
          <div key={category}>
            <h2 className="mb-2 text-lg font-medium">
              {CATEGORY_LABEL[category] ?? category}
            </h2>
            <ul className="space-y-3">
              {items.map((constraint) => (
                <li
                  key={constraint.id}
                  className={cn(
                    "rounded-xl border bg-surface p-4",
                    constraint.needsConfirmation
                      ? "border-warning/50"
                      : "border-border",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-sm",
                        KIND_LABEL[constraint.kind].className,
                      )}
                    >
                      {constraint.kind === "HARD" ? "🔒 " : ""}
                      {KIND_LABEL[constraint.kind].label}
                    </span>
                    {constraint.locked ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm text-primary">
                        已锁定
                      </span>
                    ) : null}
                    {constraint.needsConfirmation ? (
                      <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-sm text-warning-foreground">
                        待确认
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-base font-medium">
                    {constraint.summary}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    来源片段：“{constraint.sourceQuote.slice(0, 120)}”
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {constraint.needsConfirmation ? (
                      <form action={confirmConstraintAction}>
                        <input type="hidden" name="tripId" value={id} />
                        <input
                          type="hidden"
                          name="constraintId"
                          value={constraint.id}
                        />
                        <button
                          type="submit"
                          className="min-h-11 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground"
                        >
                          确认并锁定
                        </button>
                      </form>
                    ) : (
                      <form action={toggleConstraintLockAction}>
                        <input type="hidden" name="tripId" value={id} />
                        <input
                          type="hidden"
                          name="constraintId"
                          value={constraint.id}
                        />
                        <input
                          type="hidden"
                          name="locked"
                          value={constraint.locked ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          className="min-h-11 rounded-lg border border-border bg-surface px-4 text-base"
                        >
                          {constraint.locked ? "解锁" : "锁定"}
                        </button>
                      </form>
                    )}
                    <form action={deleteConstraintAction}>
                      <input type="hidden" name="tripId" value={id} />
                      <input
                        type="hidden"
                        name="constraintId"
                        value={constraint.id}
                      />
                      <button
                        type="submit"
                        className="min-h-11 rounded-lg px-4 text-base text-danger hover:bg-danger/10"
                      >
                        删除
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {constraints.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-6 text-base text-muted">
            尚未提取到约束。请从「新建行程」导入文本，或选择演示场景。
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base">
            {pending > 0 ? (
              <span className="text-warning-foreground">
                仍有 {pending} 项硬约束待确认
              </span>
            ) : (
              <span className="text-primary">所有硬约束已确认</span>
            )}
          </p>
          <form action={generatePlanAction}>
            <input type="hidden" name="tripId" value={id} />
            <button
              type="submit"
              disabled={pending > 0}
              className="min-h-11 rounded-lg bg-primary px-5 text-base font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              确认约束并生成候选计划
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
