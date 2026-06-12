import { calculateTroopTypeSummary } from "./troopSummaryCalculations";

describe("troopSummaryCalculations", () => {
  it("calculates current troop type summary and guard exception", () => {
    const summary = calculateTroopTypeSummary({
      T10_guards: {
        Kills: 100,
        Losses: 10,
        Wounded: 10,
        Survivors: 80,
        KPT: "0.80",
      },
      T10_archer: {
        Kills: 200,
        Losses: 20,
        Wounded: 30,
        Survivors: 150,
        KPT: "0.75",
      },
      T10_cavalry: {
        Kills: 100,
        Losses: 10,
        Wounded: 10,
        Survivors: 90,
        KPT: "0.82",
      },
    });

    expect(summary.totals).toEqual({
      Kills: 300,
      Losses: 30,
      Wounded: 40,
      Survivors: 240,
      KPT: "0.742",
      LPT: "0.226",
      totalMarchSize: 310,
    });

    expect(summary.troopDetails.T10_guards).toMatchObject({
      calculatedMarchSize: 0,
      marchPercentage: "0.00%",
    });
    expect(summary.troopDetails.T10_archer).toMatchObject({
      LPT: "0.25",
      calculatedMarchSize: 270,
      marchPercentage: "86.96%",
    });
  });
});
