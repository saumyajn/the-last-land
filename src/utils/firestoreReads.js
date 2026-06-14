import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { normalizeStatWeights } from "./appConstants";

export const readCollectionMap = async (collectionName) => {
  const snapshot = await getDocs(collection(db, collectionName));
  const data = {};

  snapshot.forEach((docSnapshot) => {
    data[docSnapshot.id] = docSnapshot.data();
  });

  return data;
};

export const readDocumentData = async (collectionName, documentId) => {
  const snapshot = await getDoc(doc(db, collectionName, documentId));
  return snapshot.exists() ? snapshot.data() : null;
};

export const loadStatsAndWeights = async () => {
  const [stats, statWeights] = await Promise.all([
    readCollectionMap("stats"),
    readDocumentData("settings", "statWeights"),
  ]);

  return {
    stats,
    weights: statWeights?.weights ? normalizeStatWeights(statWeights.weights) : null,
  };
};

export const loadChartsData = async () => {
  const [
    stats,
    reports,
    troopTypeKpt,
    troopTypeSummary,
    archerFinal,
    cavalryFinal,
    towerFormation,
    throneFormation,
  ] = await Promise.all([
    readCollectionMap("stats"),
    readCollectionMap("reports"),
    readDocumentData("analytics", "troop_type_kpt"),
    readDocumentData("analytics", "troop_type_summary"),
    readDocumentData("analytics", "archer_final"),
    readDocumentData("analytics", "cavalry_final"),
    readDocumentData("formation", "tower_formation"),
    readDocumentData("formation", "throne_formation"),
  ]);

  return {
    stats,
    reports,
    analytics: {
      troopTypeKpt: troopTypeKpt || {},
      troopTypeSummary: troopTypeSummary || {},
      archerFinal: archerFinal || {},
      cavalryFinal: cavalryFinal || {},
    },
    formation: {
      tower: towerFormation || {},
      throne: throneFormation || {},
    },
  };
};
