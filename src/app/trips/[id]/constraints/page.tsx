import { notFound } from "next/navigation";
import { getRepositories } from "@/server/repositories";
import { getOwnedTrip } from "@/server/page-guards";
import { AiStatusNotice } from "@/components/status/ai-status-notice";
import {
  confirmAllHardConstraintsAction,
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
    HARD: {
      label: "固定底线",
      className: "bg-cinnabar/10 text-cinnabar border border-cinnabar/20",
    },
    SOFT: {
      label: "期望偏好",
      className: "bg-info-wash text-info border border-info/30",
    },
    NEGATIVE: {
      label: "规避要求",
      className: "bg-surface-muted text-muted border border-border",
    },
    UNKNOWN: {
      label: "待把关",
      className: "bg-warning/10 text-warning-foreground border border-warning/40",
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
      <h1 className="font-display text-2xl font-semibold tracking-wide">
        行前底线把关
      </h1>
      <p className="mt-2 max-w-2xl text-base text-muted">
        AI 搭子为您初步提取的关键原则。确认后系统将强制保留，避免行程现场因现实条件而受阻。
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-base text-danger"
        >
          {error}
        </p>
      ) : null}

      <AiStatusNotice ai={ai} aireason={aireason} />

      {/* AI Companion Route Intent & Overview Card */}
      <div className="mt-6 rounded-[3px] border border-[#c2cdca] bg-[#faf8f4] p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2ded6] pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded-[2px] bg-[#a63a2f] px-2 py-0.5 text-xs font-semibold tracking-wide text-white">
              搭子速报
            </span>
            <span className="font-display text-base font-bold text-[#1e2d29]">
              {trip.title} · 路线意向已成型
            </span>
          </div>
          <span className="text-xs text-[#52635e]">
            {trip.destination ? `目的地：${trip.destination}` : "已提炼行程要点"}
          </span>
        </div>

        <div className="mt-3.5 space-y-2 text-sm text-[#52635e] leading-relaxed">
          <p>
            {trip.fixtureId === "hong-kong"
              ? "🎯 初步规划：晨间福田口岸过关，乘登山缆车登太平山顶俯瞰维港；午间中环品尝正宗港点，午后漫步尖沙咀星光大道海滨水岸；傍晚由罗湖口岸平稳返深。全天步行预估严格控制在长者适宜的 3 公里以内。"
              : trip.fixtureId === "beijing"
              ? "🎯 初步规划：首日抵京休整；次日故宫紫禁城中轴探古；第三天清晨登临八达岭长城雄关，傍晚天坛祈年殿漫步；第四日国家博物馆与恭王府细品京韵；第五日专属送机。已预排 5 处热门景点的放票预约提醒。"
              : `🎯 初步规划：AI 搭子已根据您的想法梳理出目的地【${trip.destination || "本次行程"}】的顺路动线。`}
          </p>
          <div className="rounded-[2px] bg-[#f2eee6] p-2.5 text-xs text-[#52635e]">
            💡 <strong>为何需要把关？</strong>旅行现场最怕老人走不动、缆车票买错或景点闭馆。请在下方对提炼出的关键底线做快速过目，锁定后系统将强制保留，为您生成 100% 顺畅的可行方案。
          </div>
        </div>
      </div>

      {ignoredBlocks.length > 0 ? (
        <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-4">
          <p className="text-base font-medium text-warning-foreground">
            已忽略 {ignoredBlocks.length} 段导入文本中的指令内容
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

      <div className="mt-8 space-y-8">
        {[...grouped.entries()].map(([category, items]) => (
          <div key={category}>
            <h2 className="font-display mb-3 text-lg font-medium tracking-wide">
              {CATEGORY_LABEL[category] ?? category}
            </h2>
            <ul className="space-y-3">
              {items.map((constraint) => (
                <li
                  key={constraint.id}
                  className={cn(
                    "rounded-[3px] border bg-surface p-4",
                    constraint.needsConfirmation
                      ? "border-warning/60 border-l-4 border-l-warning/60"
                      : "border-border",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-[2px] px-2.5 py-0.5 text-sm font-medium tracking-wide",
                        KIND_LABEL[constraint.kind].className,
                      )}
                    >
                      {KIND_LABEL[constraint.kind].label}
                    </span>
                    {constraint.locked ? (
                      <span
                        className="rounded-[2px] bg-primary/10 px-2.5 py-0.5 text-sm text-primary font-medium"
                        title="日程调整时将强制保留此项，绝不擅自更改"
                      >
                        🔒 已锁定底线
                      </span>
                    ) : null}
                    {constraint.needsConfirmation ? (
                      <span className="rounded-[2px] bg-warning/10 px-2.5 py-0.5 text-sm text-warning-foreground">
                        待您把关
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-base font-medium">
                    {constraint.summary}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    根据您的原话：“{constraint.sourceQuote.slice(0, 120)}”
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
                          className="min-h-11 rounded-[3px] bg-primary px-4 text-base font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          确认并锁定为底线
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
                          className="min-h-11 rounded-[3px] border border-border bg-surface px-4 text-base font-medium tracking-wide transition-colors hover:bg-surface-muted"
                        >
                          {constraint.locked ? "设为允许调整" : "锁定为底线"}
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
                        className="min-h-11 rounded-[3px] px-4 text-base font-medium tracking-wide text-danger transition-colors hover:bg-danger/10"
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
          <p className="rounded-md border border-border bg-surface p-6 text-base text-muted">
            尚未提取到约束。请从「新建行程」导入文本，或选择演示场景。
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base">
            {pending > 0 ? (
              <span className="text-warning-foreground">
                还有 {pending} 项固定底线待把关 · 把关后即可生成行程方案
              </span>
            ) : (
              <span className="text-primary">所有固定底线已把关，可生成行程方案</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {pending > 0 ? (
              <form action={confirmAllHardConstraintsAction}>
                <input type="hidden" name="tripId" value={id} />
                <button
                  type="submit"
                  className="min-h-11 rounded-[3px] bg-primary px-5 text-base font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  确认全部固定底线
                </button>
              </form>
            ) : null}
            <form action={generatePlanAction}>
              <input type="hidden" name="tripId" value={id} />
              <button
                type="submit"
                disabled={pending > 0}
                className="min-h-11 rounded-[3px] bg-secondary px-6 text-base font-medium tracking-wide text-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-muted">下一步 · </span>
                确认底线，生成可行行程方案
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
