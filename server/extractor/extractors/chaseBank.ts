import { Locator } from "playwright-core";
import { Price } from "shared";
import { Extractor, ExtractorFuncArgs, ExtractorRangeFuncArgs } from "types";
import { getUserInput } from "../utils";

class ChaseBankExtractor implements Extractor {
  loadAccountsPage = async (args: ExtractorFuncArgs) => {
    const { extractor, configAccount, configCredentials, page } = args;
    await page.goto("https://www.chase.com");
  };

  loadHistoryPage = async (args: ExtractorFuncArgs) => {
    const { extractor, configAccount, configCredentials, page } = args;
  };

  enterCredentials = async (args: ExtractorFuncArgs) => {
    const { extractor, configAccount, configCredentials, page } = args;

    let loc: Locator;

    const loginFrame = page.frames()[1];

    loc = loginFrame.locator("#userId-text-input-field");
    await loc.fill(configCredentials.username);

    loc = loginFrame.locator("#password-text-input-field");
    await loc.fill(configCredentials.password);

    loc = loginFrame.locator("#signin-button");
    await loc.click();

    await page.waitForLoadState("domcontentloaded");
  };

  enterMfaCode = async (args: ExtractorFuncArgs) => {
    const { extractor, configAccount, configCredentials, page } = args;

    let loc: Locator;

    const mfaFrame = page.frames()[0];

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

    await page.pause();
  };

  scrapeAccountValue = async (args: ExtractorFuncArgs): Promise<Price> => {
    const { extractor, configAccount, configCredentials, page } = args;
    throw "";
  };

  scrapeTransactionData = async (
    args: ExtractorRangeFuncArgs
  ): Promise<string> => {
    throw "";
  };

  getDashboardExists = async (args: ExtractorFuncArgs): Promise<boolean> => {
    return false;
  };
}

export { ChaseBankExtractor };
