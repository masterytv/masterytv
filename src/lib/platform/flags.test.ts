/**
 * INTEGRATION_ENGINE flag tests (INTEGRATION_SPRINT.md §2).
 *
 * The load-bearing assertion is the FIRST one: unset means off. Everything the
 * integration vertical ships between now and the I1 go/no-go rides this flag,
 * so a flag that defaults on in an environment nobody configured would put an
 * un-decided product in front of users.
 *
 * The edge twin (`supabase/functions/_shared/flags.ts`) is the same logic over
 * `Deno.env`; Deno globals aren't available under vitest, so it is verified by
 * reading it against this file rather than by a second suite.
 */
import { describe, it, expect, afterEach } from "vitest";
import { integrationEngineEnabled } from "./flags";

const USER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

afterEach(() => {
  delete process.env.INTEGRATION_ENGINE;
  delete process.env.INTEGRATION_ENGINE_USERS;
});

describe("integrationEngineEnabled", () => {
  it("is off when nothing is set", () => {
    expect(integrationEngineEnabled()).toBe(false);
    expect(integrationEngineEnabled(USER)).toBe(false);
  });

  it("is off for any value that is not 'on'", () => {
    for (const value of ["", "off", "true", "1", "yes", "enabled"]) {
      process.env.INTEGRATION_ENGINE = value;
      expect(integrationEngineEnabled(USER)).toBe(false);
    }
  });

  it("is on globally for 'on', in any casing or padding", () => {
    for (const value of ["on", "ON", "On", " on "]) {
      process.env.INTEGRATION_ENGINE = value;
      expect(integrationEngineEnabled()).toBe(true);
      expect(integrationEngineEnabled(USER)).toBe(true);
    }
  });

  it("opens for an allow-listed user while the global flag stays off", () => {
    process.env.INTEGRATION_ENGINE_USERS = `${USER}, ${OTHER}`;
    expect(integrationEngineEnabled(USER)).toBe(true);
    expect(integrationEngineEnabled(OTHER)).toBe(true);
    // The global question is still no — this is the I1.5 tester cohort, not a launch.
    expect(integrationEngineEnabled()).toBe(false);
    expect(integrationEngineEnabled("33333333-3333-3333-3333-333333333333")).toBe(false);
  });

  it("ignores empty entries in a sloppy allow-list", () => {
    process.env.INTEGRATION_ENGINE_USERS = `,, ${USER} ,,`;
    expect(integrationEngineEnabled(USER)).toBe(true);
    expect(integrationEngineEnabled("")).toBe(false);
    expect(integrationEngineEnabled(null)).toBe(false);
  });
});
