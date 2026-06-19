import { parseData, parseDataFromVisionWords } from "./parseData";

describe("parseData", () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("preserves current OCR label matching and next-line value behavior", () => {
    const rawText = [
      "Troop Attack Blessing",
      "7.5%",
      "Troop Attack",
      "123.4%",
      "Archer Damage Received 15%",
      "Archer Attack 222.2%",
    ].join("\n");

    const desiredKeys = [
      "Troop Attack",
      "Troop Attack Blessing",
      "Archer Attack",
      "Archer Damage Received",
      "Missing Stat",
    ];

    expect(parseData(rawText, desiredKeys)).toEqual({
      "Troop Attack": "123.4%",
      "Troop Attack Blessing": "7.5%",
      "Archer Attack": "222.2%",
      "Archer Damage Received": "15%",
      "Missing Stat": "NA",
    });
  });

  it("does not reuse a line once a longer matching key has consumed it", () => {
    const rawText = [
      "Troop Damage Received 11%",
      "Troop Damage 9%",
    ].join("\n");

    const desiredKeys = ["Troop Damage", "Troop Damage Received"];

    expect(parseData(rawText, desiredKeys)).toEqual({
      "Troop Damage": "9%",
      "Troop Damage Received": "11%",
    });
  });

  it("extracts multiple labels from one OCR line", () => {
    const rawText = "Troop Attack 123.4% Troop Health 88.1% Troop Defense 77%";
    const desiredKeys = ["Troop Attack", "Troop Health", "Troop Defense"];

    expect(parseData(rawText, desiredKeys)).toEqual({
      "Troop Attack": "123.4%",
      "Troop Health": "88.1%",
      "Troop Defense": "77%",
    });
  });

  it("accepts plural Troops labels for troop stats", () => {
    const rawText = [
      "Troops Attack",
      "226.6%",
      "Troops Health 227.6%",
      "Troops Defense",
      "241.1%",
      "Troops Damage Received",
      "-41.5%",
      "Troops Protection Bless",
      "221.36%",
    ].join("\n");
    const desiredKeys = [
      "Troop Attack",
      "Troop Health",
      "Troop Defense",
      "Troop Damage Received",
      "Troop Protection Blessing",
    ];

    expect(parseData(rawText, desiredKeys)).toEqual({
      "Troop Attack": "226.6%",
      "Troop Health": "227.6%",
      "Troop Defense": "241.1%",
      "Troop Damage Received": "41.5%",
      "Troop Protection Blessing": "221.36%",
    });
  });

  it("does not borrow the next label value when a matched label has no value", () => {
    const rawText = [
      "Troop Attack",
      "Troop Health 88.1%",
    ].join("\n");
    const desiredKeys = ["Troop Attack", "Troop Health"];

    expect(parseData(rawText, desiredKeys)).toEqual({
      "Troop Attack": "NA",
      "Troop Health": "88.1%",
    });
  });

  it("recovers stacked labels followed by stacked values from OCR line order", () => {
    const rawText = [
      "Cavalry Protection Blessing",
      "Archer Attack",
      "Archer Health",
      "Archer Defense",
      "300%",
      "1863%",
      "1609.35%",
      "1110%",
      "Archer Damage",
      "154.25%",
    ].join("\n");
    const desiredKeys = [
      "Cavalry Protection Blessing",
      "Archer Attack",
      "Archer Health",
      "Archer Defense",
      "Archer Damage",
    ];

    expect(parseData(rawText, desiredKeys)).toEqual({
      "Cavalry Protection Blessing": "300%",
      "Archer Attack": "1863%",
      "Archer Health": "1609.35%",
      "Archer Defense": "1110%",
      "Archer Damage": "154.25%",
    });
  });

  it("parses the pasted raw OCR sample with stacked archer labels", () => {
    const rawText = [
      "Infantry Protection Blessing",
      "338%",
      "Cavalry Attack",
      "2209.7%",
      "Cavalry Health",
      "1769.7%",
      "Cavalry Defense",
      "975%",
      "Cavalry Damage",
      "166.75%",
      "Cavalry Damage Received",
      "-138.75%",
      "Cavalry Attack Blessing",
      "528%",
      "Cavalry Protection Blessing",
      "Archer Attack",
      "Archer Health",
      "Archer Defense",
      "300%",
      "1863%",
      "1609.35%",
      "1110%",
      "Archer Damage",
      "154.25%",
      "Archer Damage Received",
      "-144.75%",
      "Archer Attack Blessing",
      "445%",
      "Archer Protection Blessing",
      "214%",
      "Siege Attack",
      "1294.5%",
      "Siege Health",
      "620%",
      "Siege Defense",
      "840%",
      "Siege Damage",
      "47%",
      "Siege Damage Received",
      "-41%",
      "Siege Attack Blessing",
      "239%",
      "Siege Protection Blessing",
      "130%",
      "Troop Attack",
      "226.6%",
      "Troop Health",
      "227.6%",
      "Troop Defense",
      "241.1%",
      "Troop Damage",
      "41.5%",
      "Troop Damage Received",
      "-41.5%",
      "Troop Attack Blessing",
      "600%",
      "Troop Protection Blessing",
      "221.36%",
      "Revive",
      "26%",
      "Lethal Hit Rate",
      "24%",
    ].join("\n");
    const desiredKeys = [
      "Troop Attack",
      "Troop Health",
      "Troop Defense",
      "Troop Damage",
      "Troop Damage Received",
      "Troop Attack Blessing",
      "Troop Protection Blessing",
      "Archer Attack",
      "Archer Health",
      "Archer Defense",
      "Archer Damage",
      "Archer Damage Received",
      "Archer Attack Blessing",
      "Archer Protection Blessing",
      "Cavalry Attack",
      "Cavalry Health",
      "Cavalry Defense",
      "Cavalry Damage",
      "Cavalry Damage Received",
      "Cavalry Attack Blessing",
      "Cavalry Protection Blessing",
      "Siege Attack",
      "Siege Health",
      "Siege Defense",
      "Siege Damage",
      "Siege Damage Received",
      "Siege Attack Blessing",
      "Siege Protection Blessing",
      "Lethal Hit Rate",
    ];

    const parsed = parseData(rawText, desiredKeys);

    expect(parsed["Cavalry Protection Blessing"]).toBe("300%");
    expect(parsed["Archer Attack"]).toBe("1863%");
    expect(parsed["Archer Health"]).toBe("1609.35%");
    expect(parsed["Archer Defense"]).toBe("1110%");
    expect(Object.values(parsed)).not.toContain("NA");
  });

  it("extracts values from Vision word boxes by row position", () => {
    const word = (text, x, y, width = 40, height = 12) => ({ text, x, y, width, height });
    const words = [
      word("Troop", 10, 10),
      word("Attack", 58, 10),
      word("123.4%", 260, 10, 52),
      word("Troop", 10, 34),
      word("Health", 58, 34),
      word("88.1%", 260, 34, 46),
      word("Archer", 10, 58),
      word("Damage", 68, 58),
      word("Received", 128, 58),
      word("-15%", 260, 58, 42),
    ];

    expect(parseDataFromVisionWords(words, [
      "Troop Attack",
      "Troop Health",
      "Archer Damage Received",
      "Missing Stat",
    ])).toEqual({
      "Troop Attack": "123.4%",
      "Troop Health": "88.1%",
      "Archer Damage Received": "15%",
      "Missing Stat": "NA",
    });
  });

  it("matches plural Troops labels in Vision word boxes", () => {
    const word = (text, x, y, width = 40, height = 12) => ({ text, x, y, width, height });
    const words = [
      word("Troops", 10, 10, 48),
      word("Attack", 66, 10),
      word("226.6%", 260, 10, 52),
      word("Troops", 10, 34, 48),
      word("Protection", 66, 34, 78),
      word("Bless", 150, 34, 42),
      word("221.36%", 260, 34, 58),
    ];

    expect(parseDataFromVisionWords(words, [
      "Troop Attack",
      "Troop Protection Blessing",
    ])).toEqual({
      "Troop Attack": "226.6%",
      "Troop Protection Blessing": "221.36%",
    });
  });
});
