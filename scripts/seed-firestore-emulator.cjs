const { initializeApp } = require("firebase/app");
const {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  setDoc,
} = require("firebase/firestore");

const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID || "image-to-data-9a90b";
const host = process.env.REACT_APP_FIREBASE_EMULATOR_HOST || "127.0.0.1";
const port = Number(process.env.REACT_APP_FIRESTORE_EMULATOR_PORT || 8080);

const app = initializeApp({
  apiKey: "local-emulator",
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
});

const db = getFirestore(app);
connectFirestoreEmulator(db, host, port);

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
    attack: 1,
    health: 1,
    defense: 1,
    damage: 1,
    damageReceived: 1,
    attackBlessing: 1,
    protectBlessing: 1,
    archerRatio: 0.5,
    cavalryRatio: 0.5,
    multiplier: 1.5,
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
  guards: "0",
  damage_troops: "900000",
  at10: "40",
  at9: "25",
  at8: "20",
  at7: "15",
  ct10: "40",
  ct9: "25",
  ct8: "20",
  ct7: "15",
};

async function seed() {
  await setDoc(doc(db, "stats", player), statDoc);
  await setDoc(doc(db, "reports", player), reportDoc);
  await setDoc(doc(db, "settings", "statWeights"), settings);
  await setDoc(doc(db, "settings", "thresholds"), { thresholds });
  await setDoc(doc(db, "settings", "atlantis_damage"), atlantisDamage);
  await setDoc(doc(db, "settings", "tower_formation"), formationSettings);
  await setDoc(doc(db, "settings", "throne_formation"), formationSettings);
  await setDoc(doc(db, "analytics", "troop_type_kpt"), {
    T10_cavalry: { Kills: 12034, Losses: 567, Wounded: 8901, Survivors: 0, KPT: "0.15" },
    T10_archer: { Kills: 11000, Losses: 500, Wounded: 7000, Survivors: 3200, KPT: "0.40" },
  });

  console.log(`Seeded Firestore emulator at ${host}:${port} for project ${projectId}`);
}

seed().catch((error) => {
  console.error("Failed to seed Firestore emulator:", error);
  process.exit(1);
});
