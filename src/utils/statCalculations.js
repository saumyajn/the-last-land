import { calcs, getNumber } from "./calcs";

export const calculateStatOutputs = (player, currentWeights = {}) => {
  const weights = currentWeights || {};

  const archerAtlantis = player["Archer Atlantis"] || 0;
  const cavalryAtlantis = player["Cavalry Atlantis"] || 0;
  const siegeAtlantis = player["Siege Atlantis"] || 0;

  const archer = getNumber(calcs(player, "archer", archerAtlantis, weights));
  const cavalry = getNumber(calcs(player, "cavalry", cavalryAtlantis, weights));
  const siege = getNumber(calcs(player, "siege", siegeAtlantis, weights));

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
