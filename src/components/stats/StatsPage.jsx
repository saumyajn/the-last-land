import React, { useCallback, useContext, useEffect, useState, lazy, Suspense } from "react";
import { Alert, Container, Typography, Box, Paper, TextField, Stack, Skeleton } from "@mui/material";
import ImageUpload from "./ImageUpload";
import { usePermissionSnackbar } from "../Permissions";
import { parseData, parseDataFromVisionWords } from "../../utils/parseData";
import { AuthContext } from "../../utils/authContext";
import { updateDocument, deleteDocument } from "../../utils/dbActions";
import { DEFAULT_STAT_WEIGHTS, DESIRED_STAT_KEYS } from "../../utils/appConstants";
import { loadStatsAndWeights } from "../../utils/firestoreReads";
import { calculateStatOutputs } from "../../utils/statCalculations";

const RawText = lazy(() => import("./RawData"));
const DataTable = lazy(() => import("./DataTable"));

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const getStructuredExtraction = (entry) => {
  if (!isPlainObject(entry)) return null;
  if (isPlainObject(entry.data)) return entry.data;
  if ("text" in entry || "words" in entry) return null;
  return entry;
};

const toAttributeValue = (value) => {
  if (value === undefined || value === null || value === "") return "NA";
  return String(value).replace(/-/g, "");
};

const mergeStructuredAttributes = (entries, desiredKeys) =>
  desiredKeys.reduce((attributes, key) => {
    const source = entries.find((entry) => entry[key] !== undefined && entry[key] !== null && entry[key] !== "");
    attributes[key] = source ? toAttributeValue(source[key]) : "NA";
    return attributes;
  }, {});

const formatRawExtractedValues = (attributes, desiredKeys) =>
  desiredKeys
    .filter((key) => attributes[key] !== undefined)
    .map((key) => `${key} = ${attributes[key]}`)
    .join("\n");

let statsBootstrapPromise = null;

const loadStatsBootstrap = () => {
  if (!statsBootstrapPromise) {
    statsBootstrapPromise = loadStatsAndWeights().finally(() => {
      statsBootstrapPromise = null;
    });
  }

  return statsBootstrapPromise;
};

