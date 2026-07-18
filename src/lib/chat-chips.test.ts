/**
 * Answer-chip parser — unit tests.
 *
 * Locks the [[CHIPS: …]] contract the money pack emits (money-pack.ts ANSWER
 * CHIPS block) and the chat UI parses. Covers the streaming partial-strip (the
 * marker must never flash mid-stream) and the vertical-blind no-op (any coach
 * that never emits the marker is untouched — the incumbent-safety invariant).
 *
 * Run: npx vitest run src/lib/chat-chips.test.ts
 */

import { describe, it, expect } from "vitest";
import { parseChips, stripStreamingChips } from "./chat-chips";

describe("parseChips", () => {
  it("returns content untouched when there is no marker (every non-money coach)", () => {
    const text = "What's the money conversation you've been avoiding?";
    expect(parseChips(text)).toEqual({ text, chips: [] });
  });

  it("splits a trailing marker into text + chips and strips the marker line", () => {
    const content =
      "When you picture it taking off, what's the first thing you're afraid you'd lose?\n" +
      "[[CHIPS: My freedom | Who I'd become | The people close to me | Nothing — I'd love it]]";
    const { text, chips } = parseChips(content);
    expect(text).toBe(
      "When you picture it taking off, what's the first thing you're afraid you'd lose?",
    );
    expect(chips).toEqual(["My freedom", "Who I'd become", "The people close to me", "Nothing — I'd love it"]);
  });

  it("trims whitespace and drops empty options", () => {
    expect(parseChips("Q?\n[[CHIPS:  It has a number |  | It keeps moving  ]]").chips).toEqual([
      "It has a number",
      "It keeps moving",
    ]);
  });

  it("caps at 6 options so a runaway marker can't wall the UI", () => {
    const many = Array.from({ length: 12 }, (_, i) => `opt${i}`).join(" | ");
    expect(parseChips(`Q?\n[[CHIPS: ${many}]]`).chips).toHaveLength(6);
  });

  it("only matches a marker at the END — a bracketed aside mid-message is left alone", () => {
    const content = "I said [[CHIPS: not a marker]] earlier, but here's my real question.";
    expect(parseChips(content)).toEqual({ text: content, chips: [] });
  });

  it("strips the marker even when it yields no usable options", () => {
    expect(parseChips("Q?\n[[CHIPS:  |  ]]")).toEqual({ text: "Q?", chips: [] });
  });
});

describe("stripStreamingChips", () => {
  it("leaves normal streaming text untouched", () => {
    const partial = "You came out The Relentless Builder — so you already know how to gr";
    expect(stripStreamingChips(partial)).toBe(partial);
  });

  it("hides a complete marker the instant it finishes streaming", () => {
    expect(stripStreamingChips("Q?\n[[CHIPS: A | B | C]]")).toBe("Q?");
  });

  it("hides an opening marker that is still arriving (no closing brackets yet)", () => {
    expect(stripStreamingChips("Q?\n[[CHIPS: My free")).toBe("Q?");
    expect(stripStreamingChips("Q?\n[[")).toBe("Q?");
  });

  it("does NOT eat a normal markdown link at the tail (single bracket, closed)", () => {
    const content = "See [the guide](/guide)";
    expect(stripStreamingChips(content)).toBe(content);
  });
});
