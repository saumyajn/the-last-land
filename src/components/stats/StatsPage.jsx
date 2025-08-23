import React, { useContext, useEffect, useState } from "react";
import Tesseract from "tesseract.js";
import { Container, Typography, Box, Paper, TextField } from "@mui/material";
import { collection, doc, getDocs, deleteDoc, setDoc } from "firebase/firestore";
import ImageUpload from "./ImageUpload";
import { usePermissionSnackbar } from "../Permissions";
import RawText from "./RawData";
import DataTable from "./DataTable";
import { parseData } from "../../utils/parseData";
import { db } from "../../utils/firebase";
import { calcs, getNumber } from '../../utils/calcs';
import { AuthContext } from "../../utils/authContext";

export default function StatsPage() {
  const { user, isAdmin } = useContext(AuthContext);
  const [images, setImages] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataTable, setDataTable] = useState({});
  const [name, setName] = useState("");
  const { showNoPermission } = usePermissionSnackbar();

  const desiredKeys = [
    "Troop Attack",
    "Troop Health",
    "Troop Defense",
    "Troop Damage",
    "Troop Damage Received",
    "Troop Attack Blessing",
    "Troop Protection Blessing",
    "Archer Attack",
    "Archer Health",
    "Archer Defense",
    "Archer Damage",
    "Archer Damage Received",
    "Archer Attack Blessing",
    "Archer Protection Blessing",
    "Cavalry Attack",
    "Cavalry Health",
    "Cavalry Defense",
    "Cavalry Damage",
    "Cavalry Damage Received",
    "Cavalry Attack Blessing",
    "Cavalry Protection Blessing",
    "Lethal Hit Rate"
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "stats"));
        const data = {};
        querySnapshot.forEach((doc) => {
          data[doc.id] = doc.data();
        });
        setDataTable(data);
        console.log("✅ Loaded data from Firestore");
      } catch (error) {
        console.error("❌ Error loading data from Firestore:", error);
      }
    };

    fetchData();
  }, []);

  const updateFirestore = async (playerName, data) => {
    try {
      if (!isAdmin) {
        console.log(isAdmin)
        showNoPermission();
        return;
      }
      await setDoc(doc(db, "stats", playerName), { ...data }, { merge: true });
      console.log(`✅ Firestore updated for: ${playerName}`);
    } catch (error) {
      console.error("❌ Firestore update failed:", error);
    }
  };

  const deletePlayer = async (playerName) => {

    try {
      if (!isAdmin) {
        showNoPermission();
        return;
      }
      await deleteDoc(doc(db, "stats", playerName));
      const updatedTable = { ...dataTable };
      delete updatedTable[playerName];
      setDataTable(updatedTable);
      console.log("🗑️ Deleted player:", playerName);
    } catch (error) {
      console.error("❌ Error deleting player:", error);
    }
  }
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) {
      const urls = files.map(file => URL.createObjectURL(file));
      setImages(urls);
      setText("");
    }
  };

 const extractText = async () => {
    if (!images.length) return;
    setLoading(true);

    // Run Tesseract on all images and combine results
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
    const updatedTable = { ...dataTable, [name]: attributes };
    setDataTable(updatedTable);

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
            image={images}
            onUpload={handleImageUpload}
            onExtract={extractText}
            loading={loading}
            name={name}
          />
        </Box>

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

      </Container>
    </div>
  );
};