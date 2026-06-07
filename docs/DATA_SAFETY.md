# Data Safety

This project uses real workflow data. Production hardening must not accidentally change existing data meaning.

## Non-Negotiable Rule

Do not change logic, math, parsing, Firebase collection shape, or export output unless the change is explicitly approved and covered by regression tests.

## Protected Behavior

Protected behavior includes:

- `parseData` matching order and next-line value behavior.
- `calcs` power score formula and rounding.
- KPT aggregation in `updateTroopTypeKpt`.
- Report extraction OCR cleanup.
- OpenCV template matching threshold and scaling behavior.
- Firestore collection names and document shapes.
- Export TSV column and row output.

## Firestore Contract

Treat these collection names and shapes as production-sensitive until verified against a sanitized export.

### `stats`

- Document id: player name.
- Observed fields: parsed stat keys such as `Troop Attack`, `Archer Attack`, `Cavalry Damage`, `Lethal Hit Rate`.
- Derived fields: `Archer Atlantis`, `Cavalry Atlantis`, `Siege Atlantis`, `Final Archer Damage`, `Final Cavalry Damage`, `Final Siege Damage`, `Average Damage`.

### `reports`

- Document id: player name.
- Observed troop fields: `T10_guards`, `T10_cavalry`, `T10_archer`, `T10_siege`, `T9_cavalry`, `T9_archer`, `T8_cavalry`, `T8_archer`, `T8_siege`, `T7_cavalry`, `T7_archer`.
- Troop field shape:

```json
{
  "Kills": "0",
  "Losses": "0",
  "Wounded": "0",
  "Survivors": "0"
}
```

- Derived fields: `archerKPT`, `cavalryKPT`.

### `analytics`

- Observed document ids: `troop_type_kpt`, `troop_type_summary`, `archer_final`, `cavalry_final`.
- `troop_type_summary` stores `totals`, `troopDetails`, and `updatedAt`.
- Risk: `AnalyticsPage` and `updateTroopTypeKpt` both write `troop_type_summary`.

### `formation`

- Document id: formation label.
- Rows may include `avgDamage`, `count`, `troops`, `at10`, `at9`, `at8`, `at7`, `ct10`, `ct9`, `ct8`, `ct7`, `marchSize`, and `total`.
- Archer and cavalry tier values are editable and should be treated as user-adjustable saved values.

### `settings`

- Observed document ids: `statWeights`, `thresholds`, and formation settings documents.
- Settings directly affect calculator display, conditional formatting, and formation distribution.

## Admin Security

Current behavior uses Firebase Auth plus synchronized admin email allowlists.

Current allowlist locations:

- `src/utils/config.js`
- `functions/main.py`

Current risks:

- Frontend and backend admin lists can drift.
- Client-side admin checks help UX, but Firestore rules must still protect data.
- Email allowlists are harder to audit than custom claims or role documents.

Recommended migration:

1. Capture current Firebase Auth providers, Firestore rules, and function deploy settings.
2. Add Firebase custom claims or a Firestore role document in parallel.
3. Read the new role source without changing writes.
4. Update Firestore rules after real admins are verified.
5. Retire email lists only after old and new checks agree.

Do not change admin behavior until existing admins, rules, OCR auth, and rollback are verified.

## Fixture Dataset

Sanitized fixtures live in `src/testFixtures/lastLandFixtures.js`.

Current fixture coverage:

- `statOcrFixtures`: synthetic OCR text plus one sanitized real Lord Info stat-page text fixture.
- `reportOcrCleanupFixtures`: synthetic OCR text shaped like a cropped battle report row.
- Current negative-value parsing behavior: values such as `-175%` are captured as `175%`.

Not yet covered:

- Real screenshot image fixtures.
- OpenCV template matching confidence.
- Firestore aggregation from live report documents.
- Analytics summary document shapes.
- Export-to-Google-Sheets end-to-end behavior.
- Real battle report OCR fixtures.

Safe fixture rule:

1. Keep raw screenshots with sensitive data out of the repository.
2. Store sanitized OCR text fixtures instead.
3. Replace real names with stable fake names.
4. Keep numeric values only if they are safe to disclose.
5. Add expected parsed output before changing code.

## Safe Changes

Safe first-pass changes:

- Documentation.
- Tests that capture current behavior.
- README and portfolio presentation.
- Deployment notes.
- Non-functional metadata.
- UI copy that does not change workflows.
- Explicit Firebase emulator mode for local testing with synthetic seed data.

## Risky Changes

Risky changes that need approval:

- Migrating CRA to Vite or TypeScript.
- Moving admin permissions to custom claims.
- Changing Firebase rules.
- Changing parser matching logic.
- Changing formulas or weights.
- Adding LLM post-processing to extraction.
- Changing report matching thresholds.

## Regression Strategy

Before changing logic:

1. Capture representative screenshots or OCR text fixtures.
2. Record expected parsed output.
3. Record expected calculator and analytics output.
4. Add tests that pass on the current app.
5. Make one small change.
6. Compare output before deploying.

## Local Data Testing

Use emulator mode for local data testing:

```bash
npm run emulators
npm run seed:emulators
npm run start:emulators
```

Do not use production Firebase for parser, report, or analytics experiments.
