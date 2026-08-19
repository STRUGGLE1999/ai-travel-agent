import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
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
      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <p className="text-sm font-medium tracking-wide text-primary">
          风来成行
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">
          懂变化的 AI 旅行搭子。
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          锁定航班、口岸、同行人和体力等约束，检查时间与票种冲突，追踪来源，并在修改前说明影响。
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <form action={startDemoTripAction}>
            <input type="hidden" name="fixtureId" value="hong-kong" />
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-5 text-base font-medium text-primary-foreground sm:w-auto"
            >
              体验香港老人一日游
            </button>
          </form>
          <form action={startDemoTripAction}>
            <input type="hidden" name="fixtureId" value="beijing" />
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-surface px-5 text-base font-medium sm:w-auto"
            >
              体验北京预约旅行
            </button>
          </form>
          <Link
            href="/trips/new"
            className="inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-base font-medium text-primary hover:bg-surface-muted"
          >
            新建行程
          </Link>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {[
            ["锁定约束", "先确认硬条件，再生成候选计划。"],
            ["发现冲突", "票种、缓冲和动线问题会明确阻断。"],
            ["来源可追溯", "演示数据标 MOCK，未知就标未知。"],
            ["变更可解释", "先看 Diff，确认后才生成新版本。"],
          ].map(([title, body]) => (
            <li
              key={title}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="mt-1 text-base text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
