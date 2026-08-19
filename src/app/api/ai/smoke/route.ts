import { NextResponse } from "next/server";
import { getRuntimeInfo, hasLiveAiConfig } from "@/lib/env";
import { anthropicSmokeTest } from "@/services/ai/anthropic";

export const dynamic = "force-dynamic";

/**
 * Local-development-only smoke test for the Anthropic-compatible
 * gateway. In production this endpoint does not exist (404): a public
 * unauthenticated route that spends real model quota would bypass the
 * rate-limit gate. Never returns secret values.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }
  const runtime = getRuntimeInfo();
  if (!hasLiveAiConfig()) {
    return NextResponse.json({
      ok: false,
      mode: runtime.dataMode,
      detail: "缺少完整的 LIVE_PARTIAL 配置（ANTHROPIC_* / DATABASE_URL / RATE_LIMIT_SALT），应用运行在 DEMO 模式",
    });
  }
  const result = await anthropicSmokeTest();
  return NextResponse.json({
    ok: result.ok,
    mode: runtime.dataMode,
    detail: result.detail,
  });
}
