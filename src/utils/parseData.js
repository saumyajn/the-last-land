export const parseData = (rawText, desiredKeys) => {
    const lines = rawText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

   
    const attributes = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const key of desiredKeys) {
          if (line.toLowerCase().includes(key.toLowerCase()) && !attributes[key]) {
            const valueLine = lines[i + 1] || "";
            const valueMatch = valueLine.match(/\d+[\d,.]*%?/);
            attributes[key] = valueMatch ? valueMatch[0] : "NA";
          }
        }
      }
      desiredKeys.forEach((key) => {
        if (!attributes[key]) attributes[key] = "NA";
      });

    console.log(attributes)

    return attributes;
};
