import mocha from "mocha";
import { nextOccurrenceOfTime } from ".";

const { describe, it } = mocha;

describe("find next occurrence of time", () => {
  it("current time is before target time", () => {
    const from = new Date(2023, 4, 1, 3, 55);
    const to = nextOccurrenceOfTime({ from, toHr: 6, toMin: 15 });
    if (to.toISOString() !== "2023-05-01T11:15:00.000Z") {
      throw new Error("incorrect target date");
    }
  });

  it("current time is after target time", () => {
    const from = new Date(2023, 4, 1, 17, 3);
    const to = nextOccurrenceOfTime({ from, toHr: 6, toMin: 15 });
    if (to.toISOString() !== "2023-05-02T11:15:00.000Z") {
      throw new Error("incorrect target date");
    }
  });
});
