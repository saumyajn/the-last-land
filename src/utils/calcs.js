export const getNumber = (val) => parseFloat(val?.toString().replace(/[^\d.]/g, "")) || 0;
export const calcs = (attributes, role, atlValue) => {


    const atk = getNumber(attributes["Troop Attack"]);
    const dmg = getNumber(attributes["Troop Damage"]);
    const bless = getNumber(attributes["Troop Attack Blessing"]);
    let varAtk, varDmg, varBless;

    if (role === "archer") {

        varAtk = getNumber(attributes["Archer Attack"]);
        varDmg = getNumber(attributes["Archer Damage"]);
        varBless = getNumber(attributes["Archer Attack Blessing"]);
    }
    else {
        varAtk = getNumber(attributes["Cavalry Attack"]);
        varDmg = getNumber(attributes["Cavalry Damage"]);
        varBless = getNumber(attributes["Cavalry Attack Blessing"]);
    }

    const AtlData = getNumber(atlValue);
    const lethal = getNumber(attributes["Lethal Hit Rate"]);

    const part1 = Math.pow(varAtk + atk, 0.95);
    const part2 = Math.pow(bless + varBless, 0.9);

    const part3 = (dmg + varDmg + AtlData) / 100
    const part4 = (part1 * part2 * (1 + part3));

    const powerScore = (part4 * (1 + (lethal / 100))) / 1000;
    return powerScore.toFixed(5);

}
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