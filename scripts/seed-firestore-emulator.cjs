const net = require("node:net");

const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID || "image-to-data-9a90b";
const host = process.env.REACT_APP_FIREBASE_EMULATOR_HOST || "127.0.0.1";
const port = Number(process.env.REACT_APP_FIRESTORE_EMULATOR_PORT || 8080);
const baseUrl = `http://${host}:${port}/v1/projects/${projectId}/databases/(default)/documents`;

const player = "Fixture Player";
const statDoc = {
  "Troop Attack": "412.8%",
  "Troop Health": "386.2%",
  "Troop Defense": "378.4%",
  "Troop Damage": "32.5%",
  "Troop Damage Received": "18.2%",
  "Troop Attack Blessing": "22.1%",
  "Troop Protection Blessing": "19.7%",
  "Archer Attack": "516.4%",
  "Archer Health": "442.6%",
  "Archer Defense": "430.1%",
  "Archer Damage": "41.3%",
  "Archer Damage Received": "20.5%",
  "Archer Attack Blessing": "28.4%",
  "Archer Protection Blessing": "24.2%",
  "Cavalry Attack": "498.9%",
  "Cavalry Health": "421.3%",
  "Cavalry Defense": "405.7%",
  "Cavalry Damage": "38.9%",
  "Cavalry Damage Received": "19.8%",
  "Cavalry Attack Blessing": "26.1%",
  "Cavalry Protection Blessing": "23.6%",
  "Siege Attack": "455.2%",
  "Siege Health": "399.5%",
  "Siege Defense": "384.8%",
  "Siege Damage": "35.4%",
  "Siege Damage Received": "17.7%",
  "Siege Attack Blessing": "21.5%",
  "Siege Protection Blessing": "20.9%",
  "Lethal Hit Rate": "12.4%",
  "Archer Atlantis": "7.5%",
  "Cavalry Atlantis": "5%",
  "Siege Atlantis": "0%",
  "Final Archer Damage": 256.8,
  "Final Cavalry Damage": 237.6,
  "Final Siege Damage": 202.7,
  "Average Damage": "246.40",
};

const reportDoc = {
  T10_guards: { Kills: "0", Losses: "0", Wounded: "0", Survivors: "0" },
  T10_cavalry: { Kills: "12034", Losses: "567", Wounded: "8901", Survivors: "0" },
  T10_archer: { Kills: "11000", Losses: "500", Wounded: "7000", Survivors: "3200" },
  T10_siege: { Kills: "9000", Losses: "600", Wounded: "6100", Survivors: "2800" },
  T9_cavalry: { Kills: "4500", Losses: "200", Wounded: "1400", Survivors: "800" },
  T9_archer: { Kills: "4200", Losses: "180", Wounded: "1300", Survivors: "850" },
  T8_cavalry: { Kills: "3000", Losses: "100", Wounded: "900", Survivors: "500" },
  T8_archer: { Kills: "2800", Losses: "90", Wounded: "850", Survivors: "450" },
  T8_siege: { Kills: "2100", Losses: "80", Wounded: "650", Survivors: "360" },
  T7_cavalry: { Kills: "1200", Losses: "40", Wounded: "320", Survivors: "200" },
  T7_archer: { Kills: "1000", Losses: "35", Wounded: "300", Survivors: "180" },
};

const settings = {
  weights: {
    archerAttack: "",
    archerHealth: "",
    archerDefense: "",
    cavalryAttack: "",
    cavalryHealth: "",
    cavalryDefense: "",
    siegeAttack: "",
    siegeHealth: "",
    siegeDefense: "",
    archerRatio: "",
    cavalryRatio: "",
    siegeRatio: "",
  },
};

const thresholds = [
  { name: "Elite", limit: 250, color: "#d32f2f" },
  { name: "Strong", limit: 225, color: "#f57c00" },
  { name: "Solid", limit: 200, color: "#fbc02d" },
  { name: "Building", limit: 0, color: "#90caf9" },
];

const atlantisDamage = {
  "0%": "0",
  "2.5%": "2.5",
  "5%": "5",
  "7.5%": "7.5",
  "10%": "10",
};

