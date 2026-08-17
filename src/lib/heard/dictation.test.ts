import { describe, it, expect } from "vitest";
import { appendDictated, ACCOUNT_MAX_CHARS } from "./dictation";

const MAX = ACCOUNT_MAX_CHARS;

describe("appendDictated", () => {
  it("puts the first phrase in cleanly, with no leading space", () => {
    expect(appendDictated("", "I was above the bed", MAX)).toBe("I was above the bed");
  });

  it("joins phrases with exactly one space when the browser sends a leading one", () => {
    // Chrome returns " and then it stopped" — space included.
    expect(appendDictated("I was above the bed", " and then it stopped", MAX)).toBe(
      "I was above the bed and then it stopped",
    );
  });

  it("does not double the space when the box already ends in one", () => {
    expect(appendDictated("I was above the bed ", "and then it stopped", MAX)).toBe(
      "I was above the bed and then it stopped",
    );
  });

  it("ignores a whitespace-only result rather than adding a space", () => {
    // Recognition emits these between phrases; each one would otherwise pad the
    // text with spaces while somebody sat in silence.
    expect(appendDictated("I was above the bed", "   ", MAX)).toBe("I was above the bed");
    expect(appendDictated("I was above the bed", "", MAX)).toBe("I was above the bed");
  });

  it("keeps paragraph breaks the person typed", () => {
    expect(appendDictated("First part.\n\nSecond part.", "Then this", MAX)).toBe(
      "First part.\n\nSecond part. Then this",
    );
  });

  it("never exceeds the ceiling, and is a no-op once already there", () => {
    const full = "x".repeat(MAX);
    expect(appendDictated(full, "more words", MAX)).toHaveLength(MAX);
    expect(appendDictated("x".repeat(MAX - 3), "words", MAX)).toHaveLength(MAX);
  });

  it("holds the ceiling at the coach's per-program value", () => {
    // The edge cannot import this file, so `MESSAGE_CEILING.integration` in
    // coach/index.ts is a hand-kept twin. Lowering this constant without
    // lowering that one is silent; this fails first and says why.
    expect(ACCOUNT_MAX_CHARS).toBe(25000);
  });
});
