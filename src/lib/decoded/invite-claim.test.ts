import { describe, it, expect } from "vitest";
import { normalizeInviteEmail, isValidInviteEmail, buildClaimPatch } from "./invite-claim";

const NOW = "2026-07-06T12:00:00.000Z";

describe("normalizeInviteEmail — the match key both sides agree on", () => {
  it("lowercases and trims", () => {
    expect(normalizeInviteEmail("  Partner@Example.COM ")).toBe("partner@example.com");
  });

  it("returns '' for null/undefined/blank (never throws)", () => {
    expect(normalizeInviteEmail(null)).toBe("");
    expect(normalizeInviteEmail(undefined)).toBe("");
    expect(normalizeInviteEmail("   ")).toBe("");
  });

  it("is idempotent", () => {
    const once = normalizeInviteEmail("  A.B@Gmail.com ");
    expect(normalizeInviteEmail(once)).toBe(once);
  });

  it("ANTI-REGRESSION: a create-side raw email and a claim-side raw email that differ only in case/whitespace produce the SAME key", () => {
    // Invite created from a typed form value; claim runs from the auth email.
    const createKey = normalizeInviteEmail("Partner@Example.com");
    const claimKey = normalizeInviteEmail("  partner@EXAMPLE.COM  ");
    expect(createKey).toBe(claimKey); // ← if this ever fails, invitees silently unlink
  });
});

describe("isValidInviteEmail", () => {
  it.each([
    "partner@example.com",
    "a.b+tag@sub.domain.co",
    "  Mixed.Case@Example.COM  ", // normalized before validation
  ])("accepts %j", (email) => {
    expect(isValidInviteEmail(email)).toBe(true);
  });

  it.each(["", "   ", null, undefined, "notanemail", "no@domain", "no domain@x.com", "a@b@c.com", "@example.com"])(
    "rejects %j",
    (email) => {
      expect(isValidInviteEmail(email as string)).toBe(false);
    },
  );
});

describe("buildClaimPatch", () => {
  it("completes the invite when the claimer already has a report", () => {
    expect(buildClaimPatch("user-1", "report-9", NOW)).toEqual({
      recipient_id: "user-1",
      recipient_report_id: "report-9",
      status: "completed",
      completed_at: NOW,
    });
  });

  it("leaves the invite pending (no completed_at) when the claimer has no report yet", () => {
    const patch = buildClaimPatch("user-1", null, NOW);
    expect(patch).toEqual({
      recipient_id: "user-1",
      recipient_report_id: null,
      status: "pending",
    });
    expect(patch).not.toHaveProperty("completed_at"); // never stamp completion on a pending claim
  });

  it("always links the recipient_id regardless of report state", () => {
    expect(buildClaimPatch("user-1", "r", NOW).recipient_id).toBe("user-1");
    expect(buildClaimPatch("user-1", null, NOW).recipient_id).toBe("user-1");
  });
});
