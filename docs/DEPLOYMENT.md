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
- Gemini API

Deploy functions:

```bash
firebase deploy --only functions
```

Deploy the Firestore rules in `firestore.rules` before the frontend. They deny all reads and writes unless the signed-in user's verified email is in the admin allowlist:

```bash
firebase deploy --only firestore:rules
```

Deploy the updated callable extraction function before publishing the frontend. The frontend route checks alone do not secure Firestore or Functions.

## Cloud Function CORS

The callable extraction function currently allows:

- `https://the-last-land-analytics.vercel.app`
- `http://localhost:3000`

If the frontend domain changes, update `functions/main.py` and redeploy functions.

## Admin Access

Admin access currently depends on the same verified-email allowlist in:

- `src/utils/config.js`
- `functions/main.py`
- `firestore.rules`

Keep all three lists synchronized until the project migrates to custom claims or Firestore role documents. Only Overview is available to non-admin users.

Files in `public/` are served without authentication. Keep screenshots, videos, exported data, and other private assets out of that folder. Production builds omit JavaScript source maps, but the React bundle itself remains public and can reveal client-side formulas; move proprietary calculations behind an authenticated server endpoint if their implementation must be secret. Previously downloaded files and browser caches cannot be revoked retroactively.

## Firestore Safety

Before deploying changes that touch data logic:

1. Export or back up Firestore data.
2. Run calculator and analytics tests.
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

The synthetic seed data uses a fake player named `Fixture Player` and creates a verified admin user in the Auth emulator. The local app signs in as that fixture user and does not read or write production Firebase.
