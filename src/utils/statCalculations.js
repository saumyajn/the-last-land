import { DEFAULT_STAT_WEIGHTS } from "./appConstants";
import { calcs, getNumber } from "./calcs";

export const calculateStatOutputs = (player, currentWeights = {}) => {
  const weights = {
    ...DEFAULT_STAT_WEIGHTS,
    ...currentWeights,
  };

  const archerAtlantis = player["Archer Atlantis"] || 0;
  const cavalryAtlantis = player["Cavalry Atlantis"] || 0;
  const siegeAtlantis = player["Siege Atlantis"] || 0;

  const archer = getNumber(calcs(player, "archer", archerAtlantis, weights));
  const cavalry = getNumber(calcs(player, "cavalry", cavalryAtlantis, weights));
  const siege = getNumber(calcs(player, "siege", siegeAtlantis, weights));

  const finalArcher = archer * weights.multiplier;
  const finalCavalry = cavalry * weights.multiplier;
  const finalSiege = siege * weights.multiplier;
  const avgDamage =
    finalArcher * weights.archerRatio + finalCavalry * weights.cavalryRatio;

  return {
    "Final Archer Damage": finalArcher.toFixed(5),
    "Final Cavalry Damage": finalCavalry.toFixed(5),
    "Final Siege Damage": finalSiege.toFixed(5),
    "Average Damage": avgDamage.toFixed(2),
  };
};
