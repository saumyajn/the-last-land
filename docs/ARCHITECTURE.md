# Architecture

The Last Land is an OCR analytics platform with three important boundaries:

- Screenshot extraction and OCR
- Deterministic parsing and calculations
- Firebase-backed persistence and analytics

## Frontend

The frontend is a React CRA application using Material UI. It owns:

- Authentication UI and route-level workflow.
- Stats upload and parsing views.
- Formation planning views.
- Battle report extraction and manual correction.
- Analytics summaries and export actions.

## OCR Flow

Stats extraction:

1. The user uploads screenshots in the stats workflow.
2. Image data is sent to the Firebase callable OCR function.
3. Google Cloud Vision returns raw text.
4. `parseData` maps raw OCR text to desired stat keys.
5. `calcs` computes derived damage values.
6. Admin users persist the result into Firestore.

Report extraction:

1. The user uploads or pastes a battle report screenshot.
2. OpenCV.js performs multi-scale template matching against troop icon assets.
3. Matched rows are cropped.
4. Crops are sent to Google Cloud Vision.
5. OCR text is cleaned into Kills, Losses, Wounded, and Survivors.
6. Admin users persist report data and trigger KPT/LPT aggregation.

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

- OCR cleanup rules
- Template match thresholds and scale loop
- Stat parser key matching
- Damage formulas
- KPT/LPT formulas
- Firestore collection/document shapes
- TSV export shape
