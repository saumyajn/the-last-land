import {
  FALLBACK_THRESHOLD_COLOR,
  getColorByThreshold,
  getRenderableThresholdColor,
  normalizeThresholds,
} from "./colorUtils";

describe("colorUtils", () => {
  test("normalizes malformed thresholds to an empty array", () => {
    expect(normalizeThresholds({})).toEqual([]);
    expect(normalizeThresholds(null)).toEqual([]);
  });

  test("keeps threshold array behavior unchanged", () => {
    const thresholds = [
      { limit: 250, color: "#d32f2f" },
      { limit: 200, color: "#fbc02d" },
    ];

    expect(normalizeThresholds(thresholds)).toBe(thresholds);
    expect(getColorByThreshold(260, thresholds)).toBe("#d32f2f");
    expect(getColorByThreshold(225, thresholds)).toBe("#fbc02d");
    expect(getColorByThreshold(50, thresholds)).toBe("inherit");
  });

  test("uses a valid render fallback for non-color threshold keys", () => {
    expect(getRenderableThresholdColor("default")).toBe(FALLBACK_THRESHOLD_COLOR);
    expect(getRenderableThresholdColor("#90caf9")).toBe("#90caf9");
  });
});
