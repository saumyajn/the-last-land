// utils/colorUtils.js

/**
 * Determines background color based on a given value and thresholds.
 * @param {number} value - The value to compare.
 * @param {Array<{limit: number, color: string}>} thresholds - Array of thresholds with limit and color.
 * @returns {string} - The color corresponding to the matched threshold.
 */
export const normalizeThresholds = (thresholds = []) => {
    return Array.isArray(thresholds) ? thresholds : [];
};

export const FALLBACK_THRESHOLD_COLOR = "#e0e0e0";

export const getRenderableThresholdColor = (color) => {
    if (typeof color !== "string") return FALLBACK_THRESHOLD_COLOR;

    const trimmed = color.trim();
    const isSupportedMuiColor =
      /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ||
      /^rgba?\(/i.test(trimmed) ||
      /^hsla?\(/i.test(trimmed) ||
      /^color\(/i.test(trimmed);

    return isSupportedMuiColor ? trimmed : FALLBACK_THRESHOLD_COLOR;
};

export const getColorByThreshold = (value, thresholds = []) => {
    const normalizedThresholds = normalizeThresholds(thresholds);

    const sorted = [...normalizedThresholds].sort((a, b) => b.limit - a.limit);
    for (const threshold of sorted) {
      if (value >= threshold.limit) {
        return threshold.color;
      }
    }
    return "inherit";
  };
  
