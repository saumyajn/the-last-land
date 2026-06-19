const NUMBER_PATTERN = /-?\d[\d,.]*\s*%?/;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeOcrText = (rawText = "") =>
  rawText
    .replace(/[\uFF1A:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildLabelRegex = (key) => {
  const flexibleKey = key
    .split(/\s+/)
    .map(escapeRegex)
    .join("\\s+");

  return new RegExp(`(^|[^a-zA-Z])(${flexibleKey})(?![a-zA-Z])`, "gi");
};

const normalizeValue = (value) =>
  value
    .replace(/\s+/g, "")
    .replace(/,/g, "")
    .replace(/^-/, "");

const normalizeLabel = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const wordCenterY = (word) => Number(word.y || 0) + Number(word.height || 0) / 2;
const wordCenterX = (word) => Number(word.x || 0) + Number(word.width || 0) / 2;

const isNumberWord = (word) => NUMBER_PATTERN.test(String(word.text || ""));

const getNumberValue = (word) => {
  const match = String(word.text || "").match(NUMBER_PATTERN);
  return match ? normalizeValue(match[0]) : null;
};

const buildSortedWords = (words = []) =>
  words
    .filter((word) => word?.text)
    .map((word) => ({
      ...word,
      x: Number(word.x || 0),
      y: Number(word.y || 0),
      width: Number(word.width || 0),
      height: Number(word.height || 0),
    }))
    .sort((a, b) => a.y - b.y || a.x - b.x);

const findLabelBoxes = (words, desiredKeys) => {
  const sortedWords = buildSortedWords(words);
  const matches = [];

  desiredKeys.forEach((key) => {
    const keyParts = key
      .split(/\s+/)
      .map(normalizeLabel)
      .filter(Boolean);

    if (!keyParts.length) return;

    for (let index = 0; index <= sortedWords.length - keyParts.length; index += 1) {
      const slice = sortedWords.slice(index, index + keyParts.length);
      const sliceParts = slice.map((word) => normalizeLabel(word.text));

      if (sliceParts.join("") !== keyParts.join("")) continue;

      const minX = Math.min(...slice.map((word) => word.x));
      const minY = Math.min(...slice.map((word) => word.y));
      const maxX = Math.max(...slice.map((word) => word.x + word.width));
      const maxY = Math.max(...slice.map((word) => word.y + word.height));

      matches.push({
        key,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        right: maxX,
        bottom: maxY,
        centerY: minY + (maxY - minY) / 2,
      });
    }
  });

  return matches
    .sort((a, b) => a.y - b.y || a.x - b.x || b.width - a.width)
    .reduce((accepted, match) => {
      const overlapsLongerLabel = accepted.some(
        (existing) => match.x < existing.right && match.right > existing.x && Math.abs(match.centerY - existing.centerY) < Math.max(match.height, existing.height),
      );

      if (!overlapsLongerLabel) {
        accepted.push(match);
      }

      return accepted;
    }, [])
    .sort((a, b) => a.y - b.y || a.x - b.x);
};

const findBestValueForLabel = (label, numberWords, nextLabel) => {
  const rowTolerance = Math.max(18, label.height * 1.4);
  const searchBottom = nextLabel ? nextLabel.y - 2 : Number.POSITIVE_INFINITY;

  const candidates = numberWords
    .map((word) => {
      const centerY = wordCenterY(word);
      const centerX = wordCenterX(word);
      const sameRow = Math.abs(centerY - label.centerY) <= rowTolerance;
      const belowLabel = centerY > label.centerY && centerY < searchBottom;
      const rightOfLabel = centerX >= label.x - 10;

      if (!sameRow && !belowLabel) return null;
      if (!rightOfLabel) return null;

      const yDistance = Math.abs(centerY - label.centerY);
      const xDistance = Math.max(0, centerX - label.right);

      return {
        word,
        value: getNumberValue(word),
        score: sameRow ? xDistance : 1000 + yDistance + xDistance * 0.05,
      };
    })
    .filter((candidate) => candidate?.value)
    .sort((a, b) => a.score - b.score);

  return candidates[0]?.value || "NA";
};

const findLabelMatches = (text, desiredKeys) => {
  const matches = [];

  desiredKeys.forEach((key) => {
    const regex = buildLabelRegex(key);
    let match;

    while ((match = regex.exec(text)) !== null) {
      const leadingLength = match[1]?.length || 0;
      const start = match.index + leadingLength;
      const label = match[2];

      matches.push({
        key,
        start,
        end: start + label.length,
        length: label.length,
      });
    }
  });

  return matches
    .sort((a, b) => a.start - b.start || b.length - a.length)
    .reduce((accepted, match) => {
      const overlapsLongerLabel = accepted.some(
        (existing) => match.start < existing.end && match.end > existing.start,
      );

      if (!overlapsLongerLabel) {
        accepted.push(match);
      }

      return accepted;
    }, [])
    .sort((a, b) => a.start - b.start);
};

export const parseData = (rawText, desiredKeys) => {
  const text = normalizeOcrText(rawText);
  const labelMatches = findLabelMatches(text, desiredKeys);
  const attributes = Object.fromEntries(desiredKeys.map((key) => [key, "NA"]));

  labelMatches.forEach((match, index) => {
    const nextLabelStart = labelMatches[index + 1]?.start ?? text.length;
    const valueText = text.slice(match.end, nextLabelStart);
    const valueMatch = valueText.match(NUMBER_PATTERN);

    attributes[match.key] = valueMatch ? normalizeValue(valueMatch[0]) : "NA";
  });

  if (process.env.NODE_ENV === "development") {
    console.log("Parsed attributes:", attributes);
  }

  return attributes;
};

export const parseDataFromVisionWords = (words = [], desiredKeys = []) => {
  const attributes = Object.fromEntries(desiredKeys.map((key) => [key, "NA"]));
  const labelBoxes = findLabelBoxes(words, desiredKeys);
  const numberWords = buildSortedWords(words).filter(isNumberWord);

  labelBoxes.forEach((label, index) => {
    const nextLabel = labelBoxes[index + 1];
    attributes[label.key] = findBestValueForLabel(label, numberWords, nextLabel);
  });

  if (process.env.NODE_ENV === "development") {
    console.log("Parsed attributes from OCR words:", attributes);
  }

  return attributes;
};
