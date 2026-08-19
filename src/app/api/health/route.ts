import { NextResponse } from "next/server";
import { getRuntimeInfo } from "@/lib/env";

export function GET() {
  return NextResponse.json({
    ok: true,
    ...getRuntimeInfo(),
  });
}
