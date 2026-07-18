import { describe, it, expect } from "vitest";
import { secondaryAdjective, describeLeap } from "./money-map-card-format";

describe("secondaryAdjective", () => {
  it("renders each core Map as its adjective form (§5 'DRIVE · guarded')", () => {
    expect(secondaryAdjective("GUARD")).toBe("guarded");
    expect(secondaryAdjective("DRIVE")).toBe("driven");
    expect(secondaryAdjective("MIRROR")).toBe("mirrored");
    expect(secondaryAdjective("SHADOW")).toBe("shadowed");
  });
});

describe("describeLeap", () => {
  it("surfaces the tilt when the leap is tilted (§5 hook line)", () => {
    expect(describeLeap("High", "fear-of-success")).toBe("High — tilted to fear of success");
    expect(describeLeap("Moderate", "fear-of-failure")).toBe("Moderate — tilted to fear of failure");
  });

  it("renders the band alone for a balanced leap — never an invented tilt", () => {
    expect(describeLeap("Low", "balanced")).toBe("Low");
    expect(describeLeap("Moderate", "balanced")).toBe("Moderate");
    expect(describeLeap("High", "balanced")).toBe("High");
  });
});