export default function StatsPage() {
  const { isAdmin } = useContext(AuthContext);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [dataTable, setDataTable] = useState({});
  const [name, setName] = useState("");
  const { showNoPermission } = usePermissionSnackbar();
  const [statWeights, setStatWeights] = useState(DEFAULT_STAT_WEIGHTS);

  useEffect(() => {
    let mounted = true;
    const runWhenIdle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 0));
    const cancelIdle = window.cancelIdleCallback || window.clearTimeout;

    const fetchData = async () => {
      setStatsLoading(true);
      setStatsError("");

      try {
        const { stats, weights } = await loadStatsBootstrap();
        if (mounted && weights) {
          setStatWeights(weights);
        }

        if (mounted) setDataTable(stats);
      } catch (error) {
        console.error("Error loading stats from Firestore:", error);
        if (mounted) {
          setStatsError("Saved player stats could not be loaded. You can still upload and extract a new image.");
        }
      } finally {
        if (mounted) setStatsLoading(false);
      }
    };

    const idleId = runWhenIdle(fetchData);
    return () => {
      mounted = false;
      cancelIdle(idleId);
    };
  }, []);

  const handleDelete = async (playerName) => {
    const success = await deleteDocument("stats", playerName, isAdmin, showNoPermission);
    if (success) {
      setDataTable((prev) => {
        const updated = { ...prev };
        delete updated[playerName];
        return updated;
      });
    }
  };

  const handleUpdate = async (playerName, data) => {
    await updateDocument("stats", playerName, data, isAdmin, showNoPermission);
  };

  const handleImageUpload = useCallback((event) => {
    const files = Array.from(event.target.files);
    if (files.length) {
      setText("");
    }
  }, []);

  const extractText = async (extractedResults) => {
    const playerName = name.trim();
    if (!extractedResults || !extractedResults.length || !playerName) return;

    setLoading(true);
    setStatsError("");

    try {
      const failedExtraction = extractedResults.find((entry) => String(entry || "").startsWith("Error:"));
      if (failedExtraction) {
        throw new Error(failedExtraction);
      }

      const structuredEntries = extractedResults
        .map(getStructuredExtraction)
        .filter(Boolean);

      const allExtracted = structuredEntries.length
        ? JSON.stringify(structuredEntries.length === 1 ? structuredEntries[0] : structuredEntries, null, 2)
        : extractedResults
          .map((entry) => (typeof entry === "string" ? entry : entry?.text))
          .filter(Boolean)
          .join("\n");
      const allWords = structuredEntries.length
        ? []
        : extractedResults.flatMap((entry) =>
          Array.isArray(entry?.words) ? entry.words : []
        );

      let attributes = structuredEntries.length
        ? mergeStructuredAttributes(structuredEntries, DESIRED_STAT_KEYS)
        : parseData(allExtracted, DESIRED_STAT_KEYS);

      if (!structuredEntries.length && allWords.length) {
        const wordAttributes = parseDataFromVisionWords(allWords, DESIRED_STAT_KEYS);
        attributes = DESIRED_STAT_KEYS.reduce((merged, key) => {
          if (merged[key] === "NA" && wordAttributes[key] !== "NA") {
            merged[key] = wordAttributes[key];
          }

          return merged;
        }, { ...attributes });
      }

      let missingKeys = DESIRED_STAT_KEYS.filter((key) => attributes[key] === "NA");

      const extractedCount = DESIRED_STAT_KEYS.length - missingKeys.length;

      if (extractedCount === 0) {
        throw new Error("No recognizable stat labels were found. The saved player data was not changed.");
      }

      if (missingKeys.length) {
        setStatsError(
          `Extracted ${extractedCount}/${DESIRED_STAT_KEYS.length} stat fields. Missing: ${missingKeys.slice(0, 6).join(", ")}${missingKeys.length > 6 ? "..." : ""}`,
        );
      }

      setText(formatRawExtractedValues(attributes, DESIRED_STAT_KEYS));

      attributes["Archer Atlantis"] = "0";
      attributes["Cavalry Atlantis"] = "0";
      attributes["Siege Atlantis"] = "0";

      const calculatedStats = calculateStatOutputs(attributes, statWeights);
      Object.assign(attributes, calculatedStats);

      setDataTable((prev) => ({ ...prev, [playerName]: attributes }));
      await handleUpdate(playerName, attributes);
    } catch (error) {
      console.error("Error extracting player stats:", error);
      setStatsError(error.message || "Could not extract player stats from the uploaded image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 }, px: { xs: 0, sm: 2 } }}>
        <Box
          component={Paper}
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            mb: 3,
            borderRadius: 2,
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 18px 45px rgba(15,23,42,0.06)",
          }}
        >
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: "text.primary" }}>
              Data Upload
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Extract Last Land stat screenshots, review calculated fields, and update saved player records.
            </Typography>
          </Stack>
          <TextField
            label="Enter Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
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

        {statsError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {statsError}
          </Alert>
        )}

        <Suspense fallback={<Stack spacing={1}>
          <Skeleton variant="rectangular" height={40} />
          <Skeleton variant="rectangular" height={40} />
          <Skeleton variant="rectangular" height={40} />
        </Stack>}>
          {statsLoading && (
            <Stack spacing={1} sx={{ mb: 3 }}>
              <Skeleton variant="rectangular" height={36} />
              <Skeleton variant="rectangular" height={36} />
              <Skeleton variant="rectangular" height={36} />
            </Stack>
          )}
          {Object.entries(dataTable).length > 0 && (
            <DataTable
              tableData={dataTable}
              desiredKeys={DESIRED_STAT_KEYS}
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
    </Box>
  );
}
