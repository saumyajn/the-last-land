const { spawn } = require("node:child_process");
const path = require("node:path");

const reactScriptsBin = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "react-scripts",
  "bin",
  "react-scripts.js"
);

const child = spawn(
  process.execPath,
  [reactScriptsBin, "start"],
  {
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      BROWSER: process.env.BROWSER || "none",
      REACT_APP_USE_FIREBASE_EMULATORS: "true",
      REACT_APP_FIREBASE_EMULATOR_HOST:
        process.env.REACT_APP_FIREBASE_EMULATOR_HOST || "127.0.0.1",
      REACT_APP_FIREBASE_AUTH_EMULATOR_PORT:
        process.env.REACT_APP_FIREBASE_AUTH_EMULATOR_PORT || "9099",
      REACT_APP_FIRESTORE_EMULATOR_PORT:
        process.env.REACT_APP_FIRESTORE_EMULATOR_PORT || "8080",
      REACT_APP_FUNCTIONS_EMULATOR_PORT:
        process.env.REACT_APP_FUNCTIONS_EMULATOR_PORT || "5001",
    },
  }
);

child.on("error", (error) => {
  console.error("Failed to start the local emulator CRA server:", error);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