const formationSettings = {
  total: "1000000",
  guards: "100000",
  damage_troops: "900000",
  at10: "20",
  at9: "15",
  at8: "10",
  at7: "5",
  ct10: "20",
  ct9: "15",
  ct8: "10",
  ct7: "5",
};

const formationDoc = {
  Elite: {
    avgDamage: 246.4,
    count: 1,
    troops: 900000,
    at10: 180,
    at9: 135,
    at8: 90,
    at7: 45,
    ct10: 180,
    ct9: 135,
    ct8: 90,
    ct7: 45,
    marchSize: 900,
    total: "900.00",
  },
  Strong: {
    avgDamage: 0,
    count: 0,
    troops: 0,
    at10: 0,
    at9: 0,
    at8: 0,
    at7: 0,
    ct10: 0,
    ct9: 0,
    ct8: 0,
    ct7: 0,
    marchSize: 0,
    total: "0.00",
  },
  Solid: {
    avgDamage: 0,
    count: 0,
    troops: 0,
    at10: 0,
    at9: 0,
    at8: 0,
    at7: 0,
    ct10: 0,
    ct9: 0,
    ct8: 0,
    ct7: 0,
    marchSize: 0,
    total: "0.00",
  },
  Building: {
    avgDamage: 0,
    count: 0,
    troops: 0,
    at10: 0,
    at9: 0,
    at8: 0,
    at7: 0,
    ct10: 0,
    ct9: 0,
    ct8: 0,
    ct7: 0,
    marchSize: 0,
    total: "0.00",
  },
};

const formationKillSettings = {
  archer: {
    troops: 450000,
    multiplier: "",
    guardsKilled: 0,
  },
  cavalry: {
    troops: 450000,
    multiplier: "",
    guardsKilled: 0,
  },
  totalGuards: 100000,
  totalGuardKills: 0,
};

const documents = [
  ["stats", player, statDoc],
  ["reports", player, reportDoc],
  ["settings", "statWeights", settings],
  ["settings", "thresholds", { thresholds }],
  ["settings", "atlantis_damage", atlantisDamage],
  ["settings", "tower_formation", formationSettings],
  ["settings", "throne_formation", formationSettings],
  ["formation", "tower_formation", formationDoc],
  ["formation", "throne_formation", formationDoc],
  ["formation", "tower_kills", formationKillSettings],
  ["formation", "throne_kills", formationKillSettings],
  [
    "analytics",
    "troop_type_kpt",
    {
      T10_cavalry: { Kills: 12034, Losses: 567, Wounded: 8901, Survivors: 0, KPT: "0.15", LPT: "1.00" },
      T10_archer: { Kills: 11000, Losses: 500, Wounded: 7000, Survivors: 3200, KPT: "0.40", LPT: "0.70" },
    },
  ],
];

function waitForPort(timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Firestore emulator is not reachable at ${host}:${port}. Start it with \`npm.cmd run emulators\` first.`));
    }, timeoutMs);

    socket.once("connect", () => {
      clearTimeout(timeout);
      socket.end();
      resolve();
    });
    socket.once("error", () => {
      clearTimeout(timeout);
      reject(new Error(`Firestore emulator is not reachable at ${host}:${port}. Start it with \`npm.cmd run emulators\` first.`));
    });
  });
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, nestedValue]) => [key, toFirestoreValue(nestedValue)])
        ),
      },
    };
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "boolean") {
    return { booleanValue: value };
  }
  return { stringValue: String(value) };
}

function toFirestoreDocument(data) {
  return {
    fields: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)])
    ),
  };
}

async function writeDocument(collectionName, documentId, data) {
  const url = `${baseUrl}/${encodeURIComponent(collectionName)}/${encodeURIComponent(documentId)}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toFirestoreDocument(data)),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to write ${collectionName}/${documentId}: ${response.status} ${body}`);
  }
}

async function seed() {
  await waitForPort();

  for (const [collectionName, documentId, data] of documents) {
    await writeDocument(collectionName, documentId, data);
  }

  console.log(`Seeded ${documents.length} Firestore emulator documents at ${host}:${port} for project ${projectId}`);
}

seed().catch((error) => {
  console.error("Failed to seed Firestore emulator:", error.message);
  process.exit(1);
});
