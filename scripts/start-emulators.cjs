const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const emulatorHost = process.env.REACT_APP_FIREBASE_EMULATOR_HOST || "127.0.0.1";
const emulatorPorts = {
  auth: Number(process.env.REACT_APP_FIREBASE_AUTH_EMULATOR_PORT || "9099"),
  firestore: Number(process.env.REACT_APP_FIRESTORE_EMULATOR_PORT || "8080"),
  functions: Number(process.env.REACT_APP_FUNCTIONS_EMULATOR_PORT || "5001"),
};

const reactScriptsBin = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "react-scripts",
  "bin",
  "react-scripts.js"
);

const checkPort = (host, port) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(800);

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      resolve(false);
    });
  });

const startReactApp = () => {
  const child = spawn(
  process.execPath,
  [reactScriptsBin, "start"],
  {
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      BROWSER: process.env.BROWSER || "none",
      PORT: process.env.PORT || "3001",
      REACT_APP_USE_FIREBASE_EMULATORS: "true",
      REACT_APP_FIREBASE_EMULATOR_HOST: emulatorHost,
      REACT_APP_FIREBASE_AUTH_EMULATOR_PORT: String(emulatorPorts.auth),
      REACT_APP_FIRESTORE_EMULATOR_PORT: String(emulatorPorts.firestore),
      REACT_APP_FUNCTIONS_EMULATOR_PORT: String(emulatorPorts.functions),
      REACT_APP_EMULATOR_OCR_SOURCE: process.env.REACT_APP_EMULATOR_OCR_SOURCE || "functions-emulator",
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
};

const main = async () => {
  const unavailable = [];

  for (const [name, port] of Object.entries(emulatorPorts)) {
    const isAvailable = await checkPort(emulatorHost, port);
    if (!isAvailable) {
      unavailable.push(`${name} (${emulatorHost}:${port})`);
    }
  }

  if (unavailable.length > 0) {
    console.error("\nFirebase emulators are not reachable:");
    unavailable.forEach((name) => console.error(`- ${name}`));
    console.error("\nStart them in another terminal first:");
    console.error("  npm.cmd run emulators");
    console.error("\nThen seed data if needed:");
    console.error("  npm.cmd run seed:emulators");
    console.error("\nFinally restart this command:");
    console.error("  npm.cmd run start:emulators\n");
    process.exit(1);
  }

  startReactApp();
};

main().catch((error) => {
  console.error("Failed to verify Firebase emulator ports:", error);
  process.exit(1);
});
