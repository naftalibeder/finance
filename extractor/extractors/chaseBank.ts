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
import { toPrice } from "../utils/index.js";

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

    let loc: Locator;

    const welcomeFrame = page.frames()[0];

    try {
      await welcomeFrame.locator(".siginbox-button").click({ timeout: 5000 });
    } catch (e) {
      log("No welcome obstacle found; continuing");
    }

    const loginFrame = page.frameLocator("#logonbox");

    const userIdLoc = loginFrame.locator("#userId-text-input-field");
    const passwordLoc = loginFrame.locator("#password-text-input-field");

    await userIdLoc.fill(bankCreds.username);
    await passwordLoc.fill(bankCreds.password);

    loc = loginFrame.locator("#input-rememberMe");
    await loc.click();

    loc = loginFrame.locator("#signin-button");
    await loc.click();
  };

  enterMfaCode = async (args: ExtractorFuncArgs) => {
    const { extractor, account, bankCreds, page, log } = args;

    let loc: Locator;

    let mfaFrame = page.mainFrame();

    const mfaOptionLoc = mfaFrame.locator("input[value=otpMethod]");
    try {
      await mfaOptionLoc.waitFor({ timeout: 8000 });
      log("Found MFA radio button");
      await mfaOptionLoc.click();
    } catch (e) {
      log("MFA radio buttons not found; continuing");
    }

    const mfaDropdownLoc = mfaFrame.locator("input[id*=dropdown]");
    try {
      await mfaDropdownLoc.waitFor({ timeout: 8000 });
      log("Found MFA dropdown");
      await mfaDropdownLoc.click();
    } catch (e) {
      log("MFA dropdown not found; skipping");
      return;
    }
    await page.waitForTimeout(1000);

    loc = mfaFrame.locator("li").filter({ hasText: "text" });
    await loc.click();

    loc = mfaFrame.locator("button[type=submit]").first();
    await loc.click();

    const code = await args.getMfaCode();

    const codeInputFrame = page.frames()[0];

    loc = codeInputFrame.locator("#otpcode_input-input-field");
    await loc.fill(code);

    loc = codeInputFrame.locator("#password_input-input-field");
    await loc.fill(bankCreds.password);

    loc = codeInputFrame.locator("button[type=submit]").first();
    await loc.click();
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

    const kind = await Promise.any([
      new Promise<ExtractorPageKind>(async (res, rej) => {
        await page.waitForSelector("#logonbox");
        res("login");
      }),
      new Promise<ExtractorPageKind>(async (res, rej) => {
        await page.waitForSelector("input[value=otpMethod]");
        res("mfa");
      }),
      new Promise<ExtractorPageKind>(async (res, rej) => {
        await page.waitForSelector(".global-nav-position-container");
        res("dashboard");
      }),
    ]);

    log(`Current page kind: ${kind}`);
    return kind;
  };
}

export { ChaseBankExtractor };
