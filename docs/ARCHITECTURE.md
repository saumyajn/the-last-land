# Architecture

The Last Land is an analytics platform with three important boundaries:

- Screenshot extraction
- Deterministic calculations
- Firebase-backed persistence and analytics

## Frontend

The frontend is a React CRA application using Material UI. It owns:

- Authentication UI and route-level workflow.
- Stats upload views.
- Formation planning views.
- Battle report extraction and manual correction.
- Analytics summaries and export actions.

## Extraction Flow

Stats extraction:

1. The user uploads screenshots in the stats workflow.
2. Image data is sent to the Firebase callable Gemini extraction function.
3. The function returns structured stat keys.
4. `calcs` computes derived damage values.
5. Admin users persist the result into Firestore.

Report extraction:

1. The user uploads or pastes a battle report screenshot.
2. Image data is sent to the Firebase callable Gemini extraction function.
3. The function returns structured Kills, Losses, Wounded, and Survivors values.
4. Admin users persist report data and trigger KPT/LPT aggregation.

## Firestore Collections

Observed app collections:

- `stats`
- `reports`
- `formation`
- `analytics`
- `settings`

These collection names and document shapes are part of the protected data contract.

## Current Authorization

The app currently uses Firebase Auth and admin email allowlists in client and function code. This is the current production behavior and should not be changed casually.

Recommended future direction:

- Use Firebase custom claims or a Firestore role document.
- Keep current admin emails during migration.
- Add tests and deployment notes before changing write authorization.

## Protected Logic

Do not change these without approval and regression fixtures:

- Extraction prompt and output shape
- Damage formulas
- KPT/LPT formulas
- Firestore collection/document shapes
- TSV export shape
