import { doc, setDoc, deleteDoc, getDocs, collection } from "firebase/firestore";
import { db } from "./firebase";

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
        const aggregation = {};

        // Aggregate data from every player report
        reportsSnap.forEach((docSnap) => {
            const playerData = docSnap.data();
            Object.entries(playerData).forEach(([troopType, stats]) => {
                if (troopType === "archerKPT" || troopType === "cavalryKPT" || troopType === "siegeKPT") return;

                if (!aggregation[troopType]) {
                    aggregation[troopType] = { Kills: 0, Losses: 0, Wounded: 0, Survivors: 0 };
                }
                aggregation[troopType].Kills += parseInt(stats.Kills || 0);
                aggregation[troopType].Losses += parseInt(stats.Losses || 0);
                aggregation[troopType].Wounded += parseInt(stats.Wounded || 0);
                aggregation[troopType].Survivors += parseInt(stats.Survivors || 0);
            });
        });

        // Calculate KPT for each troop type
        const kptData = {};
        let totalKills = 0, totalLosses = 0, totalWounded = 0, totalSurvivors = 0;

        Object.entries(aggregation).forEach(([type, totals]) => {
            const denominator = totals.Losses + totals.Wounded + totals.Survivors;
            kptData[type] = {
                ...totals,
                KPT: denominator > 0 ? (totals.Kills / denominator).toFixed(2) : "0.00"
            };

            if (type !== 'T10_guards') {
                totalKills += totals.Kills;
                totalLosses += totals.Losses;
                totalWounded += totals.Wounded;
                totalSurvivors += totals.Survivors;
            }
        });

        // Save to analytics/troop_type_kpt
        await setDoc(doc(db, "analytics", "troop_type_kpt"), kptData);

        // 3. Calculate advanced metrics for the Summary Document
        const totalDenominator = totalLosses + totalWounded + totalSurvivors;
        const globalKPT = totalDenominator > 0 ? (totalKills / totalDenominator) : 0;

        const troopSummaryDetails = {};
        Object.entries(kptData).forEach(([type, stats]) => {
            let marchSize = globalKPT > 0 ? (stats.Kills || 0) / globalKPT : 0;
            if (type === 'T10_guards') marchSize = 0;

            troopSummaryDetails[type] = {
                ...stats,
                calculatedMarchSize: Math.round(marchSize),
                marchPercentage: totalDenominator > 0
                    ? ((marchSize / totalDenominator) * 100).toFixed(2) + "%"
                    : "0.00%"
            };
        });
        await setDoc(doc(db, "analytics", "troop_type_summary"), {
            totals: {
                Kills: totalKills,
                Losses: totalLosses,
                Wounded: totalWounded,
                Survivors: totalSurvivors,
                KPT: globalKPT.toFixed(3),
                totalMarchSize: totalDenominator
            },
            troopDetails: troopSummaryDetails,
            updatedAt: new Date().toISOString()
        });

        console.log("✅ Global Troop KPT and Summary updated perfectly!");
    } catch (error) {
        console.error("❌ Failed to update global Troop KPT:", error);
    }
};