import { buildCopyableTable, calcs, getNumber, removePercentage } from "./calcs";
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

  it("preserves the current archer power score formula output", () => {
    expect(calcs(baseAttributes, "archer", "10%")).toBe("2.2");
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
      }, {
        attack: 1,
        health: 1,
        defense: 1,
        damage: 1,
        damageReceived: 1,
        attackBlessing: 1,
        protectBlessing: 1,
        archerRatio: 0.25,
        cavalryRatio: 0.75,
        multiplier: 2,
      }),
    ).toEqual({
      "Final Archer Damage": "4.40000",
      "Final Cavalry Damage": "4.20000",
      "Final Siege Damage": "3.40000",
      "Average Damage": "4.25",
    });
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
