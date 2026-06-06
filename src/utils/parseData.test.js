import { parseData } from "./parseData";

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
});
