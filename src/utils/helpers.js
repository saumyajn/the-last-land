// Helper to build copyable TSV content
export const buildCopyableTable = (names, localData, desiredKeys) => {
  const headers = ["Name", ...desiredKeys, "Multiplier", "Archer Atlantis", "Cavalry Atlantis", "Final Archer Damage", "Final Cavalry Damage"];
  
  const rows = names.map((name) => {
    const rowData = localData[name];
    return [
      name,
      ...desiredKeys.map((key) => removePercentage(rowData[key]) ?? ""),
      removePercentage(rowData["Multiplier"]) ?? "",
      removePercentage(rowData["Archer Atlantis"]) ?? "",
      removePercentage(rowData["Cavalry Atlantis"]) ?? "",
      removePercentage(rowData["Final Archer Damage"]) ?? "",
      removePercentage(rowData["Final Cavalry Damage"]) ?? ""
    ];
  });

  const tsvContent = [headers, ...rows]
    .map(row => row.join("\t"))
    .join("\n");

  return tsvContent;
};


// Utility to remove percentage symbol from string value
export const removePercentage = (value) => {
  if (typeof value === "string") {
    return value.replace(/%/g, "");
  }
  return value;
};