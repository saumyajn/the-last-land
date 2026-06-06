export const shouldUseFirebaseEmulators =
  process.env.REACT_APP_USE_FIREBASE_EMULATORS === "true";

export const firebaseEmulatorHost =
  process.env.REACT_APP_FIREBASE_EMULATOR_HOST || "127.0.0.1";

export const firebaseEmulatorPorts = {
  auth: Number(process.env.REACT_APP_FIREBASE_AUTH_EMULATOR_PORT || 9099),
  firestore: Number(process.env.REACT_APP_FIRESTORE_EMULATOR_PORT || 8080),
  functions: Number(process.env.REACT_APP_FUNCTIONS_EMULATOR_PORT || 5001),
};

export const firebaseProjectId =
  process.env.REACT_APP_FIREBASE_PROJECT_ID || "image-to-data-9a90b";
