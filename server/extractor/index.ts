import fs from "fs";
import {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  LaunchOptions,
  Page,
  firefox,
} from "playwright-core";
import { Config, Price, Transaction } from "shared";
import { CONFIG_PATH, EXTRACTIONS_PATH, TMP_DIR } from "../constants";
import db from "../db";
import {
  delay,
  prettyConfigAccount,
  prettyDate,
  prettyDuration,
} from "../utils";
import { Extractor, ExtractorFuncArgs } from "types";
import { CharlesSchwabBankExtractor, ChaseBankExtractor } from "./extractors";
import { logger } from "./log";
import { parseTransactions } from "./utils";

const BROWSER_CONTEXT_PATH = `${TMP_DIR}/browser-context.json`;
const HEADLESS = false;

const extractors: Record<string, Extractor> = {
  "charles-schwab-bank": new CharlesSchwabBankExtractor(),
  "chase-bank": new ChaseBankExtractor(),
};

const setUp = async (): Promise<[Browser, BrowserContext]> => {
  const launchOptions: LaunchOptions = {
    headless: HEADLESS,
    timeout: 0,
    env: {
      PWDEBUG: "0",
    },
    logger,
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
const runExtractors = async () => {
  const tmpRunDir = `${EXTRACTIONS_PATH}/${new Date()}`;
  fs.mkdirSync(tmpRunDir, { recursive: true });

  let totalFoundCt = 0;
  let totalAddCt = 0;

  let startTime = new Date();
  db.setExtractionStatus({ status: "set-up" });

  const configStr = fs.readFileSync(CONFIG_PATH, { encoding: "utf-8" });
  const config = JSON.parse(configStr) as Config;
  const configAccounts = config.accounts.filter((o) => !o.skip);
  console.log(`Preparing extraction for ${configAccounts.length} accounts`);

  const [browser, browserContext] = await setUp();

  for (const configAccount of configAccounts) {
    const log: ExtractorFuncArgs["log"] = (message?: any, ...params: any[]) => {
      console.log(
        `${configAccount.bankId} | ${configAccount.id} | ${message}`,
        ...params
      );
    };

    log(`Starting extraction`);

    const extractor = extractors[configAccount.bankId];
    const configCredentials = config.credentials[configAccount.bankId];

    const page = await browserContext.newPage();
    page.setViewportSize({ width: 1948, height: 955 });

    // page.on("close", (e) => console.log("close"));
    // page.on("domcontentloaded", (e) => console.log("domcontentloaded"));
    // page.on("frameattached", (e) => console.log("frameattached"));
    // page.on("framedetached", (e) => console.log("framedetached"));
    // page.on("framenavigated", (e) => console.log("framenavigated"));
    // page.on("load", (e) => console.log("load"));

    db.setExtractionStatus({
      status: "run-extractor",
      accountId: configAccount.id,
    });

    let accountValue: Price | undefined;
    let transactions: Transaction[] = [];

    try {
      const resp = await runExtractor({
        extractor,
        configAccount,
        configCredentials,
        page,
        tmpRunDir,
        getMfaCode: async (): Promise<string> => {
          const code = await waitForMfaCode(
            configAccount.bankId,
            () => db.setExtractionStatus({ status: "wait-for-mfa" }),
            log
          );
          db.setExtractionStatus({
            status: "run-extractor",
            accountId: configAccount.id,
          });
          return code;
        },
        log,
      });
      accountValue = resp.accountValue;
      transactions = resp.transactions;
    } catch (e) {
      log(`Error running extractor: ${e}`);
      db.deleteMfaInfo(configAccount.bankId);
      await takeErrorScreenshot(page, tmpRunDir);
      await page.close();
      continue;
    }

    db.updateAccount(configAccount.id, {
      id: configAccount.id,
      number: configAccount.number,
      type: configAccount.type,
      price: accountValue,
    });
    log(`Updated account value: ${accountValue.amount}`);

    const foundCt = transactions.length;
    totalFoundCt += foundCt;
    const addCt = db.addTransactions(transactions);
    totalAddCt += addCt;
    log(`Added ${addCt} new of ${foundCt} found transactions`);

    await browserContext.storageState({ path: BROWSER_CONTEXT_PATH });
    await page.close();
  }

  db.setExtractionStatus({ status: "tear-down" });
  await tearDown(browser, browserContext);

  const deltaTime = Date.now() - startTime.valueOf();
  console.log(`Completed extraction across ${configAccounts.length} accounts`);
  console.log(`Added ${totalAddCt} new of ${totalFoundCt} found transactions`);
  console.log(`Finished in ${prettyDuration(deltaTime)}`);
  db.setExtractionStatus({ status: "idle" });
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
  const { extractor, configAccount, page, tmpRunDir, log } = args;

  const getAccountValue = async (): Promise<Price> => {
    log("Loading start page");
    await extractor.loadStartPage(args);
    await page.waitForTimeout(3000);

    log("Checking authentication status");
    await authenticate();
    await page.waitForTimeout(3000);

    log("Scraping account value");
    let accountValue = await extractor.scrapeAccountValue(args);

    const accountType = configAccount.type;
    if (accountType === "liabilities" || accountType === "expenses") {
      accountValue.amount *= -1;
    }

    log(`Found account value: ${accountValue.amount} ${accountValue.currency}`);
    return accountValue;
  };

  const getTransactions = async (): Promise<Transaction[]> => {
    const spanMonths = extractor.getMaxDateRangeMonths(configAccount.kind);
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
        fs.writeFileSync(
          `${tmpRunDir}/${prettyConfigAccount(configAccount)}.csv`,
          data,
          { encoding: "utf-8" }
        );

        log("Parsing transactions");
        const res = await parseTransactions(data, configAccount, extractor);
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
