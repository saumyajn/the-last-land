// utils/colorUtils.js

/**
 * Determines background color based on a given value and thresholds.
 * @param {number} value - The value to compare.
 * @param {Array<{limit: number, color: string}>} thresholds - Array of thresholds with limit and color.
 * @returns {string} - The color corresponding to the matched threshold.
 */
export const getColorByThreshold = (value, thresholds = []) => {
    if (!Array.isArray(thresholds)) return "inherit";
  
    const sorted = [...thresholds].sort((a, b) => b.limit - a.limit);
    for (const threshold of sorted) {
      if (value >= threshold.limit) {
        return threshold.color;
      }
    }
    return "inherit";
  };
  