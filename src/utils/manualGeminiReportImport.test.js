import {
  matchPlayerName,
  normalizeReportData,
  parseManualGeminiReportImport,
} from "./manualGeminiReportImport";

describe("manualGeminiReportImport", () => {
  it("normalizes report rows and fills missing troop rows", () => {
    const data = normalizeReportData({
      "T10 Archer": {
        Kills: "1,234",
        Losses: "5",
        Wounded: "6",
        Survivors: "7",
      },
    });

    expect(data.T10_archer).toEqual({
      Kills: "1234",
      Losses: "5",
      Wounded: "6",
      Survivors: "7",
    });
    expect(data.T10_cavalry).toEqual({
      Kills: "0",
      Losses: "0",
      Wounded: "0",
      Survivors: "0",
    });
  });

  it("matches exact and close player names", () => {
    expect(matchPlayerName("SAUMYA", ["Saumya", "Other Player"])).toEqual({
      matchedPlayerName: "Saumya",
      matchConfidence: "high",
      matchScore: 1,
    });

    expect(matchPlayerName("Sawmya", ["Saumya"]).matchedPlayerName).toBe("Saumya");
  });

  it("parses Gemini JSON and prepares review rows", () => {
    const rows = parseManualGeminiReportImport(
      [
        "```json",
        JSON.stringify({
          reports: [
            {
              playerName: "[ABC] SAUMYA",
              timestamp: "00:12",
              data: {
                T10_archer: {
                  Kills: "10,000",
                  Losses: 100,
                  Wounded: 200,
                  Survivors: 9700,
                },
              },
            },
            {
              playerName: "Unknown Member",
              data: {
                T7_cavalry: {
                  Kills: 12,
                  Losses: 1,
                  Wounded: 2,
                  Survivors: 3,
                },
              },
            },
          ],
        }),
        "```",
      ].join("\n"),
      ["Saumya"],
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      rawPlayerName: "[ABC] SAUMYA",
      matchedPlayerName: "Saumya",
      matchConfidence: "high",
      timestamp: "00:12",
    });
    expect(rows[0].data.T10_archer.Kills).toBe("10000");
    expect(rows[1]).toMatchObject({
      rawPlayerName: "Unknown Member",
      matchedPlayerName: "",
      matchConfidence: "none",
    });
  });
});
