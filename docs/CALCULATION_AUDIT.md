# Calculation Audit

This audit documents the current app formulas and compares them against what can be verified without changing production data or game logic.

Game context:

- App target: Last Land: Empire Builder, developed by LEME GAMES.
- Public listing cross-check: Apple's current listing uses the title `Last Land: Empire War` and lists the developer as `LEME TECHNOLOGY CO., LIMITED`.
- Source: https://apps.apple.com/us/app/last-land-empire-war/id1446265584

## Verification Summary

I did not find an official Last Land: Empire Builder developer formula source for tower/throne troop distribution, damage score, or KPT. A public community formation builder for a closely related LEME-style game ecosystem confirms that formation analysis commonly uses troop capacity, troop type, troop tier, hero assignments, faction synergy, and tier stats such as Power, ATK, DEF, and HP, but it does not publish the exact formulas used by this app and should not be treated as official Last Land validation.

Reference:

- TheLastGuide Formation Builder: https://last-guide.com/tools/formation-builder/

Result:

- The app formulas should be treated as custom alliance analytics formulas until checked against sanitized in-game examples.
- I did not change formulas in this pass.
- I made formation tier values editable so real users can override calculated values when the game data disagrees with the planner.

## Formula Line Map

Use this map to jump straight to the implementation before changing any calculation.

| Area | Formula / behavior | Exact source lines |
| --- | --- | --- |
| Numeric parsing | Strips all non-digits and dots, so negative signs are removed | `src/utils/calcs.js:1` |
| Stat damage score | Base troop stats, role stats, blessings, Atlantis, lethal multiplier, final `powerScore` | `src/utils/calcs.js:4-70` |
| Shared stat outputs | Final Archer/Cavalry/Siege damage, multiplier, ratio-weighted Average Damage | `src/utils/statCalculations.js:4-30` |
| Upload stat outputs | Stats upload path calls the shared helper before saving to Firestore | `src/components/stats/StatsPage.jsx:105-106` |
| Table stat outputs | DataTable edit/settings path calls the same shared helper | `src/components/stats/DataTable.jsx:96-98` |
| Shared KPT formula | `KPT = Kills / (Losses + Wounded + Survivors)` | `src/utils/kptCalculations.js` |
| Shared LPT formula | `LPT = (Losses + Wounded) / (Losses + Wounded + Survivors)` | `src/utils/kptCalculations.js` |
| Report row KPT/LPT display | Uses shared row KPT/LPT helpers | `src/components/report/ReportResults.jsx` |
| Report group KPT/LPT display | Uses shared group KPT/LPT helpers | `src/components/report/ReportResults.jsx` |
| Report edit KPT/LPT save | Uses shared row/group KPT/LPT helpers before Firestore save | `src/components/report/ReportPage.jsx` |
| Global troop KPT/LPT | Aggregates report docs through shared helper and writes `analytics/troop_type_kpt` | `src/utils/dbActions.js` |
| Shared troop summary | `calculatedMarchSize = Losses + Wounded + Survivors`, march percentage | `src/utils/troopSummaryCalculations.js:3-48` |
| Analytics summary write/display | Uses shared troop summary helper | `src/components/analytics/AnalyticsPage.jsx:40-48`, `src/components/analytics/AnalyticsPage.jsx:73-75` |
| Export TSV output | Header and row both include Final Archer, Final Siege, Final Cavalry damage | `src/utils/calcs.js:74-87` |
| Formation damage troops | `damage_troops = total - guards` | `src/components/formation/FormationForm.jsx:34-48` |
| Formation load distribution | `totalDamage`, share, troop allocation, tier values, `marchSize`, row total | `src/components/formation/FormationTable.jsx:64-119` |
| Formation count recalculation | Recalculates troop allocation and tier values when count changes | `src/components/formation/FormationTable.jsx:181-198` |
| Manual formation tier edits | Updates editable Archer/Cavalry tier values and recalculates `marchSize` | `src/components/formation/FormationTable.jsx:205-222` |

## Real Stat Fixture: Lord Info Screenshot 2026-06-06

The user provided a real Lord Info stat screenshot from Last Land: Empire Builder. This is stat-page evidence, not a battle report and not a tower/throne formation output.

Sanitized metadata:

- Castle level: 30
- Lord level: 50
- Power: approximately 941,515,180
- Kingdom: 60
- Player and alliance identity omitted from repo fixtures.

Visible app-supported stat values:

```text
Cavalry Attack: 2143%
Cavalry Health: 1348%
Cavalry Defense: 933%
Cavalry Damage: 197.75%
Cavalry Damage Received: -160.5%
Cavalry Attack Blessing: 588%
Cavalry Protection Blessing: 420%

Archer Attack: 2528.7%
Archer Health: 1527%
Archer Defense: 1320.7%
Archer Damage: 201.5%
Archer Damage Received: -175%
Archer Attack Blessing: 621%
Archer Protection Blessing: 376%

Siege Attack: 1638.35%
Siege Health: 931%
Siege Defense: 1326.5%
Siege Damage: 160%
Siege Damage Received: -160.5%
Siege Attack Blessing: 331%
Siege Protection Blessing: 159%

Troop Attack: 303.35%
Troop Health: 228.85%
Troop Defense: 296.85%
Troop Damage: 43.75%
Troop Damage Received: -43.75%
Troop Attack Blessing: 600%
Troop Protection Blessing: 473.08%
Lethal Hit Rate: 24%
```

