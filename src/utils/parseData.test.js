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
});
