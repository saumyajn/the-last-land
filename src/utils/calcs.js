export const getNumber = (val) => parseFloat(val?.toString().replace(/[^\d.]/g, "")) || 0;

const roleConfigs = {
  archer: {
    label: "Archer",
    attackBase: "archerAttack",
    healthBase: "archerHealth",
    defenseBase: "archerDefense",
    ratio: "archerRatio"

  },
  cavalry: {
    label: "Cavalry",
    attackBase: "cavalryAttack",
    healthBase: "cavalryHealth",
    defenseBase: "cavalryDefense",
    ratio: "cavalryRatio"
  },
  siege: {
    label: "Siege",
    attackBase: ["siegeAttack", "siegettack"],
    healthBase: "siegeHealth",
    defenseBase: "siegeDefense",
    ratio: "siegeRatio"
  },
};

const multiplier = (value) => 1 + getNumber(value) / 100;

const getConfiguredBase = (weights, keyOrKeys) => {
  const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
  const foundKey = keys.find((key) => weights?.[key] !== undefined && weights?.[key] !== "");

  if (!foundKey) return 0;
  return getNumber(weights[foundKey]);
};

export const calculateRoleOutputs = (attributes, role, atlValue, weights = {}) => {
  const config = roleConfigs[role];
  if (!config) {
    return 0;
  }

  const troopAttack = getNumber(attributes["Troop Attack"]);
  const troopHealth = getNumber(attributes["Troop Health"]);
  const troopDefense = getNumber(attributes["Troop Defense"]);
  const troopDamage = getNumber(attributes["Troop Damage"]);
  const troopDamageReceived = getNumber(attributes["Troop Damage Received"]);
  const troopAttackBlessing = getNumber(attributes["Troop Attack Blessing"]);
  const troopProtectionBlessing = getNumber(attributes["Troop Protection Blessing"]);
  const atlantis = getNumber(atlValue);

  const { label } = config;
  const roleAttack = getNumber(attributes[`${label} Attack`]);
  const roleHealth = getNumber(attributes[`${label} Health`]);
  const roleDefense = getNumber(attributes[`${label} Defense`]);
  const roleDamage = getNumber(attributes[`${label} Damage`]);
  const roleDamageReceived = getNumber(attributes[`${label} Damage Received`]);
  const roleAttackBlessing = getNumber(attributes[`${label} Attack Blessing`]);
  const roleProtectionBlessing = getNumber(attributes[`${label} Protection Blessing`]);

  const attack =
    getConfiguredBase(weights, config.attackBase) *
    multiplier(roleAttack + troopAttack) *
    multiplier(roleAttackBlessing + troopAttackBlessing) *
    multiplier(roleDamage + troopDamage + atlantis) *
    getConfiguredBase(weights, config.ratio);

  const health =
    getConfiguredBase(weights, config.healthBase) *
    multiplier(roleHealth + troopHealth) *
    multiplier(roleProtectionBlessing + troopProtectionBlessing) *
    multiplier(roleDamageReceived + troopDamageReceived) *
    getConfiguredBase(weights, config.ratio);

  const defense =
    getConfiguredBase(weights, config.defenseBase) *
    multiplier(roleDefense + troopDefense) *
    multiplier(roleProtectionBlessing + troopProtectionBlessing) *
    getConfiguredBase(weights, config.ratio);

  return (attack + (health * 4.5) + (defense * 4)) / 1000;
};

export const calcs = (attributes, role, atlValue, weights) => {
  return calculateRoleOutputs(attributes, role, atlValue, weights).toFixed(2);
};

// Helper to build copyable TSV content
export const buildCopyableTable = (names, localData, desiredKeys) => {
  const headers = ["Name", ...desiredKeys, "Archer Atlantis", "Cavalry Atlantis", "Final Archer Damage", "Final Siege Damage", "Final Cavalry Damage"];

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
