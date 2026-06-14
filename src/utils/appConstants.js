export const STAT_WEIGHT_KEYS = [
  "archerAttack",
  "archerHealth",
  "archerDefense",
  "cavalryAttack",
  "cavalryHealth",
  "cavalryDefense",
  "siegeAttack",
  "siegeHealth",
  "siegeDefense",
  "archerRatio",
  "cavalryRatio",
  "siegeRatio",
];

export const normalizeStatWeights = (weights = {}) =>
  STAT_WEIGHT_KEYS.reduce((acc, key) => {
    acc[key] = weights[key] ?? "";
    return acc;
  }, {});

export const DEFAULT_STAT_WEIGHTS = normalizeStatWeights();

export const DESIRED_STAT_KEYS = [
  "Troop Attack",
  "Troop Health",
  "Troop Defense",
  "Troop Damage",
  "Troop Damage Received",
  "Troop Attack Blessing",
  "Troop Protection Blessing",
  "Archer Attack",
  "Archer Health",
  "Archer Defense",
  "Archer Damage",
  "Archer Damage Received",
  "Archer Attack Blessing",
  "Archer Protection Blessing",
  "Cavalry Attack",
  "Cavalry Health",
  "Cavalry Defense",
  "Cavalry Damage",
  "Cavalry Damage Received",
  "Cavalry Attack Blessing",
  "Cavalry Protection Blessing",
  "Siege Attack",
  "Siege Health",
  "Siege Defense",
  "Siege Damage",
  "Siege Damage Received",
  "Siege Attack Blessing",
  "Siege Protection Blessing",
  "Lethal Hit Rate",
];

export const REPORT_LABELS = ["Kills", "Losses", "Wounded", "Survivors"];

export const TROOP_ORDER = [
  "T10_guards",
  "T10_cavalry",
  "T10_archer",
  "T10_siege",
  "T9_cavalry",
  "T9_archer",
  "T8_cavalry",
  "T8_archer",
  "T8_siege",
  "T7_cavalry",
  "T7_archer",
];
