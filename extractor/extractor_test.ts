import path from "path";
import { Browser, Page, firefox } from "@playwright/test";
import mocha from "mocha";
import { getPageKind } from "./utils/browser.js";
import { ExtractorPageKind } from "./types.js";
import { ChaseBankExtractor } from "./extractors/chaseBank.js";

const { setup, teardown, describe, it } = mocha;

const extractor = new ChaseBankExtractor();

const buildUrl = (file: string) => {
  return path.join(
    import.meta.url,
    "..",
    "..", // Back out of `dist` directory.
    "extractors",
    "fixtures",
    file
  );
};

/**
 * A dictionary mapping an html file's name (in the fixtures directory) to the
 * expected page kind.
 */
const dict: Record<string, ExtractorPageKind> = {
  "chaseBankLogin.html": "login",
  "chaseBankMfa.html": "mfa",
  "chaseBankDashboard.html": "dashboard",
};

let browser: Browser;
let page: Page;

setup(async () => {
  browser = await firefox.launch({ headless: true });
  page = await browser.newPage();
});

describe("Identify page kinds", () => {
  for (const [file, kind] of Object.entries(dict)) {
    it(`Identify ${kind} page`, async () => {
      try {
        const url = buildUrl(file);
        console.log(`Checking page at ${file}; expecting '${kind}'`);
        await page.goto(url);
      } catch (e) {
        throw new Error(`${e}`);
      }

      let pageKind: ExtractorPageKind;
      try {
        pageKind = await getPageKind(page, extractor.currentPageMap);
        console.log(`Found page kind: ${pageKind}`);
      } catch (e) {
        throw new Error(`${e}`);
      }

      if (pageKind !== kind) {
        throw new Error(
          `Found incorrect page kind of '${pageKind}'; expected '${kind}'`
        );
      }
    });
  }
});

teardown(async () => {
  await browser?.close();
});