Visible fields not currently parsed by the app:

```text
Infantry Damage: 186.5%
Infantry Damage Received: -196.5%
Infantry Attack Blessing: 234%
Infantry Protection Blessing: 700%
Revive: 26%
```

Current parser behavior captured by fixture:

- `src/testFixtures/lastLandFixtures.js` includes this screenshot as `real-lord-info-2026-06-06-visible-stat-page`.
- `parseData.js` currently captures positive numeric values only. Negative values such as `-175%` are parsed as `175%`.
- `calcs.js` also strips signs through `getNumber`, so negative Damage Received values are scored as positive values today.
- I did not change this behavior because it would alter real rankings and saved outputs.

Current raw `calcs()` outputs for this real stat fixture with `0%` Atlantis values:

```text
Raw Archer Damage Score: 27053.5
Raw Cavalry Damage Score: 22452.6
Raw Siege Damage Score: 14606.3
```

Current saved stat outputs with default multiplier `1.5` and default `0.5 / 0.5` Archer/Cavalry ratios:

```text
Final Archer Damage: 40580.25000
Final Cavalry Damage: 33678.90000
Final Siege Damage: 21909.45000
Average Damage: 37129.57
```

Decision needed before any formula change:

- If Last Land intends negative Damage Received to reduce incoming damage, the app may be overstating damage-related score inputs by treating those signs as positive.
- Before changing it, collect 2-3 more real Lord Info screenshots and agree on expected before/after outputs with the real users.

## Current Formula Inventory

### Stat Damage Score

Location:

- `src/utils/calcs.js:4-70`
- Used by `src/utils/statCalculations.js:14-16`
- Shared final output helper: `src/utils/statCalculations.js:4-30`
- Upload path: `src/components/stats/StatsPage.jsx:105-106`
- Table path: `src/components/stats/DataTable.jsx:96-98`

Current formula:

```text
baseAtk = Troop Attack + Troop Health + Troop Defense, with configurable weights
baseDmg = Troop Damage + Troop Damage Received, with configurable weights
baseBless = Troop Attack Blessing + Troop Protection Blessing, with configurable weights

roleAtk = role Attack + role Health + role Defense, with configurable weights
roleDmg = role Damage + role Damage Received, with configurable weights
roleBless = role Attack Blessing + role Protection Blessing, with configurable weights

powerScore =
  ((roleAtk + baseAtk) ^ 0.95)
  * ((baseBless + roleBless) ^ 0.9)
  * (100 + baseDmg + roleDmg + Atlantis)
  * (1 + Lethal Hit Rate / 100)
  / 100000
```

Status:

- Current behavior is covered by characterization tests.
- Not verified against an official game formula.
- Public formation tooling for the game family references troop tier stats and formation synergy, while this formula is a custom weighted score. That does not make it wrong, but it means it is not confirmed as the game engine's combat formula.

Risk:

- Changing this formula would change saved final damage values and all downstream rankings/charts.

Needed evidence:

- Sanitized player stat screenshot.
- Expected in-game or manually trusted final damage result.
- A small fixture mapping OCR stats to expected score.

### Average Damage

Locations:

- `src/utils/statCalculations.js:18-28`
- Called by `src/components/stats/StatsPage.jsx:105-106`
- Called by `src/components/stats/DataTable.jsx:96-98`

Current formulas:

```text
Average Damage =
  Final Archer Damage * archerRatio
  + Final Cavalry Damage * cavalryRatio
```

Status:

- Resolved in the latest pass.
- `StatsPage` no longer has its own simple-average formula.
- Upload, edit, and settings recalculation now use `calculateStatOutputs`.

Risk:

- This changed new upload behavior: newly uploaded stats now save the same multiplier and ratio-weighted fields that the table recalculates.
- Existing Firestore stats will not be rewritten until edited, uploaded again, or recalculated from the settings dialog.

Recommendation:

- Keep `calculateStatOutputs` as the only source of truth for stat output fields.
- Do not reintroduce direct `Average Damage` formulas in UI components.

### KPT Per Troop Type

Locations:

- Shared formula: `src/utils/kptCalculations.js:5-9`
- Row helper: `src/utils/kptCalculations.js:25-31`
- Group helper: `src/utils/kptCalculations.js:33-36`
- Troop type aggregation helper: `src/utils/kptCalculations.js:38-66`
- Report display caller: `src/components/report/ReportResults.jsx:60`, `src/components/report/ReportResults.jsx:67-69`
- Report edit/save caller: `src/components/report/ReportPage.jsx:320-322`
- Analytics summary caller: `src/components/analytics/AnalyticsSummary.jsx:67-68`

Current formula:

```text
denominator = Losses + Wounded + Survivors
KPT = Kills / denominator
```

Status:

