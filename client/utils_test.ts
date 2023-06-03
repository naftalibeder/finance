import { daysBetweenDates } from "./utils.js";

describe("date handling", () => {
  it("count days between dates", () => {
    const days = daysBetweenDates(new Date(2020, 1, 2), new Date(2020, 1, 5));
    if (days.length !== 4) {
      throw new Error("wrong day count");
    }
  });
});
