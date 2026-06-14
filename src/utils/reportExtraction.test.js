import {
  buildReportEntryFromOcr,
  cleanReportOcrValues,
  estimateReportRowsFromOcrText,
  findReportHeaderColumns,
  parseReportRowsFromOcrText,
  parseReportTableFromVisionWords,
  rectanglesOverlap,
} from "./reportExtraction";

describe("reportExtraction", () => {
  it("keeps O-to-0 correction inside numeric-looking report values", () => {
    expect(cleanReportOcrValues("12,O34 56.7 8,901 2O5")).toEqual([
      "12034",
      "567",
      "8901",
      "205",
    ]);
  });

  it("does not create phantom zeroes from ordinary words", () => {
    expect(cleanReportOcrValues("No text found Survivors extra")).toEqual([]);
  });

  it("builds a valid report row only when every report column is present", () => {
    expect(buildReportEntryFromOcr("12,O34 56.7 8,901 2O5")).toEqual({
      entry: {
        Kills: "12034",
        Losses: "567",
        Wounded: "8901",
        Survivors: "205",
      },
      isValid: true,
      values: ["12034", "567", "8901", "205"],
    });

    expect(buildReportEntryFromOcr("12034 567")).toMatchObject({
      isValid: false,
      values: ["12034", "567"],
    });
  });

  it("detects duplicate row matches by vertical overlap", () => {
    expect(
      rectanglesOverlap(
        { y: 100, height: 40 },
        { y: 108, height: 42 },
      ),
    ).toBe(true);
    expect(
      rectanglesOverlap(
        { y: 100, height: 40 },
        { y: 170, height: 42 },
      ),
    ).toBe(false);
  });

  it("finds table columns from Vision OCR header words", () => {
    const { columns, hasUsableHeader } = findReportHeaderColumns([
      { text: "Troop", x: 22, y: 20, width: 28, height: 10 },
      { text: "Kills", x: 143, y: 20, width: 24, height: 10 },
      { text: "Losses", x: 207, y: 20, width: 38, height: 10 },
      { text: "Wounded", x: 285, y: 20, width: 49, height: 10 },
      { text: "Survives", x: 374, y: 20, width: 46, height: 10 },
    ]);

    expect(hasUsableHeader).toBe(true);
    expect(columns).toMatchObject({
      Kills: 155,
      Losses: 226,
      Wounded: 309.5,
      Survivors: 397,
    });
  });

  it("extracts report rows from Vision OCR word positions", () => {
    const header = [
      { text: "Kills", x: 143, y: 20, width: 24, height: 10 },
      { text: "Losses", x: 207, y: 20, width: 38, height: 10 },
      { text: "Wounded", x: 285, y: 20, width: 49, height: 10 },
      { text: "Survives", x: 374, y: 20, width: 46, height: 10 },
    ];
    const rowOne = [
      { text: "1466", x: 142, y: 50, width: 27, height: 12 },
      { text: "1154", x: 214, y: 50, width: 28, height: 12 },
      { text: "2846", x: 296, y: 50, width: 28, height: 12 },
      { text: "0", x: 394, y: 50, width: 7, height: 12 },
    ];
    const rowTwo = [
      { text: "6140", x: 142, y: 91, width: 27, height: 12 },
      { text: "0", x: 224, y: 91, width: 7, height: 12 },
      { text: "0", x: 306, y: 91, width: 7, height: 12 },
      { text: "13000", x: 381, y: 91, width: 36, height: 12 },
    ];

    const parsed = parseReportTableFromVisionWords([...header, ...rowTwo, ...rowOne], {
      rowKeys: ["T10_guards", "T10_cavalry"],
    });

    expect(parsed.reason).toBe("ok");
    expect(parsed.entriesByTroopType).toEqual({
      T10_guards: {
        Kills: "1466",
        Losses: "1154",
        Wounded: "2846",
        Survivors: "0",
      },
      T10_cavalry: {
        Kills: "6140",
        Losses: "0",
        Wounded: "0",
        Survivors: "13000",
      },
    });
  });

  it("extracts report rows from plain OCR text when word boxes are unavailable", () => {
    const ocrText = [
      "Troop",
      "T10.",
      "Kills",
      "Losses",
      "Wounded",
      "Survives",
      "1466",
      "1154",
      "2846",
      "0",
      "T10.",
      "6140",
      "0",
      "0",
      "13000",
      "T9",
      "8547",
      "0",
      "0",
      "10000",
    ].join("\n");

    expect(parseReportRowsFromOcrText(ocrText)).toEqual([
      {
        tier: "T10",
        entry: {
          Kills: "1466",
          Losses: "1154",
          Wounded: "2846",
          Survivors: "0",
        },
        isValid: true,
      },
      {
        tier: "T10",
        entry: {
          Kills: "6140",
          Losses: "0",
          Wounded: "0",
          Survivors: "13000",
        },
        isValid: true,
      },
      {
        tier: "T9",
        entry: {
          Kills: "8547",
          Losses: "0",
          Wounded: "0",
          Survivors: "10000",
        },
        isValid: true,
      },
    ]);
  });

  it("estimates row centers for plain OCR rows", () => {
    const rows = estimateReportRowsFromOcrText("T10\n1\n2\n3\n4\nT9\n5\n6\n7\n8", {
      imageHeight: 334,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].y).toBeCloseTo(106.05, 2);
    expect(rows[1].y).toBeCloseTo(251.34, 2);
  });
});
