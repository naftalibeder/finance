import fs from "fs";
import { Locator } from "@playwright/test";
import { Account, MfaOption, Price } from "shared";
import {
  Extractor,
  ExtractorFuncArgs,
  ExtractorRangeFuncArgs,
  ExtractorColumnMap,
  ExtractorPageKind,
} from "../types.js";
import { toPrice, findFirst } from "../utils/index.js";

class CharlesSchwabBankExtractor implements Extractor {
  bankId = "charles-schwab-bank";
  bankDisplayName = "Charles Schwab Bank";
  bankDisplayNameShort = "Schwab";
  supportedAccountKinds: Account["kind"][] = ["checking", "brokerage"];
  supportedMfaOptions: MfaOption[] = ["sms", "email"];
  currentPageMap: Record<ExtractorPageKind, string[]> = {
    login: ["#loginIdInput", "#loginHeadline"],
    mfa: ["#otp_sms"],
    dashboard: ["#meganav-header-container"],
  };

  getColumnMap = (
    accountKind: Account["kind"]
  ): ExtractorColumnMap | undefined => {
    switch (accountKind) {
      case "checking":
        return {
          date: 0,
          postDate: undefined,
          payee: 3,
          price: undefined,
          priceWithdrawal: 4,
          priceDeposit: 5,
          type: 1,
          description: undefined,
        };
      case "brokerage":
        return {
          date: 0,
          postDate: undefined,
          payee: 2,
          price: 7,
          priceWithdrawal: undefined,
          priceDeposit: undefined,
          type: 1,
          description: 3,
        };
    }
  };

  getMaxDateRangeMonths = (accountKind: Account["kind"]): number => {
    return 12;
  };

  goToLoginPage = async (args: ExtractorFuncArgs) => {
    const { extractor, account, bankCreds, page } = args;
    await page.goto("https://schwab.com", { timeout: 6000 });
  };

  goToDashboardPage = async (args: ExtractorFuncArgs) => {
    const { extractor, account, bankCreds, page } = args;

    let loc: Locator | undefined;

    loc = await findFirst(page, ".sdps-header__brand-link");
    await loc?.click();
  };

  enterCredentials = async (args: ExtractorFuncArgs) => {
    const { extractor, account, bankCreds, page, log } = args;

    let loc: Locator | undefined;

    loc = await findFirst(page, "#loginIdInput");
    await loc?.fill(bankCreds.username);

    loc = await findFirst(page, "#passwordInput");
    await loc?.fill(bankCreds.password);

    loc = await findFirst(page, "#btnLogin");
    await loc?.click();

    let error: string | undefined = undefined;
    try {
      loc = await findFirst(page, "#link-section #error");
      if (!loc) {
        throw "No error message found";
      }
      error = `Error logging in: ${await loc?.textContent()}`;
    } catch (e) {
      log("Logged in successfully:", e);
    }
    if (error) {
      throw error;
    }
  };

  enterMfaCode = async (args: ExtractorFuncArgs) => {
    const { extractor, account, bankCreds, page } = args;

    let loc: Locator | undefined;

    loc = await findFirst(page, "#otp_sms");
    await loc?.click();

    const code = await args.getMfaCode();

    loc = await findFirst(page, "#securityCode");
    await loc?.fill(code);

    loc = await findFirst(page, "#checkbox-remember-device");
    await loc?.check();

    loc = await findFirst(page, "#continueButton");
    await loc?.click();
  };

  scrapeAccountValue = async (args: ExtractorFuncArgs): Promise<Price> => {
    const { extractor, account, bankCreds, page } = args;

    let loc: Locator | undefined;

    loc = await findFirst(page, ".row.account-row", {
      timeout: 3000,
      forceTimeout: true,
    });
    loc = loc
      ?.filter({ hasText: account.display })
      .locator("div.balance-container-cs > div > span")
      .first();
    let text = await loc?.evaluate((o) => {
      return o.childNodes[2]?.textContent;
    });
    if (!text) {
      throw "Could not find account value";
    }

    const price = toPrice(text);
    return price;
  };

  scrapeTransactionData = async (
    args: ExtractorRangeFuncArgs
  ): Promise<string> => {
    const { extractor, account, bankCreds, range, page } = args;

    let loc: Locator | undefined;

    // Go to history page.

    loc = await findFirst(page, "#meganav-secondary-menu-hist");
    await loc?.click();
    await page.waitForTimeout(1000);

    loc = await findFirst(page, ".sdps-account-selector");
    await loc?.click();
    await page.waitForTimeout(1000);

    loc = page
      .locator(".sdps-account-selector__list-item")
      .filter({ hasText: account.number });
    await loc?.click();
    await page.waitForTimeout(1000);

    // Set date range.

    loc = await findFirst(page, "#statements-daterange1");
    await loc?.selectOption({ value: "Custom" });
    await page.waitForTimeout(1000);

    loc = await findFirst(page, "#calendar-FromDate");
    await loc?.fill(range.start.toLocaleDateString("en-US"));
    await loc?.blur();

    loc = await findFirst(page, "#calendar-ToDate");
    await loc?.fill(range.end.toLocaleDateString("en-US"));
    await loc?.blur();

    loc = await findFirst(page, "button[name=search]");
    await loc?.click();
    await page.waitForTimeout(3000);

    let rangeIsValid = true;
    try {
      loc = await findFirst(page, "#errorMessage");
      if (loc) {
        rangeIsValid = false;
      }
    } catch (e) {}
    if (!rangeIsValid) {
      throw "Invalid date range";
    }

    // Open export popup.

    const popupPromise = page.waitForEvent("popup");

    loc = await findFirst(page, "#bttnExport button");
    await loc?.click();

    const popupPage = await popupPromise;
    await popupPage.waitForLoadState("domcontentloaded");

    loc = popupPage.locator(".button-primary");
    try {
      await loc?.click();
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
}

export { CharlesSchwabBankExtractor };
