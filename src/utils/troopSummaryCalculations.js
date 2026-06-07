import { computeKPT } from "./kptCalculations";

export const calculateTroopTypeSummary = (kptData = {}) => {
  let totalKills = 0;
  let totalLosses = 0;
  let totalWounded = 0;
  let totalSurvivors = 0;

  Object.entries(kptData).forEach(([type, stats]) => {
    if (type === "T10_guards") return;

    totalKills += stats.Kills || 0;
    totalLosses += stats.Losses || 0;
    totalWounded += stats.Wounded || 0;
    totalSurvivors += stats.Survivors || 0;
  });

  const totalDenominator = totalLosses + totalWounded + totalSurvivors;
  const globalKPTValue = totalDenominator > 0
    ? (totalKills - totalLosses - totalWounded) / totalDenominator
    : 0;

  const troopDetails = {};
  Object.entries(kptData).forEach(([type, stats]) => {
    let marchSize = globalKPTValue > 0 ? (stats.Kills || 0) / globalKPTValue : 0;
    if (type === "T10_guards") marchSize = 0;

    troopDetails[type] = {
      ...stats,
      calculatedMarchSize: Math.round(marchSize),
      marchPercentage: totalDenominator > 0
        ? `${((marchSize / totalDenominator) * 100).toFixed(2)}%`
        : "0.00%",
    };
  });

  return {
    totals: {
      Kills: totalKills,
      Losses: totalLosses,
      Wounded: totalWounded,
      Survivors: totalSurvivors,
      KPT: computeKPT(totalKills, totalLosses, totalWounded, totalSurvivors, 3),
      totalMarchSize: totalDenominator,
    },
    troopDetails,
  };
};
