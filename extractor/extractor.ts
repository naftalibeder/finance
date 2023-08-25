import fs from "fs";
import path from "path";
import got from "got";
import {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  LaunchOptions,
  Page,
  firefox,
} from "@playwright/test";
import {
  Account,
  BankCreds,
  GetMfaInfoApiPayload,
  MfaInfo,
  Price,
  Transaction,
} from "shared";
import { randomUUID } from "crypto";
import { EXTRACTIONS_PATH, TMP_DIR } from "./paths.js";
import { extractors } from "./extractors/index.js";
import { delay, parseTransactions } from "./utils/index.js";
import { ExtractionCallbacks, ExtractorFuncArgs } from "./types.js";

const BROWSER_CONTEXT_PATH = `${TMP_DIR}/browser-context.json`;
const HEADLESS = false;

/**
 * Extracts the current account value and all available transactions for the
 * provided account and writes that info to the database.
 */
export const runAccount = async (
  account: Account,
  bankCreds: BankCreds,
  callbacks: ExtractionCallbacks
) => {
  const {
    onStatusChange,
    onReceiveAccountValue,
    onReceiveTransactions,
    onMfaFinish,
    onInfo,
  } = callbacks;

  let error: string | undefined = undefined;
  let errorScreenshotPath: string | undefined = undefined;

  const tmpRunDir = `${EXTRACTIONS_PATH}/${new Date().toISOString()}`;
  fs.mkdirSync(tmpRunDir, { recursive: true });

  // Prepare for the account extraction.

  onInfo("Preparing extraction");
  const [browser, browserContext] = await setUp();

  const page = await browserContext.newPage();
  page.setViewportSize({ width: 1948, height: 955 });

  // Run the account extraction.

  onStatusChange({
    startedAt: new Date().toISOString(),
  });

  try {
    const extractor = extractors[account.bankId];
    if (!extractor) {
      throw `Extractor not found for bank with id "${account.bankId}"`;
    }

    let accountValue: Price | undefined;
    let transactions: Transaction[] = [];

    const res = await getAccountData(
      {
        extractor,
        account,
        bankCreds,
        page,
        tmpRunDir,
        getMfaCode: async (): Promise<string> => {
          const code = await waitForMfaCode(account.bankId, callbacks);
          return code;
        },
        log: callbacks.onInfo,
      },
      callbacks
    );
    accountValue = res.accountValue;
    transactions = res.transactions;

    if (accountValue !== undefined) {
      onReceiveAccountValue(accountValue);
      onInfo(`Updated account value: ${accountValue.amount}`);
    }

    if (transactions.length > 0) {
      onReceiveTransactions(transactions);
      onInfo(`Found ${transactions.length} total transactions`);
    }

    await browserContext.storageState({ path: BROWSER_CONTEXT_PATH });
    await page.close();
  } catch (e) {
    onInfo(`Error extracting`);
    const p = await takeErrorScreenshot(page, tmpRunDir);
    errorScreenshotPath = path.resolve(p);
    error = `${e}`;
  }

  onStatusChange({
    finishedAt: new Date().toISOString(),
  });

  // Clean up after the account extraction.

  await tearDown(browser, browserContext);
  onMfaFinish();

  if (error) {
    onInfo(`Error message: ${error}`);
    onInfo(`Error screenshot: ${errorScreenshotPath}`);
    throw error;
  }
  onInfo("Extraction successful");
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
  args: ExtractorFuncArgs,
  callbacks: ExtractionCallbacks
): Promise<{
  accountValue: Price;
  transactions: Transaction[];
}> => {
  const { extractor, account, page, tmpRunDir } = args;
  const { onInfo } = callbacks;

  const getAccountValue = async (): Promise<Price> => {
    onInfo("Loading start page");
    await extractor.loadStartPage(args);
    await page.waitForTimeout(3000);

    onInfo("Checking authentication status");
    await authenticate();
    await page.waitForTimeout(3000);
    throw "Test crash!";

    onInfo("Scraping account value");
    let accountValue = await extractor.scrapeAccountValue(args);

    const accountType = account.type;
    if (accountType === "liabilities" || accountType === "expenses") {
      accountValue.amount *= -1;
    }

    onInfo(
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
        onInfo(`Getting transactions for range ${prettyRange}`);
        await extractor.loadStartPage(args);
        await page.waitForTimeout(3000);

        onInfo("Checking authentication status");
        await authenticate();
        await page.waitForTimeout(3000);

        onInfo("Scraping transaction data");
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

        onInfo("Parsing transactions");
        const res = await parseTransactions(data, account, extractor);
        transactionsChunk = res.transactions;
        skipCt = res.skipCt;
      } catch (e) {
        if (transactions.length === 0) {
          throw `Error getting transaction data for range ${prettyRange}: ${e}`;
        } else {
          onInfo(
            `Passed earliest allowed transaction range with ${prettyRange}; stopping loop`
          );
          break;
        }
      }

      if (transactionsChunk.length === 0) {
        onInfo(`No new transactions for range ${prettyRange}; stopping loop`);
        break;
      }

      onInfo(
        `Found ${transactionsChunk.length} transactions for range ${prettyRange}; skipped ${skipCt} non-transaction rows`
      );
      transactions = [...transactions, ...transactionsChunk];

      end = start;
    }

    onInfo(`Found ${transactions.length} total transactions`);
    return transactions;
  };

  const authenticate = async (): Promise<void> => {
    let pageKind = await extractor.getCurrentPageKind(args);
    if (pageKind === "dashboard") {
      onInfo("Already authenticated");
      return;
    } else if (pageKind === "login") {
      onInfo("Entering bank credentials");
      await extractor.enterCredentials(args);
      await page.waitForTimeout(3000);
    }

    pageKind = await extractor.getCurrentPageKind(args);
    if (pageKind === "mfa") {
      onInfo("Entering two-factor code");
      await extractor.enterMfaCode(args);
      await page.waitForTimeout(1000);
    }

    pageKind = await extractor.getCurrentPageKind(args);
    if (pageKind !== "dashboard") {
      onInfo("Authentication failed");
      throw "Authentication failed";
    }

    onInfo("Authenticated");
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
  callbacks: ExtractionCallbacks
): Promise<string> => {
  const { onNeedMfaCode, onMfaFinish, onInfo } = callbacks;

  onNeedMfaCode();
  let maxSec = 60 * 4;

  for (let i = 0; i < maxSec; i++) {
    const mfaInfo = await fetchMfaInfo(bankId);

    if (mfaInfo?.code) {
      onInfo(`Clearing two-factor info for ${bankId}`);
      onMfaFinish();
      return mfaInfo.code;
    }

    onInfo(`No code found yet (${i}/${maxSec}s)...`);
    await delay(1000);
  }

  onInfo(`No code found in ${maxSec}s`);
  onMfaFinish();

  throw `No code found in ${maxSec}s`;
};

const fetchMfaInfo = async (bankId: string): Promise<MfaInfo | undefined> => {
  const res = await got.post<GetMfaInfoApiPayload>(
    `${process.env.SERVER_LOCAL_URL}/mfa/current`,
    {
      json: {
        bankId,
      },
    }
  );
  const info = res.body.data.mfaInfo;
  return info;
};

const tearDown = async (browser: Browser, browserContext: BrowserContext) => {
  console.log("Saving and closing browser");

  await browserContext.storageState({ path: BROWSER_CONTEXT_PATH });
  await browser.close();

  console.log("Saved and closed browser");
};

const takeErrorScreenshot = async (
  browserPage: Page,
  tmpRunDir: string
): Promise<string> => {
  const p = `${tmpRunDir}/error-${randomUUID()}.png`;
  await browserPage.screenshot({ path: p, type: "png" });
  return p;
};
