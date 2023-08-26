import { firefox } from "@playwright/test";
import mocha from "mocha";
import { findAll } from "./browser.js";

const { describe, it } = mocha;

describe("find all elements on page by selector", () => {
  it("find existing", async () => {
    const browser = await firefox.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(
      `file:///Users/naftalibeder/code/finance/extractor/utils/fixtures/iframes.html` // TODO: Make path relative to project.
    );

    let resultTexts: (string | null)[] = [];
    try {
      const selector = ".monkey";
      const locs = await findAll(page, selector);
      resultTexts = await Promise.all(locs.map((o) => o.textContent()));
    } catch (e) {
      throw e;
    }

    const expectedTexts = ["I am an outer monkey!", "I am an inner monkey!"];

    if (JSON.stringify(expectedTexts) !== JSON.stringify(resultTexts)) {
      throw new Error(
        `Incorrect results; expected '${expectedTexts}', got '${resultTexts}'`
      );
    }

    await browser.close();
  }).timeout(0);
});
