import { Locator } from "playwright-core";
import { Price } from "shared";
import { Extractor, ExtractorFuncArgs, ExtractorRangeFuncArgs } from "types";
import { toPrice } from "../../utils";
import { getSelectorExists } from "../utils";

class ChaseBankExtractor implements Extractor {
  loadAccountsPage = async (args: ExtractorFuncArgs) => {
    const { extractor, configAccount, configCredentials, page } = args;
    await page.goto("https://www.chase.com", { waitUntil: "domcontentloaded" });
  };

  loadHistoryPage = async (args: ExtractorFuncArgs) => {
    const { extractor, configAccount, configCredentials, page } = args;
  };

  enterCredentials = async (args: ExtractorFuncArgs) => {
    const { extractor, configAccount, configCredentials, page } = args;

    let loc: Locator;

    const splashFrame = page.frameLocator("#logonbox");

    try {
      loc = splashFrame.locator(".siginbox-button");
      await loc.click({ timeout: 6000 });
    } catch (e) {}

    const loginFrame = page.frameLocator("#logonbox");

    loc = loginFrame.locator("#userId-text-input-field");
    await loc.fill(configCredentials.username);

    loc = loginFrame.locator("#password-text-input-field");
    await loc.fill(configCredentials.password);

    loc = loginFrame.locator("#input-rememberMe");
    await loc.click();

    loc = loginFrame.locator("#signin-button");
    await loc.click();

    await page.waitForLoadState("domcontentloaded");
  };

  enterMfaCode = async (args: ExtractorFuncArgs) => {
    const { extractor, configAccount, configCredentials, page } = args;

    let loc: Locator;

    const mfaFrame = page.frames()[0];

    const mfaPageExists = await getSelectorExists(
      mfaFrame,
      "#header-simplerAuth-dropdownoptions-styledselect",
      10000
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
    throw "";
  };

  getDashboardExists = async (args: ExtractorFuncArgs): Promise<boolean> => {
    return false;
  };
}

export { ChaseBankExtractor };