- Centralized in `src/utils/kptCalculations.js`.
- Current behavior is covered by characterization tests.
- Not verified as an official Last Land metric.
- Likely a custom efficiency metric rather than a game-provided formula.

Risk:

- Used by analytics summary, charts, and exports.

Needed evidence:

- Battle report examples where alliance leadership agrees on expected KPT.

### Troop Type Summary

Locations:

- Shared summary helper: `src/utils/troopSummaryCalculations.js:3-48`
- Firestore update caller: `src/utils/dbActions.js:54-59`
- Analytics page write caller: `src/components/analytics/AnalyticsPage.jsx:40-48`
- Analytics page display caller: `src/components/analytics/AnalyticsPage.jsx:73-75`, `src/components/analytics/AnalyticsPage.jsx:104-119`

Current formula:

```text
totalDenominator = totalLosses + totalWounded + totalSurvivors

for each troop type:
  calculatedMarchSize = Losses + Wounded + Survivors
  marchPercentage = calculatedMarchSize / totalDenominator
```

Status:

- Centralized in `src/utils/troopSummaryCalculations.js`.
- Current behavior is covered by characterization tests.

Risk:

- `AnalyticsPage` and `updateTroopTypeKpt` can both write `analytics/troop_type_summary`.

Recommendation:

- Keep `calculateTroopTypeSummary` as the only source of truth.
- Compare the denominator-based march-size output with sanitized real report fixtures before changing this summary again.

### Tower / Throne Formation

Locations:

- `src/components/formation/FormationForm.jsx:34-48`
- `src/components/formation/FormationTable.jsx:64-119`
- `src/components/formation/FormationTable.jsx:181-198`
- `src/components/formation/FormationTable.jsx:205-222`

Current formulas:

```text
damage_troops = total - guards

totalDamage = sum(avgDamage * count)

For each group:
  share = groupAvgDamage / totalDamage
  troops = damage_troops * share

Tier values:
  at10 = roundToNearestHalf((troops * archerT10Percent / 100) / 1000)
  at9  = roundToNearestHalf((troops * archerT9Percent  / 100) / 1000)
  at8  = roundToNearestHalf((troops * archerT8Percent  / 100) / 1000)
  at7  = roundToNearestHalf((troops * archerT7Percent  / 100) / 1000)
  ct10 = roundToNearestHalf((troops * cavalryT10Percent / 100) / 1000)
  ct9  = roundToNearestHalf((troops * cavalryT9Percent  / 100) / 1000)
  ct8  = roundToNearestHalf((troops * cavalryT8Percent  / 100) / 1000)
  ct7  = roundToNearestHalf((troops * cavalryT7Percent  / 100) / 1000)

marchSize = at10 + at9 + at8 + at7 + ct10 + ct9 + ct8 + ct7
total = troops * count
```

Status:

- This appears to be an alliance distribution planner, not a complete game formation power calculator.
- Public community tooling references troop capacity, heroes, factions, troop type/tier, and tier stats. The current app formula does not use hero assignments, faction synergy, troop tier Power, ATK, DEF, or HP.

What changed in this pass:

- Archer and Cavalry T10/T9/T8/T7 values are now editable in the formation tables.
- Saved manual values are preserved on reload.
- Count changes still recalculate tier values from the existing formula.

Risk:

- If the game's real formation math depends on hero/tier stat tables, this app's formation formula is incomplete for exact game combat prediction.

Needed evidence:

- Sanitized tower and throne examples from the game.
- Inputs: total troops, guards, tier percentages, average damage groups, counts.
- Expected outputs: in-game archer/cavalry tier values or a trusted manually calculated table.

## Inconsistency Audit

Resolved in this pass:

- Average Damage is now centralized in `src/utils/statCalculations.js:4-30`.
- `StatsPage` no longer uses a separate simple-average formula.
- `DataTable` no longer owns a separate stat output formula.
- Export TSV header/body now both include `Final Siege Damage`.
- KPT formula and troop aggregation are centralized in `src/utils/kptCalculations.js`.
- Troop type march summary is centralized in `src/utils/troopSummaryCalculations.js`.

Remaining inconsistencies to review:

1. Formation troop share may be underweighting group count.
   - Source: `src/components/formation/FormationTable.jsx:78-88`
   - Current denominator is `sum(avgDamage * count)`, but row share uses `avgDamage / totalDamage`.
   - If count is meant to affect allocation share, numerator may need `avgDamage * count`.
   - Do not change without real tower/throne examples because this would alter user-facing formation allocations.

2. Report group KPT includes `T6_archer`, but the current troop order does not.
   - Display source: `src/components/report/ReportResults.jsx:21`
   - Edit/save source: `src/components/report/ReportPage.jsx:321`
   - Current troop order: `src/utils/appConstants.js:36-49`
   - This is probably harmless when the key is absent, but it is a code smell.

## Highest Priority Formula Follow-Ups

1. Add fixture tests for `FormationTable` calculations.
2. Add sanitized battle report fixtures with expected KPT and summary outputs.
3. Decide whether `T6_archer` should remain in report group KPT keys.
4. Compare formation output with real in-game tower/throne examples before changing allocation formulas.
