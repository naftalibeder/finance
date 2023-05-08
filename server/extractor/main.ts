import fs from "fs";
import {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  Page,
  firefox,
} from "playwright-core";
import extractors from "./extractors";
import { parseTransactions, toPretty, toYYYYMMDD } from "./utils";
import {
  Account,
  Config,
  Extractor,
  ExtractorAccount,
  ExtractorCredentials,
} from "../types";
import { CONFIG_PATH, TMP_DIR } from "../constants";
import db from "../db";

const BROWSER_CONTEXT_PATH = `${TMP_DIR}/browser-context.json`;
const HEADLESS = true;

export const run = async () => {
  const tmpRunDir = `${TMP_DIR}/${new Date()}`;
  fs.mkdirSync(tmpRunDir);

  const startTime = Date.now();
  let totalAddCt = 0;

  const configStr = fs.readFileSync(CONFIG_PATH, { encoding: "utf-8" });
  const config = JSON.parse(configStr) as Config;
  const accounts = config.accounts.filter((o) => !o.skip);

  console.log(`Preparing extraction for ${accounts.length} accounts`);

  const [browser, browserContext] = await setUp();

  for (const extractorAccount of config.accounts) {
    console.log(`Starting extraction for ${toPretty(extractorAccount)}`);

    const extractor = extractors[extractorAccount.info.bankId];
    const credentials = config.credentials[extractorAccount.info.bankId];

    const browserPage = await browserContext.newPage();

    try {
      await updateAccountValue(
        browserPage,
        extractor,
        extractorAccount,
        credentials
      );
    } catch (e) {
      console.log("Error getting account value:", e);
      await takeErrorScreenshot(browserPage, tmpRunDir);
      continue;
    }

    try {
      const addCt = await updateTransactions(
        browserPage,
        extractor,
        extractorAccount,
        credentials,
        tmpRunDir
      );
      totalAddCt += addCt;
    } catch (e) {
      console.log("Error getting transactions:", e);
      await takeErrorScreenshot(browserPage, tmpRunDir);
      continue;
    }

    await browserContext.storageState({ path: BROWSER_CONTEXT_PATH });
    await browserPage.close();

    console.log();
  }

  await tearDown(browser, browserContext);

  console.log(
    `Added ${totalAddCt} transactions across ${config.accounts.length} accounts`
  );

  const deltaTime = (Date.now() - startTime) / 1000;
  console.log(`Extraction completed in ${deltaTime}s`);
};

const setUp = async (): Promise<[Browser, BrowserContext]> => {
  let options: BrowserContextOptions = {};
  if (fs.existsSync(BROWSER_CONTEXT_PATH)) {
    options.storageState = BROWSER_CONTEXT_PATH;
  }

  console.log("Launching browser with options:", options);

  const browser = await firefox.launch({ headless: HEADLESS });
  const browserContext = await browser.newContext(options);

  console.log("Launched browser");

  return [browser, browserContext];
};

const updateAccountValue = async (
  browserPage: Page,
  extractor: Extractor,
  extractorAccount: ExtractorAccount,
  credentials: ExtractorCredentials
) => {
  console.log("Getting account value");

  const accountValue = await extractor.getAccountValue(
    browserPage,
    extractorAccount,
    credentials
  );
  if (!accountValue) {
    return;
  }

  const account: Account = {
    id: extractorAccount.info.id,
    number: extractorAccount.info.number,
    price: accountValue,
  };
  db.updateAccount(account);

  console.log(`Updated account value: ${account.price.amount}`);
};

const updateTransactions = async (
  browserPage: Page,
  extractor: Extractor,
  extractorAccount: ExtractorAccount,
  credentials: ExtractorCredentials,
  tmpRunDir: string
): Promise<number> => {
  let end = new Date();
  let totalAddCt = 0;

  while (true) {
    const spanMs = 1000 * 60 * 60 * 24 * 365; // ~1 year.
    const start = new Date(end.valueOf() - spanMs);
    const prettyRange = `[${toYYYYMMDD(start)}, ${toYYYYMMDD(end)}]`;

    console.log(`Getting transactions for range ${prettyRange}`);

    const transactionData = await extractor.getTransactionData(
      browserPage,
      extractorAccount,
      credentials,
      { start, end }
    );
    const tmpFilePath = `${tmpRunDir}/${toPretty(
      extractorAccount
    )}_${toYYYYMMDD(start)}_${toYYYYMMDD(end)}.csv`;
    fs.writeFileSync(tmpFilePath, transactionData);

    const transactions = await parseTransactions(
      transactionData,
      extractorAccount
    );
    const addCt = db.addTransactions(transactions);
    if (addCt === 0) {
      console.log(`No new transactions for range ${prettyRange}; stopping`);
      break;
    }

    console.log(`Added ${addCt} new transactions for range ${prettyRange}`);

    end = start;
    totalAddCt += addCt;
  }

  console.log(`Added ${totalAddCt} new transactions in total`);

  return totalAddCt;
};

const tearDown = async (browser: Browser, browserContext: BrowserContext) => {
  console.log("Saving and closing browser");

  await browserContext.storageState({ path: BROWSER_CONTEXT_PATH });
  await browser.close();

  console.log("Saved and closed browser");
};

const takeErrorScreenshot = async (browserPage: Page, tmpRunDir: string) => {
  return browserPage.screenshot({
    path: `${tmpRunDir}/error_${new Date()}.png`,
    type: "png",
  });
};
