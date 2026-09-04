import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { getEnv, getRuntimeInfo } from "@/lib/env";
import { createTripFromTextAction, startDemoTripAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; error?: string }>;
}) {
  const runtime = getRuntimeInfo();
  const { demo, error } = await searchParams;
  const maxChars = getEnv().MAX_SOURCE_INPUT_CHARS;

  return (
    <div className="min-h-full">
      <SiteHeader
        dataMode={runtime.dataMode}
        persistenceLabel={runtime.persistenceLabel}
        demoReason={runtime.demoReason}
      />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="font-display text-3xl font-semibold tracking-wide">
          新建行程
        </h1>
        <p className="mt-3 text-base text-muted">
          告诉搭子您的出行想法，系统将自动提炼出行人、时间与关键底线要求。
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-base text-danger"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <form action={startDemoTripAction}>
            <input type="hidden" name="fixtureId" value="hong-kong" />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-[3px] border border-border bg-surface px-4 text-base tracking-wide transition-colors hover:bg-surface-muted"
            >
              使用香港演示场景
            </button>
          </form>
          <form action={startDemoTripAction}>
            <input type="hidden" name="fixtureId" value="beijing" />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-[3px] border border-border bg-surface px-4 text-base tracking-wide transition-colors hover:bg-surface-muted"
            >
              使用北京演示场景
            </button>
          </form>
        </div>
        {demo ? (
          <p className="mt-3 text-sm text-muted">
            也可以直接点击上方按钮进入所选演示场景。
          </p>
        ) : null}

        <form action={createTripFromTextAction} className="mt-10 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-base font-medium">
                行程名称
              </span>
              <input
                name="title"
                type="text"
                maxLength={60}
                className="w-full rounded-[3px] border border-border bg-surface px-3 py-2.5 text-base"
                placeholder="例如：带爸妈香港一日游"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-base font-medium">
                目的地
              </span>
              <input
                name="destination"
                type="text"
                maxLength={30}
                className="w-full rounded-[3px] border border-border bg-surface px-3 py-2.5 text-base"
                placeholder="例如：香港"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-2 block text-base font-medium">
              粘贴需求或聊天记录（最多 {maxChars} 字符）
            </span>
            <textarea
              name="source"
              rows={10}
              required
              maxLength={maxChars}
              className="w-full rounded-[3px] border border-border bg-surface px-3 py-3 text-base"
              placeholder="例如：明天从福田口岸进、罗湖出，老人同行，少走路，不坐摩天轮。"
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-[3px] bg-primary px-6 text-base font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
            >
              提炼要点，开始规划
            </button>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-[3px] px-5 text-base tracking-wide text-muted transition-colors hover:text-primary"
            >
              返回首页
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
