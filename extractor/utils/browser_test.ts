import { firefox } from "@playwright/test";
import mocha from "mocha";
import { findAll, findFirst } from "./browser.js";

const { describe, it } = mocha;

// TODO: Make path relative to project.
const url = `file:///Users/naftalibeder/code/finance/extractor/utils/fixtures/iframes.html`;

describe("find all elements on page by selector", () => {
  it("find existing", async () => {
    const browser = await firefox.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);

    const selector = ".monkey";
    const locs = await findAll(page, selector, { timeout: 1000 });
    const resultTexts = await Promise.all(locs.map((o) => o.textContent()));
    const expectedTexts = ["I am an outer monkey!", "I am an inner monkey!"];
    if (JSON.stringify(expectedTexts) !== JSON.stringify(resultTexts)) {
      throw new Error(
        `Incorrect results; expected '${expectedTexts}', got '${resultTexts}'`
      );
    }

    await browser.close();
  }).timeout(0);

  it("find non-existing", async () => {
    const browser = await firefox.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);

    const selector = ".not-monkey";
    const loc = await findFirst(page, selector, { timeout: 1000 });
    const resultText = await loc?.textContent();
    if (loc) {
      throw new Error(
        `Incorrect results; expected no results, got '${resultText}'`
      );
    }

    await browser.close();
  }).timeout(0);
});
