import { describe, expect, it } from "vitest";
import {
  buildConsentRow,
  INTEGRATION_CONSENT_VERSION,
  INTEGRATION_DISCLOSURES,
} from "./integration-consent";
// The EDGE module, imported across the boundary on purpose. It has no imports of
// its own and no Deno-only APIs, so it runs here unchanged — and the property
// being tested is the one that decides whether this product may keep what
// somebody said. A guarantee with no test is a guarantee nobody has checked.
import { hasLiveConsent } from "../../../supabase/functions/_shared/consent";

/** A supabase-shaped stub: the fluent chain, ending in whatever we hand it. */
function client(result: { data?: unknown[] | null; error?: { message: string } | null } | Error) {
  const chain = {
    eq: () => chain,
    is: () => chain,
    limit: () => (result instanceof Error ? Promise.reject(result) : Promise.resolve({ data: null, error: null, ...result })),
  };
  return { from: () => ({ select: () => chain }) };
}

describe("the consent record", () => {
  it("stamps the program and the version, never taking them from a caller", () => {
    const row = buildConsentRow("user-1");
    expect(row.program).toBe("integration");
    expect(row.version).toBe(INTEGRATION_CONSENT_VERSION);
    expect(row.age_attested).toBe(true);
  });

  it("records what they were shown, so an old row still says what it said", () => {
    const row = buildConsentRow("user-1");
    for (const d of INTEGRATION_DISCLOSURES) {
      expect(row.disclosures[d.key]).toBe(d.title);
    }
  });

  it("tells them the six things I5.5 requires", () => {
    expect(INTEGRATION_DISCLOSURES.map((d) => d.key)).toEqual([
      "is_ai",
      "not_care",
      "no_verdict",
      "confidentiality",
      "crisis",
      "revoke",
    ]);
  });
});

describe("hasLiveConsent", () => {
  it("is true when a live row exists", async () => {
    expect(await hasLiveConsent(client({ data: [{ id: "c1" }] }), "u", "integration")).toBe(true);
  });

  it("is false when there is none", async () => {
    expect(await hasLiveConsent(client({ data: [] }), "u", "integration")).toBe(false);
  });

  // 🔑 The whole point. Every other control in this vertical fails OPEN, because
  // an auditor that can 500 the coach is worse than the drafts it catches. This
  // one is the other way round: a failed read costs a turn its memory, which is
  // recoverable, and guessing yes stores a fact about somebody who never agreed
  // to be remembered, which is not.
  it("fails CLOSED when the read errors", async () => {
    expect(await hasLiveConsent(client({ error: { message: "boom" } }), "u", "integration")).toBe(false);
  });

  it("fails CLOSED when the read throws", async () => {
    expect(await hasLiveConsent(client(new Error("network")), "u", "integration")).toBe(false);
  });

  // The executive default has no consent surface and never had one. Gating it
  // here would silently stop three shipped verticals from remembering anything.
  it("does not gate a program-less conversation", async () => {
    expect(await hasLiveConsent(client({ data: [] }), "u", null)).toBe(true);
  });
});
