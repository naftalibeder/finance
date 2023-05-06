import fs from "fs";
import { Locator, Page } from "playwright-core";
import {
  Extractor,
  ExtractorAccount,
  ExtractorCredentials,
  ExtractorDateRange,
  Price,
} from "../../types";
import { getSelectorExists, getUserInput, toPrice } from "../utils";

const getAccountValue = async (
  browserPage: Page,
  account: ExtractorAccount,
  credentials: ExtractorCredentials
): Promise<Price | undefined> => {
  await loadAccountsPage(browserPage);
  await enterCredentials(browserPage, credentials);
  await enterTwoFactorCode(browserPage);
  const accountValue = await scrapeAccountValue(browserPage, account);
  return accountValue;
};

const getTransactionData = async (
  browserPage: Page,
  account: ExtractorAccount,
  credentials: ExtractorCredentials,
  range: ExtractorDateRange
): Promise<string> => {
  await loadHistoryPage(browserPage);
  await enterCredentials(browserPage, credentials);
  await enterTwoFactorCode(browserPage);
  const transactionData = await scrapeTransactionData(
    browserPage,
    account,
    range
  );
  return transactionData;
};

const loadAccountsPage = async (browserPage: Page) => {
  console.log("Loading accounts page");

  await browserPage.goto(
    "https://client.schwab.com/clientapps/accounts/summary"
  );
};

const loadHistoryPage = async (browserPage: Page) => {
  console.log("Loading history page");

  await browserPage.goto(
    "https://client.schwab.com/app/accounts/transactionhistory"
  );
};

const enterCredentials = async (
  browserPage: Page,
  credentials: ExtractorCredentials
) => {
  let loc: Locator;

  // Check if credentials are needed.

  console.log("Checking if credentials are needed");

  const dashboardExists = await getDashboardExists(browserPage);
  if (dashboardExists) {
    console.log("Dashboard found; skipping");
    return;
  }

  const loginFrame = browserPage.frameLocator("#lmsSecondaryLogin");

  const loginPageExists = await getSelectorExists(
    loginFrame,
    "#loginIdInput",
    5000
  );
  if (!loginPageExists) {
    console.log("Login page not found; skipping");
    return;
  }

  console.log("Login is needed");

  // Input credentials.

  console.log("Entering credentials");

  loc = loginFrame.locator("#loginIdInput");
  await loc.fill(credentials.username);

  loc = loginFrame.locator("#passwordInput");
  await loc.fill(credentials.password);

  loc = loginFrame.locator("#btnLogin");
  await loc.click();

  console.log("Authenticated");
};

const enterTwoFactorCode = async (browserPage: Page) => {
  let loc: Locator;

  // Check if code is needed.

  console.log("Checking if two-factor code is needed");

  const dashboardExists = await getDashboardExists(browserPage);
  if (dashboardExists) {
    console.log("Dashboard found; skipping");
    return;
  }

  const twoFactorFrame = browserPage.frames()[0];

  const twoFactorPageExists = await getSelectorExists(
    twoFactorFrame,
    "#otp_sms",
    5000
  );
  if (!twoFactorPageExists) {
    console.log("Two-factor page not found; skipping");
    return;
  }

  console.log("Two-factor code is needed");

  loc = twoFactorFrame.locator("#otp_sms");
  await loc.click();

  // Input code.

  console.log("Entering two-factor code");

  const code = await getUserInput("Enter the code sent to your phone number:");

  const codeInputFrame = browserPage.frames()[0];

  loc = codeInputFrame.locator("#securityCode");
  await loc.fill(code);

  loc = codeInputFrame.locator("#checkbox-remember-device");
  await loc.check();

  loc = codeInputFrame.locator("#continueButton");
  await loc.click();
};

const scrapeAccountValue = async (
  browserPage: Page,
  account: ExtractorAccount
): Promise<Price | undefined> => {
  let loc: Locator;

  console.log("Getting account value");

  const dashboardFrame = browserPage.frames()[0];

  loc = dashboardFrame
    .locator("single-account")
    .filter({ hasText: account.info.display })
    .locator("div.balance-container-cs > div > span")
    .first();
  let text = await loc.evaluate((o) => o.childNodes[2].textContent ?? "");
  const price = toPrice(text);
  return price;
};

const scrapeTransactionData = async (
  browserPage: Page,
  account: ExtractorAccount,
  range: ExtractorDateRange
): Promise<string> => {
  let loc: Locator;

  // Go to history page.

  console.log("Navigating to export page");

  const dashboardFrame = browserPage.frames()[0];

  loc = dashboardFrame.locator("#meganav-secondary-menu-hist");
  await loc.click();

  loc = dashboardFrame.locator(".sdps-account-selector");
  await loc.click();

  loc = dashboardFrame.locator(".sdps-account-selector__list-item", {
    hasText: account.info.number,
  });
  await loc.click();

  loc = dashboardFrame.locator(".transactions-history-container");
  await loc.click();

  // Set date range.

  loc = dashboardFrame.locator("#statements-daterange1");
  await loc.selectOption("Custom");

  loc = dashboardFrame.locator("#calendar-FromDate");
  await loc.fill(range.start.toLocaleDateString("en-US"));

  loc = dashboardFrame.locator("#calendar-ToDate");
  await loc.fill(range.end.toLocaleDateString("en-US"));

  loc = dashboardFrame.locator("#btnSearch");
  await loc.click();
  await browserPage.waitForLoadState("networkidle");

  // Open export popup.

  console.log("Launching export popup");

  loc = dashboardFrame.locator("#bttnExport button");
  await loc.click();

  const popupPage = await browserPage.waitForEvent("popup");
  await popupPage.waitForLoadState("domcontentloaded");
  await popupPage.waitForLoadState("networkidle");

  loc = popupPage.locator(".button-primary").first();
  await loc.click();

  // Get downloaded file.

  console.log("Waiting for download");

  const download = await browserPage.waitForEvent("download");
  const downloadPath = await download.path();
  const transactionData = fs.readFileSync(downloadPath!, { encoding: "utf-8" });

  console.log("Downloaded data");

  return transactionData;
};

const getDashboardExists = async (browserPage: Page): Promise<boolean> => {
  try {
    const loc = browserPage.frames()[0].locator("#site-header");
    await loc.waitFor({ state: "attached", timeout: 500 });
    return true;
  } catch (e) {
    console.log("Two-factor code is needed; continuing");
    return false;
  }
};

const extractor: Extractor = {
  getAccountValue,
  getTransactionData,
};

export { extractor };
