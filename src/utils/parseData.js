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
    .replace(/^-/, "");

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
