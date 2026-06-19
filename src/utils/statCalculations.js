import { calcs, getNumber } from "./calcs";

const COMMON_DAMAGE_KEYS = [
  "Troop Attack",
  "Troop Health",
  "Troop Defense",
  "Troop Damage",
  "Troop Damage Received",
  "Troop Attack Blessing",
  "Troop Protection Blessing",
];

const zeroDamageOutputs = () => ({
  "Final Archer Damage": "0.00000",
  "Final Cavalry Damage": "0.00000",
  "Final Siege Damage": "0.00000",
  "Average Damage": "0.00",
});

const roleDamageKeys = {
  archer: [
    "Archer Attack",
    "Archer Health",
    "Archer Defense",
    "Archer Damage",
    "Archer Damage Received",
    "Archer Attack Blessing",
    "Archer Protection Blessing",
    "Archer Atlantis",
  ],
  cavalry: [
    "Cavalry Attack",
    "Cavalry Health",
    "Cavalry Defense",
    "Cavalry Damage",
    "Cavalry Damage Received",
    "Cavalry Attack Blessing",
    "Cavalry Protection Blessing",
    "Cavalry Atlantis",
  ],
  siege: [
    "Siege Attack",
    "Siege Health",
    "Siege Defense",
    "Siege Damage",
    "Siege Damage Received",
    "Siege Attack Blessing",
    "Siege Protection Blessing",
    "Siege Atlantis",
  ],
};

const hasZeroValue = (player = {}, keys = []) =>
  keys.some((key) => getNumber(player[key]) === 0);

const shouldZeroRole = (player, role) =>
  hasZeroValue(player, COMMON_DAMAGE_KEYS) || hasZeroValue(player, roleDamageKeys[role]);

export const calculateStatOutputs = (player, currentWeights = {}) => {
  const weights = currentWeights || {};

  if (hasZeroValue(player, COMMON_DAMAGE_KEYS)) {
    return zeroDamageOutputs();
  }

  const archerAtlantis = player["Archer Atlantis"] || 0;
  const cavalryAtlantis = player["Cavalry Atlantis"] || 0;
  const siegeAtlantis = player["Siege Atlantis"] || 0;

  const archer = shouldZeroRole(player, "archer") ? 0 : getNumber(calcs(player, "archer", archerAtlantis, weights));
  const cavalry = shouldZeroRole(player, "cavalry") ? 0 : getNumber(calcs(player, "cavalry", cavalryAtlantis, weights));
  const siege = shouldZeroRole(player, "siege") ? 0 : getNumber(calcs(player, "siege", siegeAtlantis, weights));

  const finalArcher = archer;
  const finalCavalry = cavalry;
  const finalSiege = siege;
  const avgDamage = (finalArcher + finalCavalry)/2;

  return {
    "Final Archer Damage": finalArcher.toFixed(5),
    "Final Cavalry Damage": finalCavalry.toFixed(5),
    "Final Siege Damage": finalSiege.toFixed(5),
    "Average Damage": avgDamage.toFixed(2),
  };
};
