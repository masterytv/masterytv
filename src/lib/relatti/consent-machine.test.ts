import { describe, it, expect } from "vitest";
import { reduceConsent, type ConsentInput } from "./consent-machine";

const USER = "user-self";
const PARTNER = "user-partner";
const NOW = "2026-07-06T12:00:00.000Z";

/** Build a ConsentInput with sane defaults; override per-case. */
function input(over: Partial<ConsentInput>): ConsentInput {
  return {
    action: "request",
    level: null,
    current: "none",
    requestedLevel: null,
    requestedBy: null,
    userId: USER,
    now: NOW,
    ...over,
  };
}

describe("reduceConsent — request (raise, bilateral)", () => {
  it("stores a pending request when raising none → type_compatibility", () => {
    const r = reduceConsent(input({ action: "request", level: "type_compatibility", current: "none" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch).toEqual({ upgrade_requested_level: "type_compatibility", upgrade_requested_by: USER });
    expect(r.response).toEqual({ success: true, status: "requested", level: "type_compatibility" });
    // A raise is a *proposal* — it must NOT change the effective level or touch the spine.
    expect(r.patch).not.toHaveProperty("share_with_human");
    expect(r.syncAfter).toBe(false);
  });

  it("allows none → full and type_compatibility → full", () => {
    expect(reduceConsent(input({ action: "request", level: "full", current: "none" })).ok).toBe(true);
    expect(reduceConsent(input({ action: "request", level: "full", current: "type_compatibility" })).ok).toBe(true);
  });

  it.each([
    ["none", "none"],
    ["type_compatibility", "type_compatibility"],
    ["full", "full"],
  ])("rejects a no-op request (current=%s, level=%s)", (current, level) => {
    const r = reduceConsent(input({ action: "request", level, current }));
    expect(r).toMatchObject({ ok: false, httpStatus: 400, error: "A request must raise the level" });
  });

  it("rejects a request that would LOWER (full → type_compatibility)", () => {
    const r = reduceConsent(input({ action: "request", level: "type_compatibility", current: "full" }));
    expect(r).toMatchObject({ ok: false, httpStatus: 400 });
  });

  it("treats the legacy 'compatibility' spelling as the same rung as type_compatibility", () => {
    // current stored as legacy 'compatibility' (rank 1); requesting type_compatibility (rank 1) is a no-op.
    const r = reduceConsent(input({ action: "request", level: "type_compatibility", current: "compatibility" }));
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown / invalid target level", () => {
    expect(reduceConsent(input({ action: "request", level: "everything", current: "none" })).ok).toBe(false);
    expect(reduceConsent(input({ action: "request", level: null, current: "none" })).ok).toBe(false);
  });
});

describe("reduceConsent — accept (apply partner's pending request)", () => {
  it("applies the pending level, consents, and clears the request", () => {
    const r = reduceConsent(
      input({ action: "accept", requestedLevel: "full", requestedBy: PARTNER, current: "type_compatibility" }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch).toMatchObject({
      share_with_human: "full",
      status: "consented",
      consented_at: NOW,
      revoked_at: null,
      upgrade_requested_level: null,
      upgrade_requested_by: null,
    });
    expect(r.response).toEqual({ success: true, status: "accepted", level: "full" });
    expect(r.syncAfter).toBe(true);
  });

  it("REJECTS accepting your own request (raising is bilateral)", () => {
    const r = reduceConsent(input({ action: "accept", requestedLevel: "full", requestedBy: USER }));
    expect(r).toMatchObject({ ok: false, httpStatus: 400, error: "Nothing to accept" });
  });

  it("rejects accept when there is no pending request", () => {
    const r = reduceConsent(input({ action: "accept", requestedLevel: null, requestedBy: null }));
    expect(r).toMatchObject({ ok: false, httpStatus: 400, error: "Nothing to accept" });
  });

  it("clears revoked_at on accept (re-consenting after a prior Private)", () => {
    const r = reduceConsent(input({ action: "accept", requestedLevel: "type_compatibility", requestedBy: PARTNER }));
    if (!r.ok) throw new Error("expected ok");
    expect(r.patch.revoked_at).toBeNull();
  });
});

describe("reduceConsent — decline", () => {
  it("clears the pending request without applying it", () => {
    const r = reduceConsent(input({ action: "decline", requestedLevel: "full", requestedBy: PARTNER, current: "type_compatibility" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch).toEqual({ upgrade_requested_level: null, upgrade_requested_by: null });
    // Decline must not change the effective sharing level or sync the spine.
    expect(r.patch).not.toHaveProperty("share_with_human");
    expect(r.syncAfter).toBe(false);
    expect(r.response).toEqual({ success: true, status: "declined" });
  });
});

describe("reduceConsent — lower (unilateral, immediate)", () => {
  it("lowers full → type_compatibility immediately (consented, not private)", () => {
    const r = reduceConsent(input({ action: "lower", level: "type_compatibility", current: "full" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch).toMatchObject({
      share_with_human: "type_compatibility",
      status: "consented",
      consented_at: NOW,
      revoked_at: null,
    });
    expect(r.syncAfter).toBe(true);
  });

  it("PRIVATE GUARD: lowering to 'none' stamps revoked_at and marks completed", () => {
    const r = reduceConsent(input({ action: "lower", level: "none", current: "full" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch).toMatchObject({
      share_with_human: "none",
      status: "completed",
      consented_at: null,
      revoked_at: NOW, // ← the guard: relatti_sync_invite won't re-default this upward
    });
    expect(r.response).toEqual({ success: true, status: "lowered", level: "none" });
  });

  it("allows type_compatibility → none", () => {
    expect(reduceConsent(input({ action: "lower", level: "none", current: "type_compatibility" })).ok).toBe(true);
  });

  it.each([
    ["full", "full"],
    ["type_compatibility", "type_compatibility"],
    ["none", "none"],
  ])("rejects a no-op lower (current=%s, level=%s)", (current, level) => {
    const r = reduceConsent(input({ action: "lower", level, current }));
    expect(r).toMatchObject({ ok: false, httpStatus: 400, error: "Lowering must reduce the level" });
  });

  it("rejects a 'lower' that would actually RAISE (none → full)", () => {
    const r = reduceConsent(input({ action: "lower", level: "full", current: "none" }));
    expect(r).toMatchObject({ ok: false, httpStatus: 400 });
  });

  it("rejects an invalid / missing target level", () => {
    expect(reduceConsent(input({ action: "lower", level: "everything", current: "full" })).ok).toBe(false);
    expect(reduceConsent(input({ action: "lower", level: null, current: "full" })).ok).toBe(false);
  });
});

describe("reduceConsent — invariants across all actions", () => {
  it("rejects an unrecognized action", () => {
    const r = reduceConsent(input({ action: "obliterate" }));
    expect(r).toMatchObject({ ok: false, httpStatus: 400, error: "Unknown action" });
  });

  it("keeps share_with_coach a strict mirror of share_with_human on every write", () => {
    const writes: ConsentInput[] = [
      input({ action: "accept", requestedLevel: "full", requestedBy: PARTNER }),
      input({ action: "lower", level: "type_compatibility", current: "full" }),
      input({ action: "lower", level: "none", current: "full" }),
    ];
    for (const w of writes) {
      const r = reduceConsent(w);
      if (!r.ok) throw new Error("expected ok");
      expect(r.patch.share_with_coach).toBe(r.patch.share_with_human);
    }
  });

  it("NEVER writes the real coach axis (participant.coach_share_level) — it lives on a separate route", () => {
    const all: ConsentInput[] = [
      input({ action: "request", level: "full", current: "none" }),
      input({ action: "accept", requestedLevel: "full", requestedBy: PARTNER }),
      input({ action: "decline", requestedLevel: "full", requestedBy: PARTNER }),
      input({ action: "lower", level: "none", current: "full" }),
    ];
    for (const i of all) {
      const r = reduceConsent(i);
      if (!r.ok) continue;
      expect(r.patch).not.toHaveProperty("coach_share_level");
    }
  });

  it("only accept and lower re-sync the engagement spine", () => {
    expect((reduceConsent(input({ action: "request", level: "full" })) as { syncAfter: boolean }).syncAfter).toBe(false);
    expect((reduceConsent(input({ action: "decline" })) as { syncAfter: boolean }).syncAfter).toBe(false);
    expect((reduceConsent(input({ action: "accept", requestedLevel: "full", requestedBy: PARTNER })) as { syncAfter: boolean }).syncAfter).toBe(true);
    expect((reduceConsent(input({ action: "lower", level: "none", current: "full" })) as { syncAfter: boolean }).syncAfter).toBe(true);
  });
});
