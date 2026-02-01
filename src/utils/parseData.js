export const parseData = (rawText, desiredKeys) => {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const attributes = {};

  // Sort keys by length descending to match longest phrases first
  // This prevents "Troop Attack" matching "Troop Attack Blessing" prematurely
  const sortedKeys = [...desiredKeys].sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    // Find a line that starts with the key OR contains the key followed by a non-letter char
    // This regex ensures we don't match "Troop Attack" inside "Troop Attack Blessing"
    const regex = new RegExp(`${key}(?![a-zA-Z])`, 'i');
    
    const matchLine = lines.find((line) => regex.test(line));

    if (matchLine) {
      // Improved matching for numbers: handles 1,234.56%
      const valueMatch = matchLine.match(/[\d,.]+%?/);
      attributes[key] = valueMatch ? valueMatch[0] : "NA";
    } else {
      attributes[key] = "NA";
    }
  }

  // Ensure all original keys exist in the object
  desiredKeys.forEach((key) => {
    if (!attributes[key]) attributes[key] = "NA";
  });

  console.log("Parsed attributes:", attributes);
  return attributes;
};