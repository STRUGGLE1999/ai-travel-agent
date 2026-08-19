import { describe, expect, it } from "vitest";
import { assertSameOrigin, CsrfOriginError } from "@/server/csrf";

const local = {
  host: "localhost:3000",
  origin: "http://localhost:3000",
};

describe("assertSameOrigin", () => {
  it("allows a same-origin browser POST", () => {
    expect(() => assertSameOrigin(local)).not.toThrow();
  });

  it("allows Vercel production hosts via X-Forwarded-Host", () => {
    expect(() =>
      assertSameOrigin({
        origin: "https://ai-travel-agent-smoky-rho.vercel.app",
        forwardedHost: "ai-travel-agent-smoky-rho.vercel.app",
        forwardedProto: "https",
        host: "localhost:3000",
      }),
    ).not.toThrow();
  });

  it("falls back to Referer when Origin is missing", () => {
    expect(() =>
      assertSameOrigin({
        host: "localhost:3000",
        referer: "http://localhost:3000/trips/abc/plan",
      }),
    ).not.toThrow();
  });

  it("rejects a cross-site Origin", () => {
    expect(() =>
      assertSameOrigin({
        ...local,
        origin: "https://evil.example",
      }),
    ).toThrow(CsrfOriginError);
  });

  it("rejects a cross-site Referer when Origin is absent", () => {
    expect(() =>
      assertSameOrigin({
        host: "localhost:3000",
        referer: "https://evil.example/attack",
      }),
    ).toThrow(CsrfOriginError);
  });

  it("rejects missing Origin and Referer", () => {
    expect(() => assertSameOrigin({ host: "localhost:3000" })).toThrow(
      CsrfOriginError,
    );
  });

  it("rejects a null Origin (sandboxed iframe)", () => {
    expect(() =>
      assertSameOrigin({
        host: "localhost:3000",
        origin: "null",
      }),
    ).toThrow(CsrfOriginError);
  });

  it("rejects missing Host", () => {
    expect(() =>
      assertSameOrigin({ origin: "http://localhost:3000" }),
    ).toThrow(CsrfOriginError);
  });
});
