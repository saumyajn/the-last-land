export const parseData = (rawText, desiredKeys) => {
    const lines = rawText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

   
    const attributes = {};

    for (const key of desiredKeys) {
        const matchLine = lines.find((line) => line.toLowerCase().includes(key.toLowerCase()));
        if (matchLine) {
          const valueMatch = matchLine.match(/\d+[\d,.]*%?/);
          attributes[key] = valueMatch ? valueMatch[0] : "NA";
        } else {
          attributes[key] = "NA";
        }
      }
      desiredKeys.forEach((key) => {
        if (!attributes[key]) attributes[key] = "NA";
      });

    console.log(attributes)

    return attributes;
};
