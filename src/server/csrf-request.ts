import { headers } from "next/headers";
import { assertSameOrigin } from "@/server/csrf";

export async function assertSameOriginRequest(): Promise<void> {
  const headerStore = await headers();
  assertSameOrigin({
    origin: headerStore.get("origin"),
    referer: headerStore.get("referer"),
    host: headerStore.get("host"),
    forwardedHost: headerStore.get("x-forwarded-host"),
    forwardedProto: headerStore.get("x-forwarded-proto"),
  });
}
