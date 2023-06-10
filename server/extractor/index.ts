import fs from "fs";
import {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  LaunchOptions,
  Page,
  firefox,
} from "playwright-core";
import { Account, Config, Price, Transaction } from "shared";
import { CONFIG_PATH, EXTRACTIONS_PATH, TMP_DIR } from "../constants";
import db from "../db";
import { delay, prettyAccount, prettyDate, prettyDuration } from "../utils";
import { Extractor, ExtractorFuncArgs } from "types";
import { CharlesSchwabBankExtractor, ChaseBankExtractor } from "./extractors";
import { parseTransactions } from "./utils";

const BROWSER_CONTEXT_PATH = `${TMP_DIR}/browser-context.json`;
const HEADLESS = true;

const extractors: Extractor[] = [
  new CharlesSchwabBankExtractor(),
  new ChaseBankExtractor(),
];
const extractorsDict: Record<string, Extractor> = {};
for (const extractor of extractors) {
  extractorsDict[extractor.bankId] = extractor;
}

const setUp = async (): Promise<[Browser, BrowserContext]> => {
  const launchOptions: LaunchOptions = {
    headless: HEADLESS,
    timeout: 0,
  };
  const browser = await firefox.launch(launchOptions);

  const contextOptions: BrowserContextOptions = {};
  if (fs.existsSync(BROWSER_CONTEXT_PATH)) {
    contextOptions.storageState = BROWSER_CONTEXT_PATH;
  }

  const browserContext = await browser.newContext(contextOptions);

  console.log("Launched browser with options:", contextOptions);
  return [browser, browserContext];
};

/**
 * Extracts the current account value and all available transactions for every
 * active account listed in the config file, and writes info to the database.
 */
const runExtractors = async (accountIds?: string[]) => {
  const tmpRunDir = `${EXTRACTIONS_PATH}/${new Date()}`;
  fs.mkdirSync(tmpRunDir, { recursive: true });

  let totalFoundCt = 0;
  let totalAddCt = 0;
  let startTime = new Date();

  const configStr = fs.readFileSync(CONFIG_PATH, { encoding: "utf-8" });
  const config = JSON.parse(configStr) as Config;

  const allAccounts = db.getAccounts();

  let accounts: Account[];
  if (accountIds && accountIds.length > 0) {
    accounts = allAccounts.data.accounts.filter((o) =>
      accountIds.includes(o._id)
    );
  } else {
    accounts = allAccounts.data.accounts;
  }
  console.log(`Preparing extraction for ${accounts.length} accounts`);

  db.setExtractionStatus(
    accounts.map((o) => o._id),
    "pending"
  );

  const [browser, browserContext] = await setUp();

  for (const account of accounts) {
    const log: ExtractorFuncArgs["log"] = (message?: any, ...params: any[]) => {
      console.log(`${account.bankId} | ${account._id} | ${message}`, ...params);
    };

    log(`Starting extraction`);

    const extractor = extractorsDict[account.bankId];
    const credentials = config.credentials[account.bankId];

    const page = await browserContext.newPage();
    page.setViewportSize({ width: 1948, height: 955 });

    db.setExtractionStatus([account._id], "in-progress");

    let accountValue: Price | undefined;
    let transactions: Transaction[] = [];

    try {
      const resp = await runExtractor({
        extractor,
        account,
        credentials,
        page,
        tmpRunDir,
        getMfaCode: async (): Promise<string> => {
          const code = await waitForMfaCode(account.bankId, () => {}, log);
          return code;
        },
        log,
      });
      accountValue = resp.accountValue;
      transactions = resp.transactions;
    } catch (e) {
      log(`Error running extractor: ${e}`);
      db.deleteMfaInfo(account.bankId);
      await takeErrorScreenshot(page, tmpRunDir);
      await page.close();
      continue;
    }

    db.updateAccount(account._id, {
      ...account,
      price: accountValue,
    });
    log(`Updated account value: ${accountValue.amount}`);

    const foundCt = transactions.length;
    totalFoundCt += foundCt;
    const addCt = db.addTransactions(transactions);
    totalAddCt += addCt;
    log(`Added ${addCt} new of ${foundCt} found transactions`);

    db.setExtractionStatus([account._id], undefined);

    await browserContext.storageState({ path: BROWSER_CONTEXT_PATH });
    await page.close();
  }

  await tearDown(browser, browserContext);

  const deltaTime = Date.now() - startTime.valueOf();
  console.log(`Completed extraction across ${accounts.length} accounts`);
  console.log(`Added ${totalAddCt} new of ${totalFoundCt} found transactions`);
  console.log(`Finished in ${prettyDuration(deltaTime)}`);
};

