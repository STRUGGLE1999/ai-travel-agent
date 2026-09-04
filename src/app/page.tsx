import Image from "next/image";
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
            <h1 className="mt-5">
              <span className="sr-only">先确认 再成行</span>
              <span aria-hidden="true" className="block max-w-[19rem] sm:max-w-[24rem]">
                <Image
                  src="/images/brand/hero-title.webp"
                  alt="先确认 再成行"
                  width={1250}
                  height={710}
                  priority
                  className="h-auto w-full select-none object-contain"
                />
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              把航班、口岸、同行人、体力都先安放在案，再动身。
              动线暗坑提前排查，真实数据绝不虚构，临时生变也稳妥从容。
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <form action={startDemoTripAction}>
                <input type="hidden" name="fixtureId" value="hong-kong" />
                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-[3px] bg-primary px-6 text-base font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
                >
                  体验香港老人一日游
                </button>
              </form>
              <form action={startDemoTripAction}>
                <input type="hidden" name="fixtureId" value="beijing" />
                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-[3px] border border-border bg-surface px-6 text-base font-medium tracking-wide transition-colors hover:bg-surface-muted sm:w-auto"
                >
                  体验北京预约旅行
                </button>
              </form>
              <Link
                href="/trips/new"
                className="inline-flex min-h-11 items-center justify-center rounded-[3px] px-5 text-base font-medium tracking-wide text-muted transition-colors hover:text-primary"
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
            这里没有语焉不详的攻略，只有每一个踏实的决定。
          </p>
          <ul className="mt-7 grid gap-6 sm:grid-cols-2">
            {[
              [
                "先知底线，再定行程",
                "出行人体力、必打卡与不可妥协的偏好，先帮您守牢，避免现场抓瞎。",
              ],
              [
                "提前排查动线暗坑",
                "缆车票与下山动线冲突、开门时间不符或换乘奔波，提前为您排查调顺。",
              ],
              [
                "真实核验，拒绝虚构",
                "真实高德路径核验与官方开放时间；基准参考诚实标明，绝不编造虚假信息。",
              ],
              [
                "临时生变，稳妥应对",
                "突遇暴雨或航班变动？输入一句大白话，仅调整受影响段，其余行程稳稳不动。",
              ],
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
