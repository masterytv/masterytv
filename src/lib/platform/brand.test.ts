/**
 * Brand resolution tests — encodes the 2026-07-14 founder decision: the brand
 * preview COOKIE is honored on localhost only. A stale 30-day cookie had
 * silently re-skinned staging.masterytv.com as Relatti and flipped the coach
 * `program` hint sent by the chat client.
 */
import { describe, it, expect } from "vitest";
import { resolveBrandId, resolveBrand, isPreviewHost, DEFAULT_BRAND_ID } from "./brand";

describe("isPreviewHost", () => {
  it("treats localhost (with or without port) as preview", () => {
    expect(isPreviewHost("localhost")).toBe(true);
    expect(isPreviewHost("localhost:3000")).toBe(true);
    expect(isPreviewHost("127.0.0.1:3000")).toBe(true);
  });

  it("treats every deployed host as non-preview", () => {
    expect(isPreviewHost("masterytv.com")).toBe(false);
    expect(isPreviewHost("staging.masterytv.com")).toBe(false);
    expect(isPreviewHost("relatti.com")).toBe(false);
    expect(isPreviewHost("staging.relatti.com")).toBe(false);
    expect(isPreviewHost(null)).toBe(false);
  });
});

describe("resolveBrandId — cookie is localhost-only", () => {
  it("honors the preview cookie on localhost", () => {
    expect(resolveBrandId({ host: "localhost:3000", cookie: "relatti" })).toBe("relatti");
  });

  it("IGNORES the cookie on deployed default-brand hosts (the staging.masterytv.com bug)", () => {
    expect(resolveBrandId({ host: "staging.masterytv.com", cookie: "relatti" })).toBe("masterytv");
    expect(resolveBrandId({ host: "masterytv.com", cookie: "relatti" })).toBe("masterytv");
  });

  it("dedicated brand host is authoritative regardless of cookie", () => {
    expect(resolveBrandId({ host: "relatti.com", cookie: "masterytv" })).toBe("relatti");
    expect(resolveBrandId({ host: "staging.relatti.com", cookie: "masterytv" })).toBe("relatti");
  });

  it("?brand= param still overrides everywhere (visible + non-sticky on deployed hosts)", () => {
    expect(resolveBrandId({ host: "staging.masterytv.com", param: "relatti" })).toBe("relatti");
    expect(resolveBrandId({ host: "relatti.com", param: "masterytv" })).toBe("masterytv");
  });

  it("falls back to the default brand for unknown hosts", () => {
    expect(resolveBrandId({ host: "unknown.example.com" })).toBe(DEFAULT_BRAND_ID);
    expect(resolveBrand(null).id).toBe(DEFAULT_BRAND_ID);
  });
});
