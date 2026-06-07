import { doc, setDoc, deleteDoc, getDocs, collection } from "firebase/firestore";
import { db } from "./firebase";
import { aggregateTroopTypeKpt } from "./kptCalculations";
import { calculateTroopTypeSummary } from "./troopSummaryCalculations";

/**
 * Generic helper to update or create a document in a collection
 * @param {string} collectionName - e.g., "stats" or "formations"
 * @param {string} docId - The document ID (e.g., player name)
 * @param {object} data - The data to save
 * @param {boolean} isAdmin - Check from AuthContext
 * @param {function} onPermissionDenied - Snackbar/callback for non-admins
 */
export const updateDocument = async (collectionName, docId, data, isAdmin, onPermissionDenied) => {
    try {
        if (!isAdmin) {
            if (onPermissionDenied) onPermissionDenied();
            return false;
        }
        await setDoc(doc(db, collectionName, docId), { ...data }, { merge: true });
        return true;
    } catch (error) {
        console.error(`❌ Firestore update failed for ${collectionName}/${docId}:`, error);
        return false;
    }
};

/**
 * Generic helper to delete a document
 */
export const deleteDocument = async (collectionName, docId, isAdmin, onPermissionDenied) => {
    try {
        if (!isAdmin) {
            if (onPermissionDenied) onPermissionDenied();
            return false;
        }
        await deleteDoc(doc(db, collectionName, docId));
        return true;
    } catch (error) {
        console.error(`❌ Firestore deletion failed for ${collectionName}/${docId}:`, error);
        return false;
    }
};
export const updateTroopTypeKpt = async (isAdmin) => {
    if (!isAdmin) return;

    try {
        const reportsSnap = await getDocs(collection(db, "reports"));
        const kptData = aggregateTroopTypeKpt(reportsSnap.docs.map((docSnap) => docSnap.data()));

        // Save to analytics/troop_type_kpt
        await setDoc(doc(db, "analytics", "troop_type_kpt"), kptData);

        const summary = calculateTroopTypeSummary(kptData);
        await setDoc(doc(db, "analytics", "troop_type_summary"), {
            ...summary,
            updatedAt: new Date().toISOString()
        });

        if (process.env.NODE_ENV === "development") {
            console.log("Global Troop KPT and Summary updated perfectly!");
        }
    } catch (error) {
        console.error("Failed to update global Troop KPT:", error);
    }
};
