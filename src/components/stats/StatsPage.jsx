import React, { useContext, useEffect, useState, lazy, Suspense } from "react";
import { Container, Typography, Box, Paper, TextField, Stack, Skeleton } from "@mui/material";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import ImageUpload from "./ImageUpload";
import { usePermissionSnackbar } from "../Permissions";
import { parseData } from "../../utils/parseData";
import { db } from "../../utils/firebase";
import { calcs, getNumber } from '../../utils/calcs';
import { AuthContext } from "../../utils/authContext";
import { updateDocument, deleteDocument } from "../../utils/dbActions";

// Lazy load heavy components
const RawText = lazy(() => import("./RawData"));
const DataTable = lazy(() => import("./DataTable"));

const defaultWeights = { attack: 1, health: 1, defense: 1, damage: 1, damageReceived: 1, attackBlessing: 1, protectBlessing: 1, archerRatio: 0.5, cavalryRatio: 0.5 };

export default function StatsPage() {
  const { isAdmin } = useContext(AuthContext);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataTable, setDataTable] = useState({});
  const [name, setName] = useState("");
  const { showNoPermission } = usePermissionSnackbar();
  const [statWeights, setStatWeights] = useState(defaultWeights);
  const desiredKeys = [
    "Troop Attack", "Troop Health", "Troop Defense", "Troop Damage", "Troop Damage Received",
    "Troop Attack Blessing", "Troop Protection Blessing", "Archer Attack", "Archer Health",
    "Archer Defense", "Archer Damage", "Archer Damage Received", "Archer Attack Blessing",
    "Archer Protection Blessing", "Cavalry Attack", "Cavalry Health", "Cavalry Defense",
    "Cavalry Damage", "Cavalry Damage Received", "Cavalry Attack Blessing", "Cavalry Protection Blessing",
    "Siege Attack", "Siege Health", "Siege Defense", "Siege Damage", "Siege Damage Received",
    "Siege Attack Blessing", "Siege Protection Blessing", "Lethal Hit Rate"
  ];

  // Only fetch once
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "stats"));
        const data = {};
        querySnapshot.forEach((doc) => {
          data[doc.id] = doc.data();
        });

        const weightsSnap = await getDoc(doc(db, "settings", "statWeights"));
        if (mounted && weightsSnap.exists() && weightsSnap.data().weights) {
          setStatWeights(weightsSnap.data().weights);
        }

        if (mounted) setDataTable(data);
      } catch (error) {

        console.error("❌ Error loading data from Firestore:", error);

      }
    };
    fetchData();
    return () => { mounted = false; };
  }, []);
  
  const handleDelete = async (playerName) => {
    const success = await deleteDocument("stats", playerName, isAdmin, showNoPermission);
    if (success) {
      setDataTable(prev => {
        const updated = { ...prev };
        delete updated[playerName];
        return updated;
      });
    }
  };
  const handleUpdate = async (playerName, data) => {
    await updateDocument("stats", playerName, data, isAdmin, showNoPermission);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) {


      setText("");
    }
  };

  // Defer Tesseract import until needed
  const extractText = async (extractedTexts) => {
    if (!extractedTexts || !extractedTexts.length) return;
    setLoading(true);

    // Combine all the text returned from your Cloud Function
    const allExtracted = extractedTexts.join("\n");
    setText(allExtracted);

    const attributes = parseData(allExtracted, desiredKeys);
    attributes["Archer Atlantis"] = '0';
    attributes["Cavalry Atlantis"] = '0';
    attributes["Siege Atlantis"] = '0';

    attributes["Final Archer Damage"] = getNumber(calcs(attributes, "archer", attributes["Archer Atlantis"], statWeights));
    attributes["Final Cavalry Damage"] = getNumber(calcs(attributes, "cavalry", attributes["Cavalry Atlantis"], statWeights));
    attributes["Final Siege Damage"] = getNumber(calcs(attributes, "siege", attributes["Siege Atlantis"], statWeights));

    attributes["Average Damage"] = (((parseFloat(attributes["Final Archer Damage"]) || 0) + (parseFloat(attributes["Final Cavalry Damage"]) || 0)) / 2).toFixed(2);

    setDataTable(prev => ({ ...prev, [name]: attributes }));
    await handleUpdate(name, attributes);
    setLoading(false);
  };

  return (
    <div>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box component={Paper} elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom color="primary">
            Image Stats Extractor
          </Typography>
          <TextField
            label="Enter Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <ImageUpload
            onUpload={handleImageUpload}
            onExtract={extractText}
            loading={loading}
            name={name}
          />
        </Box>

        <Suspense fallback={<Stack spacing={1}>
          <Skeleton variant="rectangular" height={40} />
          <Skeleton variant="rectangular" height={40} />
          <Skeleton variant="rectangular" height={40} />
        </Stack>}>
          {Object.entries(dataTable).length > 0 && (
            <DataTable
              tableData={dataTable}
              desiredKeys={desiredKeys}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              isAdmin={isAdmin}
              statWeights={statWeights}
              setStatWeights={setStatWeights}
            />
          )}
          <RawText text={text} />
        </Suspense>
      </Container>
    </div>
  );
}