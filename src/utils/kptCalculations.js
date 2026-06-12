export const REPORT_META_KEYS = new Set([
  "archerKPT",
  "cavalryKPT",
  "siegeKPT",
  "archerLPT",
  "cavalryLPT",
  "siegeLPT",
]);

export const numberFromReportValue = (value) => parseInt(value || 0);

export const computeKPT = (kills, losses, wounded, survivors, decimals = 2) => {
  const denominator = losses + wounded + survivors;
  if (denominator === 0) return Number(0).toFixed(decimals);
  return (kills / denominator).toFixed(decimals);
};

export const computeLPT = (losses, wounded, survivors, decimals = 2) => {
  const denominator = losses + wounded + survivors;
  if (denominator === 0) return Number(0).toFixed(decimals);
  return ((losses + wounded) / denominator).toFixed(decimals);
};

export const sumReportEntries = (reportData = {}, keys = []) => {
  return keys.reduce(
    (totals, key) => {
      const entry = reportData[key] || {};
      totals.Kills += numberFromReportValue(entry.Kills);
      totals.Losses += numberFromReportValue(entry.Losses);
      totals.Wounded += numberFromReportValue(entry.Wounded);
      totals.Survivors += numberFromReportValue(entry.Survivors);
      return totals;
    },
    { Kills: 0, Losses: 0, Wounded: 0, Survivors: 0 },
  );
};

export const calculateEntryKPT = (entry = {}) =>
  computeKPT(
    numberFromReportValue(entry.Kills),
    numberFromReportValue(entry.Losses),
    numberFromReportValue(entry.Wounded),
    numberFromReportValue(entry.Survivors),
  );

export const calculateEntryLPT = (entry = {}) =>
  computeLPT(
    numberFromReportValue(entry.Losses),
    numberFromReportValue(entry.Wounded),
    numberFromReportValue(entry.Survivors),
  );

export const calculateGroupKPT = (reportData = {}, keys = []) => {
  const totals = sumReportEntries(reportData, keys);
  return computeKPT(totals.Kills, totals.Losses, totals.Wounded, totals.Survivors);
};

export const calculateGroupLPT = (reportData = {}, keys = []) => {
  const totals = sumReportEntries(reportData, keys);
  return computeLPT(totals.Losses, totals.Wounded, totals.Survivors);
};

export const aggregateTroopTypeKpt = (reports = []) => {
  const aggregation = {};

  reports.forEach((reportData = {}) => {
    Object.entries(reportData).forEach(([troopType, stats]) => {
      if (REPORT_META_KEYS.has(troopType)) return;
      if (!stats || typeof stats !== "object") return;

      if (!aggregation[troopType]) {
        aggregation[troopType] = { Kills: 0, Losses: 0, Wounded: 0, Survivors: 0 };
      }

      aggregation[troopType].Kills += numberFromReportValue(stats.Kills);
      aggregation[troopType].Losses += numberFromReportValue(stats.Losses);
      aggregation[troopType].Wounded += numberFromReportValue(stats.Wounded);
      aggregation[troopType].Survivors += numberFromReportValue(stats.Survivors);
    });
  });

  return Object.fromEntries(
    Object.entries(aggregation).map(([type, totals]) => [
      type,
      {
        ...totals,
        KPT: computeKPT(totals.Kills, totals.Losses, totals.Wounded, totals.Survivors),
        LPT: computeLPT(totals.Losses, totals.Wounded, totals.Survivors),
      },
    ]),
  );
};