/**
 * Extracts the current account value and all available transactions for a
 * specific account.
 */
export const runExtractor = async (
  args: ExtractorFuncArgs
): Promise<{
  accountValue: Price;
  transactions: Transaction[];
}> => {
  const { extractor, account, page, tmpRunDir, log } = args;

  const getAccountValue = async (): Promise<Price> => {
    log("Loading start page");
    await extractor.loadStartPage(args);
    await page.waitForTimeout(3000);

    log("Checking authentication status");
    await authenticate();
    await page.waitForTimeout(3000);

    log("Scraping account value");
    let accountValue = await extractor.scrapeAccountValue(args);

    const accountType = account.type;
    if (accountType === "liabilities" || accountType === "expenses") {
      accountValue.amount *= -1;
    }

    log(`Found account value: ${accountValue.amount} ${accountValue.currency}`);
    return accountValue;
  };

  const getTransactions = async (): Promise<Transaction[]> => {
    const spanMonths = extractor.getMaxDateRangeMonths(account.kind);
    const spanMs = spanMonths * 30 * 24 * 60 * 60 * 1000;

    let transactions: Transaction[] = [];
    let end = new Date();

    while (true) {
      const start = new Date(end.valueOf() - spanMs);
      const prettyRange = `[${prettyDate(start)}, ${prettyDate(end)}]`;

      log(`Getting transactions for range ${prettyRange}`);

      let transactionsChunk: Transaction[] = [];
      let skipCt = 0;
      try {
        log("Loading start page");
        await extractor.loadStartPage(args);
        await page.waitForTimeout(3000);

        log("Checking authentication status");
        await authenticate();
        await page.waitForTimeout(3000);

        log("Scraping transaction data");
        const data = await extractor.scrapeTransactionData({
          ...args,
          range: { start, end },
        });
        fs.writeFileSync(`${tmpRunDir}/${prettyAccount(account)}.csv`, data, {
          encoding: "utf-8",
        });

        log("Parsing transactions");
        const res = await parseTransactions(data, account, extractor);
        transactionsChunk = res.transactions;
        skipCt = res.skipCt;
      } catch (e) {
        log(`Error getting transaction data for range ${prettyRange}:`, e);
        break;
      }

      if (transactionsChunk.length === 0) {
        log(`No new transactions for range ${prettyRange}; stopping`);
        break;
      }

      log(
        `Found ${transactionsChunk.length} transactions for range ${prettyRange}; skipped ${skipCt} non-transaction rows`
      );
      transactions = [...transactions, ...transactionsChunk];

      end = start;
    }

    log(`Found ${transactions.length} total transactions`);
    return transactions;
  };

  const authenticate = async (): Promise<void> => {
    let dashboardExists = await extractor.getDashboardExists(args);
    if (dashboardExists) {
      log("Already authenticated");
      return;
    }

    log("Entering credentials if needed");
    await extractor.enterCredentials(args);
    await page.waitForTimeout(3000);

    dashboardExists = await extractor.getDashboardExists(args);
    if (dashboardExists) {
      log("Already authenticated");
      return;
    }

    log("Entering two-factor code if needed");
    await extractor.enterMfaCode(args);
    await page.waitForTimeout(1000);
  };

  const accountValue = await getAccountValue();
  const transactions = await getTransactions();

  return {
    accountValue,
    transactions,
  };
};

const waitForMfaCode = async (
  bankId: string,
  onChange: () => void,
  log: ExtractorFuncArgs["log"]
): Promise<string> => {
  db.setMfaInfo(bankId);
  let maxSec = 60 * 2;

  for (let i = 0; i < maxSec; i++) {
    const status = db.getExtractionStatus();
    const info = status.mfaInfos.find((o) => o.bankId === bankId);

    if (info?.code) {
      log(`Clearing two-factor info for ${bankId}`);
      db.deleteMfaInfo(bankId);
      onChange();
      return info.code;
    }

    log(`No code found yet (${i}/${maxSec}s)...`);
    await delay(1000);
  }

  log(`No code found in ${maxSec}s`);
  db.deleteMfaInfo(bankId);
  onChange();

  throw `No code found in ${maxSec}s`;
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

export default { runExtractors };
