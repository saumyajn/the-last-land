export const getNumber = (val) => parseFloat(val?.toString().replace(/[^\d.]/g, "")) || 0;


export const calcs = (attributes, role, atlValue, weights) => {
  const w = weights || {
    attack: 1, health: 1, defense: 1,
    damage: 1, damageReceived: 1,
    attackBlessing: 1, protectBlessing: 1
  };

  // Apply weights to Troop Base Stats
  const atk = (getNumber(attributes["Troop Attack"]) * w.attack) +
    (getNumber(attributes["Troop Health"]) * w.health) +
    (getNumber(attributes["Troop Defense"]) * w.defense);

  const dmg = (getNumber(attributes["Troop Damage"]) * w.damage) +
    (getNumber(attributes["Troop Damage Received"]) * w.damageReceived);

  const bless = (getNumber(attributes["Troop Attack Blessing"]) * w.attackBlessing) +
    (getNumber(attributes["Troop Protection Blessing"]) * w.protectBlessing);

  let varAtk = 0, varDmg = 0, varBless = 0;

  if (role === "archer") {
    varAtk = (getNumber(attributes["Archer Attack"]) * w.attack) +
      (getNumber(attributes["Archer Health"]) * w.health) +
      (getNumber(attributes["Archer Defense"]) * w.defense);

    varDmg = (getNumber(attributes["Archer Damage"]) * w.damage) +
      (getNumber(attributes["Archer Damage Received"]) * w.damageReceived);

    varBless = (getNumber(attributes["Archer Attack Blessing"]) * w.attackBlessing) +
      (getNumber(attributes["Archer Protection Blessing"]) * w.protectBlessing);
  }
  else if (role === "cavalry") {
    varAtk = (getNumber(attributes["Cavalry Attack"]) * w.attack) +
      (getNumber(attributes["Cavalry Health"]) * w.health) +
      (getNumber(attributes["Cavalry Defense"]) * w.defense);

    varDmg = (getNumber(attributes["Cavalry Damage"]) * w.damage) +
      (getNumber(attributes["Cavalry Damage Received"]) * w.damageReceived);

    varBless = (getNumber(attributes["Cavalry Attack Blessing"]) * w.attackBlessing) +
      (getNumber(attributes["Cavalry Protection Blessing"]) * w.protectBlessing);
  }
  else if (role === "siege") {
    varAtk = (getNumber(attributes["Siege Attack"]) * w.attack) +
      (getNumber(attributes["Siege Health"]) * w.health) +
      (getNumber(attributes["Siege Defense"]) * w.defense);

    varDmg = (getNumber(attributes["Siege Damage"]) * w.damage) +
      (getNumber(attributes["Siege Damage Received"]) * w.damageReceived);

    varBless = (getNumber(attributes["Siege Attack Blessing"]) * w.attackBlessing) +
      (getNumber(attributes["Siege Protection Blessing"]) * w.protectBlessing);
  }

  const AtlData = getNumber(atlValue);
  const lethal = getNumber(attributes["Lethal Hit Rate"]);

  // Calculate Power Score
  const part1 = Math.pow(varAtk + atk, 0.95);
  const part2 = Math.pow(bless + varBless, 0.9);

  const part3 = (100 + dmg + varDmg + AtlData);

  const part4 = (part1 * part2 * part3);

  const powerScore = (part4 * (1 + (lethal / 100))) / 100000;
  return powerScore.toFixed(1);
}

// Helper to build copyable TSV content
export const buildCopyableTable = (names, localData, desiredKeys) => {
  const headers = ["Name", ...desiredKeys, "Archer Atlantis", "Cavalry Atlantis", "Final Archer Damage", "Final Cavalry Damage"];

  const rows = names.map((name) => {
    const rowData = localData[name];
    return [
      name,
      ...desiredKeys.map((key) => removePercentage(rowData[key]) ?? ""),
      removePercentage(rowData["Archer Atlantis"]) ?? "",
      removePercentage(rowData["Cavalry Atlantis"]) ?? "",
      removePercentage(rowData["Final Archer Damage"]) ?? "",
      removePercentage(rowData["Final Siege Damage"]) ?? "",
      removePercentage(rowData["Final Cavalry Damage"]) ?? ""
    ];
  });

  const tsvContent = [headers, ...rows]
    .map(row => row.join("\t"))
    .join("\n");

  return tsvContent;
};

// Utility to remove percentage symbol from string value
export const removePercentage = (value) => {
  if (typeof value === "string") {
    return value.replace(/%/g, "");
  }
  return value;
};
