import fs from "fs";
import {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  LaunchOptions,
  Page,
  firefox,
} from "@playwright/test";
import { Account, BankCreds, MfaInfo, Price, Transaction } from "shared";
import { EXTRACTIONS_PATH, TMP_DIR } from "./constants";
import { extractors } from "./extractors";
import { delay, parseTransactions } from "./utils";
import { ExtractionCallbacks, ExtractorFuncArgs } from "types";

const BROWSER_CONTEXT_PATH = `${TMP_DIR}/browser-context.json`;
const HEADLESS = true;

/**
 * Extracts the current account value and all available transactions for the
 * provided account and writes that info to the database.
 */
export const runAccount = async (
  account: Account,
  bankCreds: BankCreds,
  callbacks: ExtractionCallbacks
) => {
  const tmpRunDir = `${EXTRACTIONS_PATH}/${new Date().toISOString()}`;
  fs.mkdirSync(tmpRunDir, { recursive: true });

  // Prepare for the account extraction.

  console.log("Preparing extraction");
  const [browser, browserContext] = await setUp();

  const page = await browserContext.newPage();
  page.setViewportSize({ width: 1948, height: 955 });

  // Run the account extraction.

  callbacks.onStatusChange({
    startedAt: new Date().toISOString(),
  });

  try {
    const extractor = extractors[account.bankId];

    let accountValue: Price | undefined;
    let transactions: Transaction[] = [];

    const res = await getAccountData({
      extractor,
      account,
      bankCreds,
      page,
      tmpRunDir,
      getMfaOption: async (options: string[]): Promise<number> => {
        const option = await waitForMfaOption(
          account.bankId,
          options,
          callbacks
        );
        return option;
      },
      getMfaCode: async (): Promise<string> => {
        const code = await waitForMfaCode(account.bankId, callbacks);
        return code;
      },
      log: (msg: string, ...args: string[]) => {
        console.log(`${account.bankId} | ${account.display} | ${msg} ${args}`);
      },
    });
    accountValue = res.accountValue;
    transactions = res.transactions;

    if (accountValue !== undefined) {
      callbacks.onReceiveAccountValue(accountValue);
      console.log(`Updated account value: ${accountValue.amount}`);
    }

    if (transactions.length > 0) {
      callbacks.onReceiveTransactions(transactions);
      console.log(`Found ${transactions.length} total transactions`);
    }

    await browserContext.storageState({ path: BROWSER_CONTEXT_PATH });
    await page.close();
  } catch (e) {
    console.log("Error:", e);
    await takeErrorScreenshot(page, tmpRunDir);
  }

  callbacks.onStatusChange({
    finishedAt: new Date().toISOString(),
  });

  // Clean up after the account extraction.

  await tearDown(browser, browserContext);
  callbacks.onMfaFinish();
};

const setUp = async (): Promise<[Browser, BrowserContext]> => {
  console.log("Launching browser at", firefox.executablePath());
  const launchOptions: LaunchOptions = {
    headless: HEADLESS,
    timeout: 0,
    executablePath: process.env.BROWSER_EXECUTABLE,
  };
  const browser = await firefox.launch(launchOptions);

  const contextOptions: BrowserContextOptions = {
    timezoneId: "GMT",
  };
  if (fs.existsSync(BROWSER_CONTEXT_PATH)) {
    contextOptions.storageState = BROWSER_CONTEXT_PATH;
  }

  const browserContext = await browser.newContext(contextOptions);

  console.log("Launched browser with options:", contextOptions);
  return [browser, browserContext];
};

/**
 * Extracts the current account value and all available transactions for a
 * specific account.
 */
