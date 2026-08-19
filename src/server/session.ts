import { cookies, headers } from "next/headers";
import { createId, sha256Hex } from "@/lib/ids";
import { getEnv } from "@/lib/env";
import { systemClock, toIso } from "@/lib/clock";
import type { Repositories } from "@/server/repositories/types";

const SESSION_COOKIE = "tp_session";

/**
 * Read-only session lookup for Server Components (rendering must not
 * set cookies). Returns null when no session cookie is present.
 */
export async function getSessionIdReadOnly(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function getOrCreateSession(repos: Repositories): Promise<{
  sessionId: string;
  ipHash: string | null;
}> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const now = toIso(systemClock.now());

  const forwarded = headerStore.get("x-forwarded-for");
  const rawIp = forwarded?.split(",")[0]?.trim() || null;
  // No default salt: without RATE_LIMIT_SALT we never derive an IP hash,
  // and hasLiveAiConfig() already forces DEMO mode in that case, so the
  // hash is never needed for real-model rate limiting. Raw IPs are never
  // stored.
  const salt = getEnv().RATE_LIMIT_SALT ?? null;
  const ipHash = rawIp && salt ? await sha256Hex(`${salt}:${rawIp}`) : null;

  const existingId = cookieStore.get(SESSION_COOKIE)?.value;
  if (existingId) {
    const existing = await repos.sessions.getById(existingId);
    if (existing) {
      await repos.sessions.touch(existingId, now, ipHash);
      return { sessionId: existingId, ipHash };
    }
  }

  const sessionId = createId();
  await repos.sessions.create({
    id: sessionId,
    createdAt: now,
    lastSeenAt: now,
    ipHash,
  });
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return { sessionId, ipHash };
}
