import { REPORT_LABELS } from "./appConstants";

export const DEFAULT_REPORT_MATCH_THRESHOLD = 0.58;
export const DEFAULT_REPORT_LOCAL_ICON_THRESHOLD = 0.5;
export const DEFAULT_REPORT_OCR_SCALE = 2;
export const DEFAULT_REPORT_CROP_WIDTH_MULTIPLIER = 24;

const isZeroLikeToken = (token) => /^[Oo0.,]+$/.test(token);
const normalizeHeader = (text = "") => String(text).toLowerCase().replace(/[^a-z]/g, "");

const HEADER_ALIASES = {
  Kills: ["kills", "kill"],
  Losses: ["losses", "loss"],
  Wounded: ["wounded", "wound"],
  Survivors: ["survivors", "survives", "survive"],
};

const isReportTierLine = (text = "") =>
  /^T\s*(10|[1-9])\b/i.test(String(text).trim().replace(/[.:-]/g, ""));

const isReportHeaderLine = (text = "") => {
  const normalized = normalizeHeader(text);
  return normalized === "troop" || REPORT_LABELS.some((label) =>
    (HEADER_ALIASES[label] || [normalizeHeader(label)]).includes(normalized),
  );
};

export const cleanReportOcrValues = (ocrText = "", maxValues = REPORT_LABELS.length) => {
  return String(ocrText)
    .split(/\s+/)
    .flatMap((token) => {
      const rawToken = token.trim();
      if (!rawToken) return [];

      const hasDigit = /\d/.test(rawToken);
      if (!hasDigit && !isZeroLikeToken(rawToken)) return [];

      const normalized = rawToken.replace(/[Oo]/g, "0").replace(/[,.]/g, "");
      return normalized.match(/\d+/g) || [];
    })
    .slice(0, maxValues);
};

export const buildReportEntryFromOcr = (ocrText = "", labels = REPORT_LABELS) => {
  const values = cleanReportOcrValues(ocrText, labels.length);
  const hasAllColumns = values.length >= labels.length;
  const hasNonZeroValue = values.some((value) => Number.parseInt(value, 10) > 0);

  if (!hasAllColumns || !hasNonZeroValue) {
    return {
      entry: labels.reduce((acc, label) => ({ ...acc, [label]: "0" }), {}),
      isValid: false,
      values,
    };
  }

  return {
    entry: labels.reduce((acc, label, index) => {
      acc[label] = values[index] || "0";
      return acc;
    }, {}),
    isValid: true,
    values,
  };
};

export const parseReportRowsFromOcrText = (ocrText = "", labels = REPORT_LABELS) => {
  const lines = String(ocrText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const rows = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!isReportTierLine(line)) continue;

    const values = [];
    let scanIndex = index + 1;

    while (scanIndex < lines.length && values.length < labels.length) {
      const scanLine = lines[scanIndex];

      if (isReportTierLine(scanLine) && values.length > 0) {
        break;
      }

      if (!isReportHeaderLine(scanLine)) {
        const value = cleanReportOcrValues(scanLine, 1)[0];
        if (value !== undefined) {
          values.push(value);
        }
      }

      scanIndex += 1;
    }

    if (values.length >= labels.length && values.some((value) => Number.parseInt(value, 10) > 0)) {
      rows.push({
        tier: line.replace(/[.:-]/g, "").trim(),
        entry: labels.reduce((acc, label, labelIndex) => {
          acc[label] = values[labelIndex] || "0";
          return acc;
        }, {}),
        isValid: true,
      });
      index = scanIndex - 1;
    }
  }

  return rows;
};

export const estimateReportRowsFromOcrText = (
  ocrText = "",
  {
    imageHeight = 0,
    labels = REPORT_LABELS,
    rowAreaTopRatio = 0.1,
    rowAreaBottomRatio = 0.97,
  } = {},
) => {
  const rows = parseReportRowsFromOcrText(ocrText, labels);

  if (!rows.length || !imageHeight) {
    return rows.map((row) => ({ ...row, y: null }));
  }

  const rowAreaTop = imageHeight * rowAreaTopRatio;
  const rowAreaBottom = imageHeight * rowAreaBottomRatio;
  const rowHeight = (rowAreaBottom - rowAreaTop) / rows.length;

  return rows.map((row, index) => ({
    ...row,
    y: rowAreaTop + rowHeight * (index + 0.5),
  }));
};

