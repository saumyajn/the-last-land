import React, { useEffect, useState } from "react";
import Tesseract from "tesseract.js";
import { Container, Typography, Box, Paper, TextField } from "@mui/material";
import ImageUpload from "./components/ImageUpload";
import RawText from "./components/RawData";
import { parseData } from "./utils/parseData";
import DataTable from "./components/DataTable";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "./utils/firebase";

export default function ImageToDataApp() {
  const [image, setImage] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataTable, setDataTable] = useState({});
  const [name, setName] = useState("");
  const desiredKeys = [
    "Troop Attack",
    "Troop Damage",
    "Troop Attack Blessing",
    "Archer Attack",
    "Archer Damage",
    "Archer Attack Blessing",
    "Cavalry Attack",
    "Cavalry Damage",
    "Cavalry Attack Blessing",
    "Lethal Hit Rate"

  ];


  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "players"));
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

  const updateFirestore = async (name, data) => {
    try {
      await setDoc(doc(db, "players", name), { ...data }, { merge: true });
      console.log(`✅ Firestore updated for: ${name}`);
    } catch (error) {
      console.error("❌ Firestore update failed:", error);
    }
  };
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      setText("");

    }
  };

  const extractText = async () => {
    if (!image) return;
    setLoading(true);
    const result = await Tesseract.recognize(image, "eng");
    const extracted = result.data.text;
    setText(extracted);
    setLoading(false);
    const attributes = parseData(extracted, desiredKeys);
    const updatedTable = { ...dataTable, [name]: attributes };
    setDataTable(updatedTable);

    await updateFirestore(name, attributes);
  };



  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom color="primary">
        Game Image Data Extractor
      </Typography>
      <TextField
        label="Enter Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      <Box component={Paper} elevation={3} sx={{ p: 3, mb: 4 }}>
        <ImageUpload
          image={image}
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
        />
      )}

      <RawText text={text} />

    </Container>
  );
};