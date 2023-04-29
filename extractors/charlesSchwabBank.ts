import fs from "fs";
import { Locator, Page } from "playwright-core";
import { Extractor, ExtractorAccount, ExtractorCredentials } from "../types";

const getData = async (
  browserPage: Page,
  account: ExtractorAccount,
  credentials: ExtractorCredentials
): Promise<string> => {
  await authenticate(browserPage, credentials);
  const rawData = await getRawData(browserPage, account);
  return rawData;
};

const authenticate = async (
  browserPage: Page,
  credentials: ExtractorCredentials
) => {
  console.log("Checking authentication");

  let loc: Locator;

  await browserPage.goto(
    "https://client.schwab.com/app/accounts/transactionhistory"
  );

  try {
    loc = browserPage.locator("#meganav-menu-utl-logout");
    await loc.waitFor({ state: "attached", timeout: 2000 });

    console.log("Already authenticated; continuing");
    return;
  } catch (e) {
    console.log("Not authenticated yet");
  }

  const loginFrame = browserPage.frames()[2];

  loc = loginFrame.locator("#loginIdInput");
  await loc.type(credentials.username);

  loc = loginFrame.locator("#passwordInput");
  await loc.type(credentials.password);

  loc = loginFrame.locator("#btnLogin");
  await loc.click();

  console.log("Authenticated");
};

const getRawData = async (
  browserPage: Page,
  account: ExtractorAccount
): Promise<string> => {
  let loc: Locator;

  // History and export.

  console.log("Navigating to export page");

  const dashboardFrame = browserPage.mainFrame();

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

  loc = dashboardFrame.locator("#bttnExport button");
  await loc.click();

  // Popup.

  console.log("Launching export popup");

  const popupPage = await browserPage.waitForEvent("popup");
  await popupPage.waitForLoadState("domcontentloaded");
  await popupPage.waitForLoadState("networkidle");

  loc = popupPage.locator(".button-primary");
  await loc.click();

  // File handling.

  console.log("Waiting for download");

  const download = await browserPage.waitForEvent("download");
  const downloadPath = await download.path();
  const rawData = fs.readFileSync(downloadPath!, { encoding: "utf-8" });

  console.log("Downloaded data");

  return rawData;
};

const extractor: Extractor = {
  getData,
};

export { extractor };
