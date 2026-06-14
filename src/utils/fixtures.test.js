import { calcs } from "./calcs";
import { parseData } from "./parseData";
import { buildReportEntryFromOcr, cleanReportOcrValues } from "./reportExtraction";
import {
  reportOcrCleanupFixtures,
  STAT_DESIRED_KEYS,
  statOcrFixtures,
} from "../testFixtures/lastLandFixtures";

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
      const cleanValues = cleanReportOcrValues(fixture.rawText);
      const { entry } = buildReportEntryFromOcr(fixture.rawText);

      expect(cleanValues).toEqual(fixture.expectedCleanValues);
      expect(entry).toEqual(fixture.expectedEntry);
    },
  );
});
