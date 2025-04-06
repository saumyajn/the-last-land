export const calcs = (attributes, role, atlValue) => {

    const getNumber = (val) => parseFloat(val?.toString().replace(/[^\d.]/g, "")) || 0;
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


    // const part1 = Math.pow(archerAtk + atk, 0.95);
    // console.log(part1);
    // const part2 = Math.pow(bless + archerBless, 0.9);
    // console.log(part2);
    // const part3 = (1 + ((dmg + archerDmg + archerAtl) / 100)) * ((1 + lethal) / 100);
    // console.log(part3)
    // const powerScore = (part1 * part2 * part3) / 1000;
    // console.log(powerScore)

    const part1 = Math.pow(varAtk + atk, 0.95);
    const part2 = Math.pow(bless + varBless, 0.9);

    const part3 = (dmg + varDmg + AtlData) / 100
    const part4 = (part1 * part2 * (1 + part3));
    console.log("part4"+part4)
    const powerScore = (part4 * (1 + (lethal / 100))) / 1000;
    console.log(powerScore)
    return powerScore.toFixed(5);

}