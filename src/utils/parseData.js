export const parseData = (rawText, desiredKeys) => {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const attributes = {};

  // Sort keys by length descending to match longest phrases first
  const sortedKeys = [...desiredKeys].sort((a, b) => b.length - a.length);

  // 🔥 FIX 2: Keep track of lines we've already parsed so we don't reuse them
  const usedIndexes = new Set();

  for (const key of sortedKeys) {
    const regex = new RegExp(`${key}(?![a-zA-Z])`, 'i');
    
    // Find the index of the match, completely ignoring lines we've already used
    const index = lines.findIndex((line, i) => !usedIndexes.has(i) && regex.test(line));

    if (index !== -1) {
      // Mark the label line as used
      usedIndexes.add(index);
      
      // Try to find the number on the EXACT SAME line first
      let valueMatch = lines[index].match(/\d+[\d,.]*%?/);
      
      // 🔥 FIX 1: If no number is on the same line, check the NEXT line down
      if (!valueMatch && index + 1 < lines.length) {
        valueMatch = lines[index + 1].match(/\d+[\d,.]*%?/);
        if (valueMatch) {
          // If we used the next line for the value, mark it as used too
          usedIndexes.add(index + 1); 
        }
      }

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