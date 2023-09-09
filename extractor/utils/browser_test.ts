import path from "path";
import { firefox } from "@playwright/test";
import mocha from "mocha";
import { findFirst } from "./browser.js";

const { describe, it } = mocha;

const url = path.join(
  import.meta.url,
  "..",
  "..",
  "..", // Back out of `dist` directory.
  "utils",
  "fixtures",
  "iframes.html"
);

describe("find all elements on page by selector", () => {
  it("find existing", async () => {
    const browser = await firefox.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);

    const selector = ".monkey-inner";
    const loc = await findFirst(page, selector, { timeout: 1000 });
    const resultText = await loc?.textContent();
    const expectedText = "I am an inner monkey!";
    if (expectedText !== resultText) {
      throw new Error(
        `Incorrect results; expected '${expectedText}', got '${resultText}'`
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
    if (loc) {
      const resultText = await loc.textContent();
      throw new Error(
        `Incorrect results; expected no results, got '${resultText}'`
      );
    }

    await browser.close();
  }).timeout(0);
});