export const rectanglesOverlap = (first, second, tolerance = 0.35) => {
  if (!first || !second) return false;

  const firstCenterY = first.y + first.height / 2;
  const secondCenterY = second.y + second.height / 2;
  const rowTolerance = Math.min(first.height, second.height) * tolerance;

  return Math.abs(firstCenterY - secondCenterY) <= rowTolerance;
};

const centerOfWord = (word) => ({
  x: Number(word.x || 0) + Number(word.width || 0) / 2,
  y: Number(word.y || 0) + Number(word.height || 0) / 2,
});

const getNumericValueFromWord = (word) => {
  const values = cleanReportOcrValues(word?.text, 1);
  return values[0] || null;
};

export const findReportHeaderColumns = (words = [], labels = REPORT_LABELS) => {
  const columns = {};
  let headerBottom = 0;

  words.forEach((word) => {
    const normalized = normalizeHeader(word.text);
    const label = labels.find((candidate) =>
      (HEADER_ALIASES[candidate] || [normalizeHeader(candidate)]).includes(normalized),
    );

    if (!label) return;

    const center = centerOfWord(word);
    columns[label] = center.x;
    headerBottom = Math.max(headerBottom, Number(word.y || 0) + Number(word.height || 0));
  });

  return {
    columns,
    headerBottom,
    hasUsableHeader: labels.filter((label) => columns[label] !== undefined).length >= 3,
  };
};

const assignWordToColumn = (word, columns, labels) => {
  const center = centerOfWord(word);
  return labels.reduce(
    (best, label) => {
      if (columns[label] === undefined) return best;

      const distance = Math.abs(center.x - columns[label]);
      return distance < best.distance ? { label, distance } : best;
    },
    { label: null, distance: Number.POSITIVE_INFINITY },
  ).label;
};

const clusterRowsByY = (cellWords, rowTolerance) => {
  const clusters = [];

  [...cellWords]
    .sort((a, b) => centerOfWord(a).y - centerOfWord(b).y)
    .forEach((word) => {
      const centerY = centerOfWord(word).y;
      const cluster = clusters.find((candidate) => Math.abs(candidate.centerY - centerY) <= rowTolerance);

      if (!cluster) {
        clusters.push({ centerY, words: [word] });
        return;
      }

      cluster.words.push(word);
      cluster.centerY =
        cluster.words.reduce((sum, item) => sum + centerOfWord(item).y, 0) / cluster.words.length;
    });

  return clusters.sort((a, b) => a.centerY - b.centerY);
};

const getColumnBands = (columns, labels) => {
  const sorted = labels
    .map((label) => ({ label, x: columns[label] }))
    .filter((column) => Number.isFinite(column.x))
    .sort((a, b) => a.x - b.x);

  return sorted.reduce((bands, column, index) => {
    const previous = sorted[index - 1];
    const next = sorted[index + 1];
    const left = previous ? (previous.x + column.x) / 2 : column.x - ((next?.x - column.x) || 70) / 2;
    const right = next ? (column.x + next.x) / 2 : column.x + ((column.x - previous?.x) || 70) / 2;

    bands[column.label] = { left, right, center: column.x };
    return bands;
  }, {});
};

const assignWordToColumnBand = (word, bands, labels) => {
  const center = centerOfWord(word);
  return labels.find((label) => {
    const band = bands[label];
    return band && center.x >= band.left && center.x < band.right;
  }) || null;
};

const emptyReportEntry = (labels) =>
  labels.reduce((acc, label) => ({ ...acc, [label]: "0" }), {});

