import { buildCopyableTable, calculateRoleOutputs, calcs, getNumber, removePercentage } from "./calcs";
import { calculateStatOutputs } from "./statCalculations";

describe("calcs", () => {
  const baseAttributes = {
    "Troop Attack": "100%",
    "Troop Health": "50%",
    "Troop Defense": "25%",
    "Troop Damage": "10%",
    "Troop Damage Received": "5%",
    "Troop Attack Blessing": "2%",
    "Troop Protection Blessing": "3%",
    "Archer Attack": "80%",
    "Archer Health": "40%",
    "Archer Defense": "20%",
    "Archer Damage": "8%",
    "Archer Damage Received": "4%",
    "Archer Attack Blessing": "1%",
    "Archer Protection Blessing": "1%",
    "Cavalry Attack": "70%",
    "Cavalry Health": "30%",
    "Cavalry Defense": "10%",
    "Cavalry Damage": "6%",
    "Cavalry Damage Received": "3%",
    "Cavalry Attack Blessing": "1%",
    "Cavalry Protection Blessing": "2%",
    "Siege Attack": "60%",
    "Siege Health": "20%",
    "Siege Defense": "10%",
    "Siege Damage": "5%",
    "Siege Damage Received": "2%",
    "Siege Attack Blessing": "1%",
    "Siege Protection Blessing": "1%",
    "Lethal Hit Rate": "20%",
  };
  const fullWeights = {
    archerAttack: 1000,
    archerHealth: 1000,
    archerDefense: 1000,
    cavalryAttack: 1000,
    cavalryHealth: 1000,
    cavalryDefense: 1000,
    siegeAttack: 1000,
    siegeHealth: 1000,
    siegeDefense: 1000,
    archerRatio: 1,
    cavalryRatio: 1,
    siegeRatio: 1,
  };

  it("returns only the configured role strength value", () => {
    const strength = calculateRoleOutputs(baseAttributes, "archer", "10%", {
      archerAttack: 1000,
      archerHealth: 2000,
      archerDefense: 3000,
      archerRatio: 1,
    });

    expect(strength).toBeCloseTo(41.17208);
    expect(calcs(baseAttributes, "archer", "10%", {
      archerAttack: 1000,
      archerHealth: 2000,
      archerDefense: 3000,
      archerRatio: 1,
    })).toBe("41.17");
  });

  it("keeps current numeric parsing behavior for formatted values", () => {
    expect(getNumber("1,234.50%")).toBe(1234.5);
    expect(getNumber("NA")).toBe(0);
    expect(getNumber(undefined)).toBe(0);
  });

  it("calculates final damage and average damage from one shared helper", () => {
    expect(
      calculateStatOutputs({
        ...baseAttributes,
        "Archer Atlantis": "10%",
        "Cavalry Atlantis": "10%",
        "Siege Atlantis": "10%",
      }, {
        archerAttack: 1,
        archerHealth: 1,
        archerDefense: 1,
        cavalryAttack: 1,
        cavalryHealth: 1,
        cavalryDefense: 1,
        siegettack: 1,
        siegeHealth: 1,
        siegeDefense: 1,
        archerRatio: 0.25,
        cavalryRatio: 0.5,
        siegeRatio: 0.25,
      }),
    ).toEqual({
      "Final Archer Damage": "0.00000",
      "Final Cavalry Damage": "0.01000",
      "Final Siege Damage": "0.00000",
      "Average Damage": "0.01",
    });
  });

  it("returns zero final values when any common damage input is zero", () => {
    expect(
      calculateStatOutputs({
        ...baseAttributes,
        "Troop Attack": "0%",
        "Archer Atlantis": "10%",
        "Cavalry Atlantis": "10%",
        "Siege Atlantis": "10%",
      }, fullWeights),
    ).toEqual({
      "Final Archer Damage": "0.00000",
      "Final Cavalry Damage": "0.00000",
      "Final Siege Damage": "0.00000",
      "Average Damage": "0.00",
    });
  });

  it("zeros only the corresponding final value when a role Atlantis value is zero", () => {
    const output = calculateStatOutputs({
      ...baseAttributes,
      "Archer Atlantis": "0%",
      "Cavalry Atlantis": "10%",
      "Siege Atlantis": "10%",
    }, fullWeights);

    expect(output["Final Archer Damage"]).toBe("0.00000");
    expect(parseFloat(output["Final Cavalry Damage"])).toBeGreaterThan(0);
    expect(parseFloat(output["Final Siege Damage"])).toBeGreaterThan(0);
    expect(parseFloat(output["Average Damage"])).toBeGreaterThan(0);
  });
});

describe("export table helpers", () => {
  it("preserves current percentage stripping behavior", () => {
    expect(removePercentage("12.5%")).toBe("12.5");
    expect(removePercentage(12.5)).toBe(12.5);
  });

  it("preserves current TSV generation shape", () => {
    const tsv = buildCopyableTable(
      ["Player One"],
      {
        "Player One": {
          "Troop Attack": "100%",
          "Archer Atlantis": "1%",
          "Cavalry Atlantis": "2%",
          "Final Archer Damage": "3%",
          "Final Siege Damage": "4%",
          "Final Cavalry Damage": "5%",
        },
      },
      ["Troop Attack"],
    );

    expect(tsv).toBe([
      "Name\tTroop Attack\tArcher Atlantis\tCavalry Atlantis\tFinal Archer Damage\tFinal Siege Damage\tFinal Cavalry Damage",
      "Player One\t100\t1\t2\t3\t4\t5",
    ].join("\n"));
  });
});
