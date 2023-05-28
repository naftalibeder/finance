import fs from "fs";
import { Locator } from "playwright-core";
import { Price } from "shared";
import { Extractor, ExtractorFuncArgs, ExtractorRangeFuncArgs } from "types";
import { getSelectorExists } from "../utils";
import { toPrice } from "../../utils";

class CharlesSchwabBankExtractor implements Extractor {
  loadStartPage = async (args: ExtractorFuncArgs) => {
    const { extractor, configAccount, configCredentials, page } = args;
    await page.goto("https://client.schwab.com", { timeout: 6000 });
  };

  enterCredentials = async (args: ExtractorFuncArgs) => {
    const { extractor, configAccount, configCredentials, page, log } = args;

    let loc: Locator;

    const loginFrame = page.frameLocator("#lmsSecondaryLogin");

    while (true) {
      log("Waiting for login page");
      try {
        loc = loginFrame.locator("#loginIdInput");
        await loc.waitFor({ state: "attached", timeout: 6000 });
      } catch (e) {
        page.reload();
        continue;
      }
      break;
    }

    loc = loginFrame.locator("#loginIdInput");
    await loc.fill(configCredentials.username);

    loc = loginFrame.locator("#passwordInput");
    await loc.fill(configCredentials.password);

    loc = loginFrame.locator("#btnLogin");
    await loc.click();
  };

  enterMfaCode = async (args: ExtractorFuncArgs) => {
    const { extractor, configAccount, configCredentials, page } = args;

    let loc: Locator;

    const mfaFrame = page.frames()[0];

    const mfaPageExists = await getSelectorExists(mfaFrame, "#otp_sms", 5000);
    if (!mfaPageExists) {
      return;
    }

    loc = mfaFrame.locator("#otp_sms");
    await loc.click();

    const code = await args.getMfaCode();

    const codeInputFrame = page.frames()[0];

    loc = codeInputFrame.locator("#securityCode");
    await loc.fill(code);

    loc = codeInputFrame.locator("#checkbox-remember-device");
    await loc.check();

    loc = codeInputFrame.locator("#continueButton");
    await loc.click();
  };

  scrapeAccountValue = async (args: ExtractorFuncArgs): Promise<Price> => {
    const { extractor, configAccount, configCredentials, page } = args;

    let loc: Locator;

    const dashboardFrame = page.frames()[0];

    loc = dashboardFrame
      .locator("single-account")
      .filter({ hasText: configAccount.info.display })
      .locator("div.balance-container-cs > div > span")
      .first();
    let text = await loc.evaluate((o) => o.childNodes[2].textContent ?? "");

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

    loc = dashboardFrame.locator("#meganav-secondary-menu-hist");
    await loc.click();
    await page.waitForTimeout(3000);

    loc = dashboardFrame.locator(".sdps-account-selector");
    await loc.click();
    await page.waitForTimeout(3000);

    loc = dashboardFrame.locator(".sdps-account-selector__list-item", {
      hasText: configAccount.info.number,
    });
    await loc.click();
    await page.waitForTimeout(3000);

    // Set date range.

    const dateRangeFrame = page.frames()[0];

    loc = dateRangeFrame.locator("#statements-daterange1");
    await loc.selectOption({ value: "Custom" });
    await page.waitForTimeout(1000);

    loc = dateRangeFrame.locator("#calendar-FromDate");
    await loc.fill(range.start.toLocaleDateString("en-US"));
    await loc.blur();

    loc = dateRangeFrame.locator("#calendar-ToDate");
    await loc.fill(range.end.toLocaleDateString("en-US"));
    await loc.blur();

    loc = dateRangeFrame.getByRole("button", { name: "search" });
    await loc.click();
    await page.waitForTimeout(3000);

    let rangeIsValid = true;
    try {
      loc = dateRangeFrame.locator("#datepicker-range-error-alert");
      await loc.waitFor({ state: "attached", timeout: 3000 });
      rangeIsValid = false;
    } catch (e) {}
    if (!rangeIsValid) {
      throw "Invalid date range";
    }

    // Open export popup.

    const popupPromise = page.waitForEvent("popup");

    loc = dashboardFrame.locator("#bttnExport button");
    await loc.click();

    const popupPage = await popupPromise;
    await popupPage.waitForLoadState("domcontentloaded");

    loc = popupPage.locator(".button-primary");
    try {
      await loc.click();
    } catch (e) {
      // Silence 'target closed' error.
    }

    // Get downloaded file.

    const download = await page.waitForEvent("download");
    const downloadPath = await download.path();
    const transactionData = fs.readFileSync(downloadPath!, {
      encoding: "utf-8",
    });
    return transactionData;
  };

  getDashboardExists = async (args: ExtractorFuncArgs): Promise<boolean> => {
    const { extractor, configAccount, configCredentials, page } = args;

    try {
      const loc = page.frames()[0].locator("#site-header");
      await loc.waitFor({ state: "attached", timeout: 500 });
      return true;
    } catch (e) {
      return false;
    }
  };
}

export { CharlesSchwabBankExtractor };
