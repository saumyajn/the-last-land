# Deployment

## Frontend

The frontend is a Create React App build.

```bash
npm run build
```

Deploy the generated `build` directory to the hosting provider.

## Firebase

The app depends on:

- Firebase Auth
- Firestore
- Firebase Cloud Functions
- Google Cloud Vision API

Deploy functions:

```bash
firebase deploy --only functions
```

## Cloud Function CORS

The callable OCR function currently allows:

- `https://the-last-land-analytics.vercel.app`
- `http://localhost:3000`

If the frontend domain changes, update `functions/main.py` and redeploy functions.

## Admin Access

Admin access currently depends on email allowlists in:

- `src/utils/config.js`
- `functions/main.py`

Keep both lists synchronized until the project migrates to custom claims or Firestore role documents.

## Firestore Safety

Before deploying changes that touch data logic:

1. Export or back up Firestore data.
2. Run parser/calculator tests.
3. Test against representative screenshots.
4. Verify `stats`, `reports`, `analytics`, `formation`, and `settings` still have expected shapes.

## Local Emulator Notes

Production Firebase is the default. Emulator mode is explicit so local testing does not accidentally mutate production Firestore.

Start Firebase emulators:

```bash
npm run emulators
```

In a second terminal, seed synthetic local data:

```bash
npm run seed:emulators
```

In a third terminal, start the app in emulator mode:

```bash
npm run start:emulators
```

Expected emulator ports:

```bash
Auth: 127.0.0.1:9099
Firestore: 127.0.0.1:8080
Functions: 127.0.0.1:5001
```

The synthetic seed data uses a fake player named `Fixture Player` and does not read or write production Firebase.
