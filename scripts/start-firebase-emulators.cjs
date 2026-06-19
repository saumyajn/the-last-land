const { spawn, spawnSync } = require("node:child_process");
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
const functionsDir = path.join(rootDir, "functions");
const requirementsFile = path.join(functionsDir, "requirements.txt");
const venvPython = path.join(
  functionsDir,
  process.platform === "win32" ? "venv\\Scripts\\python.exe" : "venv/bin/python",
);
const localEnvFiles = [
  path.join(rootDir, ".env.local"),
  path.join(functionsDir, ".env.local"),
];

fs.mkdirSync(firebaseConfigDir, { recursive: true });
fs.mkdirSync(firebaseEmulatorCacheDir, { recursive: true });

const installFunctionDependencies = () => {
  const pythonBin = fs.existsSync(venvPython) ? venvPython : "python";
  console.log("Installing Python function dependencies...");

  const result = spawnSync(
    pythonBin,
    ["-m", "pip", "install", "--disable-pip-version-check", "-r", requirementsFile],
    {
      cwd: rootDir,
      stdio: "inherit",
      shell: false,
    },
  );

  if (result.status !== 0) {
    console.error("Failed to install Python function dependencies.");
    process.exit(result.status ?? 1);
  }
};

installFunctionDependencies();

const readLocalEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {};

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return env;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) return env;

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key) env[key] = value;
      return env;
    }, {});
};

const localEnv = localEnvFiles.reduce(
  (env, filePath) => ({
    ...env,
    ...readLocalEnvFile(filePath),
  }),
  {},
);

const emulatorEnv = {
  ...localEnv,
  ...process.env,
  XDG_CONFIG_HOME: firebaseConfigDir,
  FIREBASE_EMULATORS_PATH: firebaseEmulatorCacheDir,
};

if (!emulatorEnv.GEMINI_API_KEY) {
  console.warn(
    "GEMINI_API_KEY is not set. Image extraction will return a clear error until you add it to .env.local or set it before starting emulators.",
  );
}

if (!emulatorEnv.GEMINI_MODEL) {
  console.warn(
    "GEMINI_MODEL is not set. Image extraction will use gemini-3.1-flash-lite with built-in backup models.",
  );
}

const child = spawn(
  process.execPath,
  [firebaseCli, "emulators:start", "--only", "auth,firestore,functions"],
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
