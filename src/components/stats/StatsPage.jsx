import React, { useContext, useEffect, useState, lazy, Suspense } from "react";
import { Container, Typography, Box, Paper, TextField, CircularProgress } from "@mui/material";
import { collection, doc, getDocs, deleteDoc, setDoc } from "firebase/firestore";
import ImageUpload from "./ImageUpload";
import { usePermissionSnackbar } from "../Permissions";
import { parseData } from "../../utils/parseData";
import { db } from "../../utils/firebase";
import { calcs, getNumber } from '../../utils/calcs';
import { AuthContext } from "../../utils/authContext";

// Lazy load heavy components
const RawText = lazy(() => import("./RawData"));
const DataTable = lazy(() => import("./DataTable"));

export default function StatsPage() {
  const { user, isAdmin } = useContext(AuthContext);
  const [images, setImages] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataTable, setDataTable] = useState({});
  const [name, setName] = useState("");
  const { showNoPermission } = usePermissionSnackbar();

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
        if (mounted) setDataTable(data);
      } catch (error) {
      
          console.error("❌ Error loading data from Firestore:", error);
        
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, []);

  const updateFirestore = async (playerName, data) => {
    try {
      if (!isAdmin) {
        showNoPermission();
        return;
      }
      await setDoc(doc(db, "stats", playerName), { ...data }, { merge: true });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Firestore update failed:", error);
      }
    }
  };

  const deletePlayer = async (playerName) => {
    try {
      if (!isAdmin) {
        showNoPermission();
        return;
      }
      await deleteDoc(doc(db, "stats", playerName));
      setDataTable(prev => {
        const updated = { ...prev };
        delete updated[playerName];
        return updated;
      });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Error deleting player:", error);
      }
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) {
      const urls = files.map(file => URL.createObjectURL(file));
      setImages(urls);
      setText("");
    }
  };

  // Defer Tesseract import until needed
  const extractText = async () => {
    if (!images?.length) return;
    setLoading(true);
    const { default: Tesseract } = await import("tesseract.js");
    let allExtracted = "";
    for (const img of images) {
      const result = await Tesseract.recognize(img, "eng");
      allExtracted += result.data.text + "\n";
    }
    setText(allExtracted);
    setLoading(false);

    const attributes = parseData(allExtracted, desiredKeys);
    attributes["Archer Atlantis"] = '0';
    attributes["Cavalry Atlantis"] = '0';
    attributes["Final Archer Damage"] = getNumber(calcs(attributes, "archer", attributes["Archer Atlantis"]));
    attributes["Final Cavalry Damage"] = getNumber(calcs(attributes, "cavalry", attributes["Cavalry Atlantis"]));
    setDataTable(prev => ({ ...prev, [name]: attributes }));
    await updateFirestore(name, attributes);
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

        <Suspense fallback={<Box p={4} textAlign="center"><CircularProgress /></Box>}>
          {Object.entries(dataTable).length > 0 && (
            <DataTable
              tableData={dataTable}
              desiredKeys={desiredKeys}
              onDelete={deletePlayer}
              onUpdate={updateFirestore}
              isAdmin={isAdmin}
              user={user}
            />
          )}
          <RawText text={text} />
        </Suspense>
      </Container>
    </div>
  );
}