export const parseReportTableOneToOne = (
  words = [],
  {
    labels = REPORT_LABELS,
    rowKeys = [],
    rowTolerance = 16,
  } = {},
) => {
  const debug = {
    expectedRows: rowKeys.length,
    rowCount: 0,
    missingRows: [],
    missingCells: [],
    ambiguousCells: [],
    extraRows: [],
  };
  const { columns, headerBottom } = findReportHeaderColumns(words, labels);
  const missingHeaders = labels.filter((label) => columns[label] === undefined);

  if (missingHeaders.length) {
    return {
      isValid: false,
      reason: "missing-header",
      entriesByTroopType: {},
      rows: [],
      columns,
      debug: { ...debug, missingHeaders },
    };
  }

  const bands = getColumnBands(columns, labels);
  const numericWords = words
    .map((word) => ({
      ...word,
      value: getNumericValueFromWord(word),
    }))
    .filter((word) => word.value !== null && centerOfWord(word).y > headerBottom);

  const cellWords = numericWords
    .map((word) => ({
      ...word,
      label: assignWordToColumnBand(word, bands, labels),
    }))
    .filter((word) => word.label);

  const clusters = clusterRowsByY(cellWords, rowTolerance);
  debug.rowCount = clusters.length;

  const rows = clusters.map((cluster, index) => {
    const cells = labels.reduce((acc, label) => ({ ...acc, [label]: [] }), {});

    cluster.words.forEach((word) => {
      cells[word.label].push(word);
    });

    const entry = emptyReportEntry(labels);
    const troopType = rowKeys[index] || null;

    labels.forEach((label) => {
      if (cells[label].length === 1) {
        entry[label] = cells[label][0].value;
      } else if (cells[label].length === 0) {
        debug.missingCells.push({ rowIndex: index, troopType, label });
      } else {
        debug.ambiguousCells.push({
          rowIndex: index,
          troopType,
          label,
          values: cells[label].map((word) => word.value),
        });
      }
    });

    return {
      troopType,
      y: cluster.centerY,
      entry,
      cells,
      isValid: labels.every((label) => cells[label].length === 1),
    };
  });

  if (rowKeys.length && rows.length !== rowKeys.length) {
    if (rows.length < rowKeys.length) {
      debug.missingRows = rowKeys.slice(rows.length);
    } else {
      debug.extraRows = rows.slice(rowKeys.length).map((row, index) => ({
        rowIndex: rowKeys.length + index,
        y: row.y,
      }));
    }

    return {
      isValid: false,
      reason: rows.length < rowKeys.length ? "missing-row" : "extra-row",
      entriesByTroopType: {},
      rows,
      columns,
      debug,
    };
  }

  if (debug.missingCells.length) {
    return {
      isValid: false,
      reason: "missing-cell",
      entriesByTroopType: {},
      rows,
      columns,
      debug,
    };
  }

  if (debug.ambiguousCells.length) {
    return {
      isValid: false,
      reason: "ambiguous-cell",
      entriesByTroopType: {},
      rows,
      columns,
      debug,
    };
  }

  const entriesByTroopType = rows.reduce((acc, row) => {
    if (row.troopType) {
      acc[row.troopType] = row.entry;
    }
    return acc;
  }, {});

  return {
    isValid: true,
    reason: "ok",
    entriesByTroopType,
    rows,
    columns,
    debug,
  };
};

export const parseReportTableFromVisionWords = (
  words = [],
  {
    labels = REPORT_LABELS,
    rowKeys = [],
    rowTolerance = 16,
  } = {},
) => {
  const { columns, headerBottom, hasUsableHeader } = findReportHeaderColumns(words, labels);

  if (!hasUsableHeader) {
    return { rows: [], entriesByTroopType: {}, columns, reason: "missing-header" };
  }

  const numericWords = words
    .map((word) => ({
      ...word,
      value: getNumericValueFromWord(word),
    }))
    .filter((word) => word.value !== null && centerOfWord(word).y > headerBottom);

  const cellWords = numericWords
    .map((word) => ({
      ...word,
      label: assignWordToColumn(word, columns, labels),
    }))
    .filter((word) => word.label);

  const rows = clusterRowsByY(cellWords, rowTolerance)
    .map((cluster, index) => {
      const valuesByLabel = labels.reduce((acc, label) => ({ ...acc, [label]: "0" }), {});

      cluster.words.forEach((word) => {
        valuesByLabel[word.label] = word.value;
      });

      const hasAllColumns = labels.every((label) =>
        cluster.words.some((word) => word.label === label),
      );
      const hasNonZeroValue = labels.some((label) => Number.parseInt(valuesByLabel[label], 10) > 0);

      return {
        troopType: rowKeys[index] || null,
        y: cluster.centerY,
        entry: valuesByLabel,
        isValid: hasAllColumns && hasNonZeroValue,
      };
    })
    .filter((row) => row.isValid);

  const entriesByTroopType = rows.reduce((acc, row) => {
    if (row.troopType) {
      acc[row.troopType] = row.entry;
    }
    return acc;
  }, {});

  return { rows, entriesByTroopType, columns, reason: rows.length ? "ok" : "no-valid-rows" };
};
