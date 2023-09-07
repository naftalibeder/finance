import fs from "fs";
import { Locator } from "@playwright/test";
import { Account, MfaOption, Price } from "shared";
import {
  Extractor,
  ExtractorColumnMap,
  ExtractorFuncArgs,
  ExtractorPageKind,
  ExtractorRangeFuncArgs,
} from "../types.js";
import { findFirst, toPrice } from "../utils/index.js";

class ChaseBankExtractor implements Extractor {
  bankId = "chase-bank";
  bankDisplayName = "Chase Bank";
  bankDisplayNameShort = "Chase";
  supportedAccountKinds: Account["kind"][] = ["credit"];
  supportedMfaOptions: MfaOption[] = ["sms", "email"];
  currentPageMap: Record<ExtractorPageKind, string[]> = {
    login: ["#welcomeHeader", "#logonbox", ".siginbox-button"],
    mfa: ["input[value=otpMethod]"],
    dashboard: [".global-nav-position-container"],
  };

  getColumnMap = (
    accountKind: Account["kind"]
  ): ExtractorColumnMap | undefined => {
    switch (accountKind) {
      case "credit":
        return {
          date: 0,
          postDate: 1,
          payee: 2,
          price: undefined,
          priceWithdrawal: undefined,
          priceDeposit: 5,
          type: 4,
          description: undefined,
        };
    }
  };

  getMaxDateRangeMonths = (accountKind: Account["kind"]): number => {
    return 6;
  };

  loadStartPage = async (args: ExtractorFuncArgs) => {
    const { extractor, account, bankCreds, page } = args;
    await page.goto("https://chase.com", { waitUntil: "domcontentloaded" });
  };

  enterCredentials = async (args: ExtractorFuncArgs) => {
    const { extractor, account, bankCreds, page, log } = args;

    let loc: Locator | undefined;

    await page.waitForTimeout(3000);
    loc = await findFirst(page, ".siginbox-button");
    if (loc) {
      await loc.click();
    } else {
      log("No welcome obstacle found; continuing");
    }

    loc = await findFirst(page, "input[name=userId]");
    await loc?.fill(bankCreds.username);

    loc = await findFirst(page, "input[name=password]");
    await loc?.fill(bankCreds.password);

    loc = await findFirst(page, "#input-rememberMe");
    loc?.evaluate((o) => o.classList.add("checkbox__input--checked"));

    loc = await findFirst(page, "#signin-button");
    await loc?.click();
  };

  enterMfaCode = async (args: ExtractorFuncArgs) => {
    const { extractor, account, bankCreds, page, log } = args;

    let loc: Locator | undefined;

    loc = await findFirst(page, "input[value=otpMethod]");
    await loc?.click();

    loc = await findFirst(page, "input[name=contact]");
    await loc?.click();

    loc = await findFirst(
      page,
      "#container-1-simplerAuth-dropdownoptions-styledselect"
    );
    await loc?.click();

    loc = await findFirst(page, "#requestIdentificationCode-sm");
    await loc?.click();

    const code = await args.getMfaCode();

    loc = await findFirst(page, "#otpcode_input-input-field");
    await loc?.fill(code);

    loc = await findFirst(page, "#password_input-input-field");
    await loc?.fill(bankCreds.password);

    loc = await findFirst(page, "#log_on_to_landing_page-sm");
    await loc?.click();
  };

  scrapeAccountValue = async (args: ExtractorFuncArgs): Promise<Price> => {
    const { extractor, account, bankCreds, page, log } = args;

    let loc: Locator | undefined;

    loc = await findFirst(page, ".account-tile", {
      timeout: 2000,
      forceTimeout: true,
    });
    const tileCt = await loc?.count();
    if (!tileCt || tileCt === 0) {
      throw "No account items found";
    }
    log(`Found ${tileCt} account items`);

    const lastFour = account.number.slice(-4);
    const textLoc = await findFirst(page, `[text*="${lastFour}"]`);
    if (!textLoc) {
      throw "Account item does not exist";
    }

    loc = loc?.filter({ has: textLoc }).locator(".primary-value.text-primary");
    const text = await loc?.innerText();
    if (!text) {
      throw "Account value not found";
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

    const lastFour = account.number.slice(-4);
    loc = await findFirst(page, `[text*="${lastFour}"]`);
    await loc?.click();
    await page.waitForTimeout(1000);

    loc = await findFirst(page, "#downloadActivityIcon");
    await loc?.scrollIntoViewIfNeeded();
    await loc?.click();
    await page.waitForTimeout(1000);

    // Set date range.

    loc = await findFirst(page, "#select-downloadActivityOptionId");
    await loc?.click();
    await page.waitForTimeout(1000);

    loc = await findFirst(page, `[value="DATE_RANGE"]`);
    await loc?.click();
    await page.waitForTimeout(1000);

    loc = await findFirst(page, "#accountActivityFromDate-input-input");
    await loc?.fill(range.start.toLocaleDateString("en-US"));
    await loc?.blur();

    loc = await findFirst(page, "#accountActivityToDate-input-input");
    await loc?.fill(range.end.toLocaleDateString("en-US"));
    await loc?.blur();

    await page.waitForTimeout(1000);

    // Export data.

    const downloadPromise = page.waitForEvent("download", { timeout: 6000 });

    loc = await findFirst(page, "#download");
    await loc?.click();

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
}

export { ChaseBankExtractor };
