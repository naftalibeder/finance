import fs from "fs";
import { Locator } from "playwright-core";
import { Price } from "shared";
import { Extractor, ExtractorFuncArgs, ExtractorRangeFuncArgs } from "types";
import { toPrice } from "../../utils";
import { getSelectorExists } from "../utils";

class ChaseBankExtractor implements Extractor {
  loadStartPage = async (args: ExtractorFuncArgs) => {
    const { extractor, configAccount, configCredentials, page } = args;
    await page.goto("https://chase.com");
  };

  enterCredentials = async (args: ExtractorFuncArgs) => {
    const { extractor, configAccount, configCredentials, page, log } = args;

    let loc: Locator;

    const loginFrame = page.frameLocator("#logonbox");

    // Sometimes instead of a login form, the page loads a button leading to the
    // login form. This button is inaccessible (?) programmatically, but reloading
    // the page a few times usually prompts the login form to appear.
    while (true) {
      log("Waiting for login page");
      try {
        loc = loginFrame.locator("#userId-text-input-field");
        await loc.waitFor({ state: "attached", timeout: 6000 });
      } catch (e) {
        log("Could not load login page; reloading");
        page.reload();
        continue;
      }
      break;
    }

    loc = loginFrame.locator("#userId-text-input-field");
    await loc.fill(configCredentials.username);

    loc = loginFrame.locator("#password-text-input-field");
    await loc.fill(configCredentials.password);

    loc = loginFrame.locator("#input-rememberMe");
    await loc.click();

    loc = loginFrame.locator("#signin-button");
    await loc.click();
  };

  enterMfaCode = async (args: ExtractorFuncArgs) => {
    const { extractor, configAccount, configCredentials, page } = args;

    let loc: Locator;

    const mfaFrame = page.frames()[0];

    const mfaPageExists = await getSelectorExists(
      mfaFrame,
      "#header-simplerAuth-dropdownoptions-styledselect",
      6000
    );
    if (!mfaPageExists) {
      return;
    }
    loc = mfaFrame.locator("#header-simplerAuth-dropdownoptions-styledselect");
    await loc.click();

    loc = mfaFrame.locator(
      "#container-1-simplerAuth-dropdownoptions-styledselect"
    );
    await loc.click();

    loc = mfaFrame.locator("button[type=submit]").first();
    await loc.click();

    const code = await args.getMfaCode();

    const codeInputFrame = page.frames()[0];

    loc = codeInputFrame.locator("#otpcode_input-input-field");
    await loc.fill(code);

    loc = codeInputFrame.locator("#password_input-input-field");
    await loc.fill(configCredentials.password);

    loc = codeInputFrame.locator("button[type=submit]").first();
    await loc.click();
  };

  scrapeAccountValue = async (args: ExtractorFuncArgs): Promise<Price> => {
    const { extractor, configAccount, configCredentials, page } = args;

    let loc: Locator;

    const dashboardFrame = page.frames()[0];

    loc = dashboardFrame
      .locator(".accounts-blade")
      .filter({
        has: dashboardFrame.locator(
          `[text*="${configAccount.info.number.slice(-4)}"]`
        ),
      })
      .locator(".primary-value");
    const text = await loc.innerText();

    const price = toPrice(text);
    return price;
  };

  scrapeTransactionData = async (
    args: ExtractorRangeFuncArgs
  ): Promise<string> => {
    const { extractor, configAccount, configCredentials, range, page } = args;

    let loc: Locator;

    // Go to history page.

    const dashboardFrame = page.frames()[0];

    loc = dashboardFrame.locator(
      `[text*="${configAccount.info.number.slice(-4)}"]`
    );
    await loc.click();
    await page.waitForTimeout(3000);

    loc = dashboardFrame.locator("#downloadActivityIcon");
    await loc.click();
    await page.waitForTimeout(3000);

    // Set date range.

    loc = dashboardFrame.locator("#select-downloadActivityOptionId");
    await loc.click();
    await page.waitForTimeout(1000);

    loc = dashboardFrame.locator(`[value="DATE_RANGE"]`);
    await loc.click();
    await page.waitForTimeout(1000);

    loc = dashboardFrame.locator("#accountActivityFromDate-input-input");
    await loc.fill(range.start.toLocaleDateString("en-US"));
    await loc.blur();

    loc = dashboardFrame.locator("#accountActivityToDate-input-input");
    await loc.fill(range.end.toLocaleDateString("en-US"));
    await loc.blur();

    await page.waitForTimeout(1000);

    // Export data.

    const downloadPromise = page.waitForEvent("download", { timeout: 6000 });

    loc = dashboardFrame.locator("#download");
    await loc.click();

    // Get data from downloaded file.

    let transactionData: string;
    try {
      const download = await downloadPromise;
      const downloadPath = await download.path();
      transactionData = fs.readFileSync(downloadPath!, {
        encoding: "utf-8",
      });
    } catch (e) {
      throw "Invalid date range";
    }

    return transactionData;
  };

  getDashboardExists = async (args: ExtractorFuncArgs): Promise<boolean> => {
    const { extractor, configAccount, configCredentials, page } = args;

    try {
      const loc = page.frames()[0].locator(".global-nav-position-container");
      await loc.waitFor({ state: "attached", timeout: 500 });
      return true;
    } catch (e) {
      return false;
    }
  };
}

export { ChaseBankExtractor };
