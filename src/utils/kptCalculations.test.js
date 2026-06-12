import {
  aggregateTroopTypeKpt,
  calculateEntryKPT,
  calculateEntryLPT,
  calculateGroupKPT,
  calculateGroupLPT,
  computeKPT,
  computeLPT,
  sumReportEntries,
} from "./kptCalculations";

describe("kptCalculations", () => {
  const reportData = {
    T10_archer: { Kills: "100", Losses: "10", Wounded: "15", Survivors: "75" },
    T9_archer: { Kills: "50", Losses: "5", Wounded: "5", Survivors: "40" },
    T10_cavalry: { Kills: "80", Losses: "8", Wounded: "12", Survivors: "60" },
    archerKPT: "1.00",
  };

  it("computes current KPT formula", () => {
    expect(computeKPT(100, 10, 15, 75)).toBe("0.75");
    expect(computeKPT(0, 0, 0, 0)).toBe("0.00");
    expect(computeKPT(100, 10, 15, 75, 3)).toBe("0.750");
  });

  it("computes LPT from losses, wounded, and survivors", () => {
    expect(computeLPT(10, 15, 75)).toBe("0.25");
    expect(computeLPT(0, 0, 0)).toBe("0.00");
    expect(computeLPT(10, 15, 75, 3)).toBe("0.250");
  });

  it("calculates row and group KPT/LPT without changing current KPT behavior", () => {
    expect(calculateEntryKPT(reportData.T10_archer)).toBe("0.75");
    expect(calculateEntryLPT(reportData.T10_archer)).toBe("0.25");
    expect(sumReportEntries(reportData, ["T10_archer", "T9_archer"])).toEqual({
      Kills: 150,
      Losses: 15,
      Wounded: 20,
      Survivors: 115,
    });
    expect(calculateGroupKPT(reportData, ["T10_archer", "T9_archer"])).toBe("0.77");
    expect(calculateGroupLPT(reportData, ["T10_archer", "T9_archer"])).toBe("0.23");
  });

  it("aggregates troop type KPT/LPT while ignoring derived report metadata", () => {
    expect(aggregateTroopTypeKpt([reportData])).toEqual({
      T10_archer: {
        Kills: 100,
        Losses: 10,
        Wounded: 15,
        Survivors: 75,
        KPT: "0.75",
        LPT: "0.25",
      },
      T9_archer: {
        Kills: 50,
        Losses: 5,
        Wounded: 5,
        Survivors: 40,
        KPT: "0.80",
        LPT: "0.20",
      },
      T10_cavalry: {
        Kills: 80,
        Losses: 8,
        Wounded: 12,
        Survivors: 60,
        KPT: "0.75",
        LPT: "0.25",
      },
    });
  });
});
