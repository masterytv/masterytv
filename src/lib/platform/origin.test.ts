import { describe, it, expect } from "vitest";
import { originFromHeaders } from "./origin";

function h(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe("originFromHeaders", () => {
  it("uses the request host — a Relatti user on relatti.com gets relatti.com links", () => {
    expect(originFromHeaders(h({ host: "relatti.com" }))).toBe("https://relatti.com");
  });

  it("a MasteryTV user on masterytv.com gets masterytv.com links", () => {
    expect(originFromHeaders(h({ host: "masterytv.com" }))).toBe("https://masterytv.com");
  });

  it("prefers x-forwarded-host (Vercel's canonical public host) over host", () => {
    expect(originFromHeaders(h({ "x-forwarded-host": "relatti.com", host: "internal.vercel" }))).toBe(
      "https://relatti.com",
    );
  });

  it("honors x-forwarded-proto for local/http testing", () => {
    expect(originFromHeaders(h({ host: "localhost:3000", "x-forwarded-proto": "http" }))).toBe(
      "http://localhost:3000",
    );
  });

  it("defaults the scheme to https", () => {
    expect(originFromHeaders(h({ host: "staging.relatti.com" }))).toBe("https://staging.relatti.com");
  });

  it("the request host always wins over any NEXT_PUBLIC_APP_URL env (the bug was using the static env)", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://masterytv.com";
    try {
      expect(originFromHeaders(h({ host: "relatti.com" }))).toBe("https://relatti.com");
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  });
});
