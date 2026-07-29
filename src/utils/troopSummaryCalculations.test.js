import { calculateTroopTypeSummary } from "./troopSummaryCalculations";

describe("troopSummaryCalculations", () => {
  it("calculates march size from losses, wounded, and survivors", () => {
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
      Kills: 400,
      Losses: 40,
      Wounded: 50,
      Survivors: 320,
      KPT: "0.976",
      LPT: "0.220",
      totalMarchSize: 410,
    });

    expect(summary.troopDetails.T10_guards).toMatchObject({
      calculatedMarchSize: 100,
      marchPercentage: "24.39%",
    });
    expect(summary.troopDetails.T10_archer).toMatchObject({
      LPT: "0.25",
      calculatedMarchSize: 200,
      marchPercentage: "48.78%",
    });
  });
});
