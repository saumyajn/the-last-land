const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const firebaseCli = path.join(
  rootDir,
  "node_modules",
  "firebase-tools",
  "lib",
  "bin",
  "firebase.js",
);
const firebaseConfigDir = path.join(rootDir, ".firebase-config");
const firebaseEmulatorCacheDir = path.join(rootDir, ".firebase-emulators");

fs.mkdirSync(firebaseConfigDir, { recursive: true });
fs.mkdirSync(firebaseEmulatorCacheDir, { recursive: true });

const emulatorEnv = {
  ...process.env,
  XDG_CONFIG_HOME: firebaseConfigDir,
  FIREBASE_EMULATORS_PATH: firebaseEmulatorCacheDir,
};

const child = spawn(
  process.execPath,
  [firebaseCli, "emulators:start", "--only", "auth,firestore"],
  {
    cwd: rootDir,
    stdio: "inherit",
    shell: false,
    env: emulatorEnv,
  },
);

child.on("error", (error) => {
  console.error("Failed to start Firebase emulators:", error);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
