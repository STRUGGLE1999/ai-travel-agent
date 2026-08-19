/**
 * Same-origin check for anonymous cookie writes.
 * Next.js Server Actions already reject mismatched Origin; this is an
 * explicit, unit-tested defense-in-depth layer on top of SameSite=Lax.
 */
export class CsrfOriginError extends Error {
  constructor(message = "请求来源无效") {
    super(message);
    this.name = "CsrfOriginError";
  }
}

export interface OriginCheckInput {
  origin?: string | null;
  referer?: string | null;
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
}

function firstHeader(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const first = value.split(",")[0]?.trim();
  return first ? first : null;
}

function hostFromUrlOrHost(value: string): string | null {
  try {
    const url = value.includes("://")
      ? new URL(value)
      : new URL(`https://${value}`);
    return url.host.toLowerCase();
  } catch {
    return null;
  }
}

function originFromReferer(referer: string | null | undefined): string | null {
  if (!referer) {
    return null;
  }
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * Compare the request Origin (or Referer origin) against Host /
 * X-Forwarded-Host. Protocol is ignored so local HTTP and Vercel HTTPS
 * both pass when the host matches.
 */
export function assertSameOrigin(input: OriginCheckInput): void {
  const requestHost = firstHeader(input.forwardedHost) ?? firstHeader(input.host);
  if (!requestHost) {
    throw new CsrfOriginError();
  }
  const expectedHost = hostFromUrlOrHost(requestHost);
  if (!expectedHost) {
    throw new CsrfOriginError();
  }

  const originRaw =
    firstHeader(input.origin) ?? originFromReferer(input.referer);
  if (!originRaw || originRaw.toLowerCase() === "null") {
    throw new CsrfOriginError();
  }
  const originHost = hostFromUrlOrHost(originRaw);
  if (!originHost || originHost !== expectedHost) {
    throw new CsrfOriginError();
  }
}