export const getAccountData = async (
  args: ExtractorFuncArgs
): Promise<{
  accountValue: Price;
  transactions: Transaction[];
}> => {
  const { extractor, account, page, tmpRunDir } = args;

  const getAccountValue = async (): Promise<Price> => {
    console.log("Loading start page");
    await extractor.loadStartPage(args);
    await page.waitForTimeout(3000);

    console.log("Checking authentication status");
    await authenticate();
    await page.waitForTimeout(3000);

    console.log("Scraping account value");
    let accountValue = await extractor.scrapeAccountValue(args);

    const accountType = account.type;
    if (accountType === "liabilities" || accountType === "expenses") {
      accountValue.amount *= -1;
    }

    console.log(
      `Found account value: ${accountValue.amount} ${accountValue.currency}`
    );
    return accountValue;
  };

  const getTransactions = async (): Promise<Transaction[]> => {
    const spanMonths = extractor.getMaxDateRangeMonths(account.kind);
    const spanMs = spanMonths * 30 * 24 * 60 * 60 * 1000;

    let transactions: Transaction[] = [];
    let end = new Date();

    while (true) {
      const start = new Date(end.valueOf() - spanMs);
      const prettyRange = `[${start}, ${end}]`;

      let transactionsChunk: Transaction[] = [];
      let skipCt = 0;

      try {
        console.log(`Getting transactions for range ${prettyRange}`);
        await extractor.loadStartPage(args);
        await page.waitForTimeout(3000);

        console.log("Checking authentication status");
        await authenticate();
        await page.waitForTimeout(3000);

        console.log("Scraping transaction data");
        const data = await extractor.scrapeTransactionData({
          ...args,
          range: { start, end },
        });
        fs.writeFileSync(
          `${tmpRunDir}/${account.display.toLowerCase().replace(" ", "-")}.csv`,
          data,
          {
            encoding: "utf-8",
          }
        );

        console.log("Parsing transactions");
        const res = await parseTransactions(data, account, extractor);
        transactionsChunk = res.transactions;
        skipCt = res.skipCt;
      } catch (e) {
        if (transactions.length === 0) {
          throw `Error getting transaction data for range ${prettyRange}: ${e}`;
        } else {
          console.log(
            `Passed earliest allowed transaction range with ${prettyRange}; stopping loop`
          );
          break;
        }
      }

      if (transactionsChunk.length === 0) {
        console.log(
          `No new transactions for range ${prettyRange}; stopping loop`
        );
        break;
      }

      console.log(
        `Found ${transactionsChunk.length} transactions for range ${prettyRange}; skipped ${skipCt} non-transaction rows`
      );
      transactions = [...transactions, ...transactionsChunk];

      end = start;
    }

    console.log(`Found ${transactions.length} total transactions`);
    return transactions;
  };

  const authenticate = async (): Promise<void> => {
    let dashboardExists = await extractor.getDashboardExists(args);
    if (dashboardExists) {
      console.log("Already authenticated");
      return;
    }

    console.log("Entering bank credentials if needed");
    await extractor.enterCredentials(args);
    await page.waitForTimeout(3000);

    dashboardExists = await extractor.getDashboardExists(args);
    if (dashboardExists) {
      console.log("Already authenticated");
      return;
    }

    console.log("Entering two-factor code if needed");
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

const waitForMfaOption = async (
  bankId: string,
  options: string[],
  callbacks: ExtractionCallbacks
): Promise<number> => {
  callbacks.onNeedMfaOption(options);
  let maxSec = 60 * 4;

  for (let i = 0; i < maxSec; i++) {
    const mfaInfo = await fetchMfaInfo(bankId);

    if (mfaInfo?.option) {
      console.log(
        `Requesting two-factor option ${mfaInfo.option} for ${bankId}`
      );
      callbacks.onMfaFinish();
      return mfaInfo.option;
    }

    console.log(`No two-factor option found yet (${i}/${maxSec}s)...`);
    await delay(1000);
  }

  console.log(`No two-factor option found in ${maxSec}s`);
  callbacks.onMfaFinish();

  throw `No two-factor option found in ${maxSec}s`;
};

const waitForMfaCode = async (
  bankId: string,
  callbacks: ExtractionCallbacks
): Promise<string> => {
  callbacks.onNeedMfaCode();
  let maxSec = 60 * 4;

  for (let i = 0; i < maxSec; i++) {
    const mfaInfo = await fetchMfaInfo(bankId);

    if (mfaInfo?.code) {
      console.log(`Clearing two-factor info for ${bankId}`);
      callbacks.onMfaFinish();
      return mfaInfo.code;
    }

    console.log(`No code found yet (${i}/${maxSec}s)...`);
    await delay(1000);
  }

  console.log(`No code found in ${maxSec}s`);
  callbacks.onMfaFinish();

  throw `No code found in ${maxSec}s`;
};

const fetchMfaInfo = async (bankId: string): Promise<MfaInfo> => {
  const res = await fetch(`${process.env.SERVER_LOCAL_URL}/mfa`, {
    method: "POST",
    body: JSON.stringify({ bankId }),
  });
  const info = await res.json();
  return info;
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
