import fs from "fs";
import { Frame, Locator } from "@playwright/test";
import { Account, MfaOption, Price } from "shared";
import {
  Extractor,
  ExtractorColumnMap,
  ExtractorFuncArgs,
  ExtractorPageKind,
  ExtractorRangeFuncArgs,
} from "../types.js";
import { findAll, findFirst, toPrice } from "../utils/index.js";

class ChaseBankExtractor implements Extractor {
  bankId = "chase-bank";
  bankDisplayName = "Chase Bank";
  bankDisplayNameShort = "Chase";
  supportedAccountKinds: Account["kind"][] = ["credit"];
  supportedMfaOptions: MfaOption[] = ["sms", "email"];

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

    let loc: Locator;

    const dashboardFrame = page.frames()[0];

    const tileLoc = dashboardFrame.locator(".account-tile");
    const tileCt = await tileLoc.count();
    log(`Found ${tileCt} account items`);

    const lastFour = account.number.slice(-4);
    loc = tileLoc
      .filter({ has: dashboardFrame.locator(`[text*="${lastFour}"]`) })
      .locator(".primary-value.text-primary");
    const text = await loc.innerText();

    const price = toPrice(text);
    return price;
  };

  scrapeTransactionData = async (
    args: ExtractorRangeFuncArgs
  ): Promise<string> => {
    const { extractor, account, bankCreds, range, page } = args;

    let loc: Locator;

    // Go to history page.

    const dashboardFrame = page.frames()[0];

    const lastFour = account.number.slice(-4);
    loc = dashboardFrame.locator(`[text*="${lastFour}"]`);
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

  getCurrentPageKind = async (
    args: ExtractorFuncArgs
  ): Promise<"login" | "mfa" | "dashboard"> => {
    const { extractor, account, bankCreds, page, log } = args;
    log("Checking current page kind");

    try {
      const kind = await Promise.any([
        new Promise<ExtractorPageKind>(async (res, rej) => {
          const loc = await findFirst(page, "#welcomeHeader");
          if (loc) {
            res("login");
          } else {
            rej();
          }
        }),
        new Promise<ExtractorPageKind>(async (res, rej) => {
          const loc = await findFirst(page, "#logonbox");
          if (loc) {
            res("login");
          } else {
            rej();
          }
        }),
        new Promise<ExtractorPageKind>(async (res, rej) => {
          const loc = await findFirst(page, ".siginbox-button");
          if (loc) {
            res("login");
          } else {
            rej();
          }
        }),
        new Promise<ExtractorPageKind>(async (res, rej) => {
          const loc = await findFirst(page, "input[value=otpMethod]");
          if (loc) {
            res("mfa");
          } else {
            rej();
          }
        }),
        new Promise<ExtractorPageKind>(async (res, rej) => {
          const loc = await findFirst(page, ".global-nav-position-container");
          if (loc) {
            res("dashboard");
          } else {
            rej();
          }
        }),
      ]);

      log(`Current page kind: ${kind}`);
      return kind;
    } catch (e) {
      log("Unable to find current page kind; trying again");
      return this.getCurrentPageKind(args);
    }
  };
}

export { ChaseBankExtractor };
