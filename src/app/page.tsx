import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { BrandMark } from "@/components/brand/brand-mark";
import { getRuntimeInfo } from "@/lib/env";
import { startDemoTripAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const runtime = getRuntimeInfo();

  return (
    <div className="min-h-full">
      <SiteHeader
        dataMode={runtime.dataMode}
        persistenceLabel={runtime.persistenceLabel}
        demoReason={runtime.demoReason}
      />
      <main className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,38rem)_auto] lg:items-start">
          <div>
            <p className="font-display text-sm tracking-[0.4em] text-muted">
              懂变化的 AI 旅行搭子
            </p>
            <h1 className="font-display mt-5 text-5xl font-semibold leading-[1.2] tracking-wide sm:text-6xl">
              先确认，
              <br />
              再成行。
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              把航班、口岸、同行人、体力都先安放在案，再动身。
              冲突会被指出，来源可以追查，改动的每一步，都先让你过目。
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <form action={startDemoTripAction}>
                <input type="hidden" name="fixtureId" value="hong-kong" />
                <button
                  type="submit"
                  className="font-display inline-flex min-h-11 w-full items-center justify-center rounded-[3px] bg-primary px-6 text-base font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
                >
                  体验香港老人一日游
                </button>
              </form>
              <form action={startDemoTripAction}>
                <input type="hidden" name="fixtureId" value="beijing" />
                <button
                  type="submit"
                  className="font-display inline-flex min-h-11 w-full items-center justify-center rounded-[3px] border border-border bg-surface px-6 text-base font-medium tracking-wide transition-colors hover:bg-surface-muted sm:w-auto"
                >
                  体验北京预约旅行
                </button>
              </form>
              <Link
                href="/trips/new"
                className="font-display inline-flex min-h-11 items-center justify-center rounded-[3px] px-5 text-base font-medium tracking-wide text-muted transition-colors hover:text-primary"
              >
                新建行程
              </Link>
            </div>
          </div>

          <div className="hidden lg:block lg:justify-self-end lg:py-4">
            <div className="flex items-start gap-4">
              <BrandMark className="block h-16 w-16 text-cinnabar" />
              <span
                className="font-display block text-2xl leading-loose text-primary/50"
                style={{ writingMode: "vertical-rl" }}
              >
                风来成行 · 旅行搭子
              </span>
            </div>
          </div>
        </div>

        <div className="mt-16 border-l-2 border-cinnabar/40 py-2 pl-6">
          <p className="font-display text-lg leading-relaxed text-muted">
            路要一步步走，事要一件件定。
            <br />
            这里没有语焉不详的攻略，只有每一个决定。
          </p>
          <ul className="mt-7 grid gap-6 sm:grid-cols-2">
            {[
              ["先锁定约束", "先确认硬条件，再生成候选计划。"],
              ["指出冲突", "票种、缓冲和动线问题会明确阻断。"],
              ["来源可追查", "演示数据标 MOCK，未知就标未知。"],
              ["改动可解释", "先看 Diff，确认后才生成新版本。"],
            ].map(([title, body]) => (
              <li key={title} className="leading-relaxed">
                <span className="font-display text-base font-semibold text-foreground">
                  <span
                    aria-hidden="true"
                    className="mr-2 inline-block h-2 w-2 rounded-[1px] bg-cinnabar/70"
                  />
                  {title}
                </span>
                <p className="mt-1 text-base text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
