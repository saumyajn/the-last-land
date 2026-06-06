import { calcs } from "./calcs";
import { parseData } from "./parseData";
import {
  reportOcrCleanupFixtures,
  STAT_DESIRED_KEYS,
  statOcrFixtures,
} from "../testFixtures/lastLandFixtures";

const cleanReportOcrValuesLikeReportPage = (ocrText) =>
  ocrText
    .replace(/[Oo]/g, "0")
    .replace(/[,.]/g, "")
    .replace(/[^0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);

describe("Last Land fixture dataset", () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it.each(statOcrFixtures)(
    "parses stat OCR fixture without changing current outputs: $id",
    (fixture) => {
      const parsed = parseData(fixture.rawText, STAT_DESIRED_KEYS);

      expect(parsed).toEqual(fixture.expectedParsed);
      expect(calcs(parsed, "archer", fixture.atlantis.archer)).toBe(
        fixture.expectedFinalDamage.archer,
      );
      expect(calcs(parsed, "cavalry", fixture.atlantis.cavalry)).toBe(
        fixture.expectedFinalDamage.cavalry,
      );
      expect(calcs(parsed, "siege", fixture.atlantis.siege)).toBe(
        fixture.expectedFinalDamage.siege,
      );
    },
  );

  it.each(reportOcrCleanupFixtures)(
    "documents current report OCR cleanup expectation: $id",
    (fixture) => {
      const cleanValues = cleanReportOcrValuesLikeReportPage(fixture.rawText);
      const labels = ["Kills", "Losses", "Wounded", "Survivors"];
      const entry = {};

      labels.forEach((label, index) => {
        entry[label] = cleanValues[index] || "0";
      });

      expect(cleanValues).toEqual(fixture.expectedCleanValues);
      expect(entry).toEqual(fixture.expectedEntry);
    },
  );
});
