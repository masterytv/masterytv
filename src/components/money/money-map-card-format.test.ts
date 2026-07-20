import { describe, it, expect } from "vitest";
import { secondaryAdjective, describeFear } from "./money-map-card-format";

describe("secondaryAdjective", () => {
  it("renders each core Map as its adjective form (§5 'DRIVE · guarded')", () => {
    expect(secondaryAdjective("GUARD")).toBe("guarded");
    expect(secondaryAdjective("DRIVE")).toBe("driven");
    expect(secondaryAdjective("MIRROR")).toBe("mirrored");
    expect(secondaryAdjective("SHADOW")).toBe("shadowed");
  });
});

describe("describeFear", () => {
  it("surfaces the tilt when the facets earned one (§5 hook line)", () => {
    expect(describeFear("High", "fear-of-success")).toBe("High — leaning fear of success");
    expect(describeFear("Moderate", "fear-of-failure")).toBe("Moderate — leaning fear of failure");
  });

  it("renders the band alone for a balanced result — never an invented tilt", () => {
    expect(describeFear("Low", "balanced")).toBe("Low");
    expect(describeFear("Moderate", "balanced")).toBe("Moderate");
    expect(describeFear("High", "balanced")).toBe("High");
  });
});
