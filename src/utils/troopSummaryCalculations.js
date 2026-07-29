import { computeKPT, computeLPT, numberFromReportValue } from "./kptCalculations";

const getMarchSize = (stats = {}) =>
  numberFromReportValue(stats.Losses) +
  numberFromReportValue(stats.Wounded) +
  numberFromReportValue(stats.Survivors);

export const calculateTroopTypeSummary = (kptData = {}) => {
  let totalKills = 0;
  let totalLosses = 0;
  let totalWounded = 0;
  let totalSurvivors = 0;

  Object.values(kptData).forEach((stats) => {
    totalKills += numberFromReportValue(stats.Kills);
    totalLosses += numberFromReportValue(stats.Losses);
    totalWounded += numberFromReportValue(stats.Wounded);
    totalSurvivors += numberFromReportValue(stats.Survivors);
  });

  const totalDenominator = totalLosses + totalWounded + totalSurvivors;

  const troopDetails = {};
  Object.entries(kptData).forEach(([type, stats]) => {
    const marchSize = getMarchSize(stats);
    const losses = numberFromReportValue(stats.Losses);
    const wounded = numberFromReportValue(stats.Wounded);
    const survivors = numberFromReportValue(stats.Survivors);

    troopDetails[type] = {
      ...stats,
      LPT: stats.LPT ?? computeLPT(losses, wounded, survivors),
      calculatedMarchSize: marchSize,
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
      LPT: computeLPT(totalLosses, totalWounded, totalSurvivors, 3),
      totalMarchSize: totalDenominator,
    },
    troopDetails,
  };
};
