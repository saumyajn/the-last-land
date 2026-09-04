import { REPORT_LABELS, TROOP_ORDER } from "./appConstants";

export const GEMINI_REPORT_VIDEO_PROMPT = `Extract every member battle report shown in this video.

Return only valid JSON. Do not use markdown. Do not add explanation.

Use this exact shape:
{
  "reports": [
    {
      "playerName": "name visible in the report",
      "timestamp": "video timestamp if visible or approximate",
      "data": {
        "T10_guards": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
        "T10_cavalry": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
        "T10_archer": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
        "T10_siege": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
        "T9_cavalry": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
        "T9_archer": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
        "T8_cavalry": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
        "T8_archer": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
        "T8_siege": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
        "T7_cavalry": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
        "T7_archer": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 }
      }
    }
  ]
}

Rules:
- Extract one report object for each distinct player report in the video.
- Use the player name visible on the report screen.
- If the same player appears multiple times, keep the clearest complete report.
- Use only the troop keys listed above.
- Use only Kills, Losses, Wounded, and Survivors inside each troop row.
- Remove commas, percent signs, and spaces from numbers.
- If a troop row is missing or unreadable, return zero values for that row.`;

const getEmptyReportData = () =>
  TROOP_ORDER.reduce((report, troopKey) => {
    report[troopKey] = REPORT_LABELS.reduce((row, label) => {
      row[label] = "0";
      return row;
    }, {});
    return report;
  }, {});

const cleanJsonText = (rawText = "") => {
  const trimmed = String(rawText).trim();
  if (!trimmed) return "";

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
};

export const parseGeminiReportJson = (rawText = "") => {
  const cleaned = cleanJsonText(rawText);
  const attempts = [cleaned];

  const firstObject = cleaned.indexOf("{");
  const lastObject = cleaned.lastIndexOf("}");
  if (firstObject !== -1 && lastObject > firstObject) {
    attempts.push(cleaned.slice(firstObject, lastObject + 1));
  }

  const firstArray = cleaned.indexOf("[");
  const lastArray = cleaned.lastIndexOf("]");
  if (firstArray !== -1 && lastArray > firstArray) {
    attempts.push(cleaned.slice(firstArray, lastArray + 1));
  }

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      // Try the next candidate.
    }
  }

  throw new Error("Gemini response is not valid JSON.");
};

const normalizeTroopKey = (key = "") => {
  const normalized = String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
  return TROOP_ORDER.find((troopKey) => troopKey.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized);
};

const normalizeReportValue = (value) => {
  const cleaned = String(value ?? "0").replace(/[^\d.]/g, "");
  const number = Number.parseInt(cleaned, 10);
  return Number.isFinite(number) ? String(number) : "0";
};

export const normalizeReportData = (data = {}) => {
  const report = getEmptyReportData();

  Object.entries(data || {}).forEach(([rawTroopKey, rawRow]) => {
    const troopKey = normalizeTroopKey(rawTroopKey);
    if (!troopKey || !rawRow || typeof rawRow !== "object") return;

    REPORT_LABELS.forEach((label) => {
      report[troopKey][label] = normalizeReportValue(rawRow[label]);
    });
  });

  return report;
};

const getReportsArray = (parsed) => {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.reports)) return parsed.reports;
  if (Array.isArray(parsed?.players)) return parsed.players;
  if (Array.isArray(parsed?.members)) return parsed.members;

  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed).map(([playerName, value]) => ({
      playerName,
      ...(value && typeof value === "object" ? value : {}),
    }));
  }

  return [];
};

export const normalizePlayerName = (name = "") =>
  String(name)
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)|<[^>]*>/g, " ")
    .replace(/[^a-z0-9]/g, "");

const levenshteinDistance = (a, b) => {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
};

export const matchPlayerName = (rawName = "", playerOptions = []) => {
  const normalizedRawName = normalizePlayerName(rawName);
  if (!normalizedRawName) {
    return { matchedPlayerName: "", matchConfidence: "none", matchScore: 0 };
  }

  const candidates = playerOptions
    .map((playerName) => ({
      playerName,
      normalizedName: normalizePlayerName(playerName),
    }))
    .filter((candidate) => candidate.normalizedName);

  const exactMatch = candidates.find((candidate) => candidate.normalizedName === normalizedRawName);
  if (exactMatch) {
    return { matchedPlayerName: exactMatch.playerName, matchConfidence: "high", matchScore: 1 };
  }

  const scored = candidates
    .map((candidate) => {
      const distance = levenshteinDistance(normalizedRawName, candidate.normalizedName);
      const maxLength = Math.max(normalizedRawName.length, candidate.normalizedName.length, 1);
      return {
        playerName: candidate.playerName,
        score: 1 - distance / maxLength,
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score < 0.82) {
    return { matchedPlayerName: "", matchConfidence: "none", matchScore: best?.score || 0 };
  }

  return {
    matchedPlayerName: best.playerName,
    matchConfidence: best.score >= 0.92 ? "high" : "medium",
    matchScore: best.score,
  };
};

export const parseManualGeminiReportImport = (rawText = "", playerOptions = []) => {
  const parsed = parseGeminiReportJson(rawText);
  const reports = getReportsArray(parsed);

  return reports
    .map((report, index) => {
      const rawPlayerName =
        report.playerName ||
        report.rawPlayerName ||
        report.name ||
        report.memberName ||
        "";
      const data = report.data || report.report || report.troops || report;
      const match = matchPlayerName(rawPlayerName, playerOptions);

      return {
        id: `${normalizePlayerName(rawPlayerName) || "report"}-${index}`,
        rawPlayerName,
        timestamp: report.timestamp || report.time || "",
        data: normalizeReportData(data),
        ...match,
      };
    })
    .filter((report) => report.rawPlayerName || Object.keys(report.data).length);
};
