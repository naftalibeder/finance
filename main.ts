import fs from "fs";
import {
  Browser,
  BrowserContext,
  firefox,
  Locator,
  Page,
} from "playwright-core";

const CONTEXT_PATH = "tmp/context.json";

const [, , USERNAME, PASSWORD, ACCOUNT_NAME] = process.argv;

if (!USERNAME || !PASSWORD) {
  throw "No username or password provided";
}

const main = async () => {
  const [browser, context, page] = await setUp();

  await authenticate(context, page);
  const raw = await getData(page);
  const parsed = await parseData(raw);

  await tearDown(browser, context, page);
};

const setUp = async (): Promise<[Browser, BrowserContext, Page]> => {
  console.log("Launching browser");

  const browser = await firefox.launch({ headless: false });
  const context = await browser.newContext({
    storageState: fs.existsSync(CONTEXT_PATH) ? CONTEXT_PATH : undefined,
  });
  const page = await context.newPage();

  return [browser, context, page];
};

const authenticate = async (context: BrowserContext, page: Page) => {
  console.log("Checking authentication");

  let loc: Locator;

  await page.goto("https://client.schwab.com/app/accounts/transactionhistory");

  try {
    loc = page.locator("#meganav-menu-utl-logout");
    await loc.waitFor({ state: "attached", timeout: 2000 });

    console.log("Already authenticated; continuing");
    return;
  } catch (e) {
    console.log("Not authenticated yet");
  }

  const loginFrame = page.frames()[2];

  loc = loginFrame.locator("#loginIdInput");
  await loc.type(USERNAME);

  loc = loginFrame.locator("#passwordInput");
  await loc.type(PASSWORD);

  loc = loginFrame.locator("#btnLogin");
  await loc.click();

  await context.storageState({ path: CONTEXT_PATH });

  console.log("Authenticated");
};

const getData = async (page: Page): Promise<string> => {
  let loc: Locator;

  // History and export.

  console.log("Navigating to export page");

  const dashboardFrame = page.mainFrame();

  loc = dashboardFrame.locator("#meganav-secondary-menu-hist");
  await loc.click();

  loc = dashboardFrame.locator(".sdps-account-selector");
  await loc.click();

  loc = dashboardFrame.locator(".sdps-account-selector__list-item", {
    hasText: ACCOUNT_NAME,
  });
  await loc.click();

  loc = dashboardFrame.locator(".transactions-history-container");
  await loc.click();

  loc = dashboardFrame.locator("#bttnExport button");
  await loc.click();

  // Popup.

  console.log("Launching export popup");

  const popupPage = await page.waitForEvent("popup");
  await popupPage.waitForLoadState("domcontentloaded");
  await popupPage.waitForLoadState("networkidle");

  loc = popupPage.locator(".button-primary");
  await loc.click();

  // File handling.

  console.log("Waiting for download");

  const download = await page.waitForEvent("download");
  const filePath = await download.path();
  const text = fs.readFileSync(filePath!, { encoding: "utf-8" });

  console.log("File saved");

  return text;
};

const parseData = async (text: string): Promise<string[]> => {
  console.log("Parsing and normalizing file");

  const lines = text.split("\n");

  const displayCt = 10;
  console.log(`Found ${lines.length - 1} lines (showing first ${displayCt})`);
  console.log(lines.slice(0, displayCt));

  return lines;
};

const tearDown = async (
  browser: Browser,
  context: BrowserContext,
  page: Page
) => {
  console.log("Saving and closing browser");

  await page.close();
  await context.storageState({ path: CONTEXT_PATH });
  await browser.close();
};

main();
