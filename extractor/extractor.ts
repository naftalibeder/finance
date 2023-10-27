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
import {
  delay,
  getPageKind,
  parseTransactions,
  prettyDate,
} from "./utils/index.js";
import { ExtractorFuncArgs, OnExtractionEvent } from "./types.js";

const BROWSER_CONTEXT_PATH = `${TMP_DIR}/browser-context.json`;
const HEADLESS = true;

/**
 * Extracts the current account value and all available transactions for the
 * provided account and writes that info to the database.
 */
export const runAccount = async (
  account: Account,
  bankCreds: BankCreds,
  onEvent: OnExtractionEvent
) => {
  let error: string | undefined = undefined;
  let errorScreenshotPath: string | undefined = undefined;

  const tmpRunDir = `${EXTRACTIONS_PATH}/${new Date().toISOString()}`;
  fs.mkdirSync(tmpRunDir, { recursive: true });

  // Prepare for the account extraction.

  onEvent({ message: "Preparing extraction" });
  const [browser, browserContext] = await setUp();

  const page = await browserContext.newPage();
  await page.setViewportSize({ width: 1948, height: 955 });

  // Run the account extraction.

  onEvent({
    extraction: { startedAt: new Date().toISOString() },
  });

  try {
    const extractor = extractors[account.bankId];
    if (!extractor) {
      throw `Extractor not found for bank with id "${account.bankId}"`;
    }

    await getAccountData(
      {
        extractor,
        account,
        bankCreds,
        page,
        tmpRunDir,
        getMfaCode: async (): Promise<string> => {
          const code = await waitForMfaCode(account.bankId, onEvent);
          return code;
        },
        log: (msg: string, ...args: any[]) => {
          onEvent({ message: `${msg} ${args}` });
        },
      },
      onEvent
    );

    onEvent({ message: `Finished extracting ${account.display}` });

    await browserContext.storageState({ path: BROWSER_CONTEXT_PATH });
    await page.close();
  } catch (e) {
    const p = await takeErrorScreenshot(page, tmpRunDir);
    errorScreenshotPath = path.resolve(p);
    error = `${e}`;
  }

  onEvent({
    extraction: { finishedAt: new Date().toISOString(), error },
    mfaFinish: true,
  });

  // Clean up after the account extraction.

  await tearDown(browser, browserContext);

  if (error) {
    onEvent({
      message: `Extraction finished with error:
      ${error}
      ${errorScreenshotPath}`,
    });
  } else {
    onEvent({ message: "Extraction successful" });
  }
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
  onEvent: OnExtractionEvent
): Promise<{
  accountValue: Price;
  transactions: Transaction[];
}> => {
  const { extractor, account, page, tmpRunDir } = args;

  await extractor.goToLoginPage(args);

  const getAccountValue = async (): Promise<Price> => {
    await extractor.goToDashboardPage(args);

    onEvent({ message: "Scraping account value" });
    let accountValue = await extractor.scrapeAccountValue(args);

    const accountType = account.type;
    if (accountType === "liabilities" || accountType === "expenses") {
      accountValue.amount *= -1;
    }

    onEvent({
      message: `Found account value: ${accountValue.amount} ${accountValue.currency}`,
      price: accountValue,
    });
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

      let transactionsChunk: Transaction[] = [];
      let lineCt = 0;
      let skipCt = 0;

      try {
        // Reloading prevents weird file download misbehavior on some sites.
        await page.reload();

        await extractor.goToDashboardPage(args);

        onEvent({ message: `Scraping transactions for range ${prettyRange}` });
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

        onEvent({ message: "Parsing transactions" });
        const res = await parseTransactions(data, account, extractor);
        transactionsChunk = res.transactions;
        lineCt = res.lineCt;
        skipCt = res.skipCt;
        if (transactionsChunk.length === 0) {
          throw `No transactions found in ${lineCt} total lines`;
        }
      } catch (e) {
        onEvent({
          message: `Error getting transaction data for range ${prettyRange}; stopping loop; error: ${e}`,
        });
        break;
      }

      onEvent({
        message: `Found ${transactionsChunk.length} transactions for range ${prettyRange} in ${lineCt} total lines, skipping ${skipCt} lines`,
        transactions: transactionsChunk,
      });
      transactions = [...transactions, ...transactionsChunk];

      end = start;
    }

    if (transactions.length === 0) {
      throw "No transactions found";
    }

    onEvent({ message: `Found ${transactions.length} total transactions` });
    return transactions;
  };

  const authenticate = async (): Promise<void> => {
    onEvent({ message: "Checking authentication status" });

    let attemptCt = 1;
    let maxCt = 10;

    while (true) {
      console.log(`Trying to authenticate (attempt ${attemptCt} of ${maxCt})`);

      try {
        const pageKind = await getPageKind(args.page, extractor.currentPageMap);
        onEvent({ message: `Detected page kind: ${pageKind}` });

        if (pageKind === "dashboard") {
          onEvent({ message: "Authenticated" });
          await page.waitForTimeout(2000);
          break;
        }

        if (pageKind === "login") {
          onEvent({ message: "Entering bank credentials" });
          await extractor.enterCredentials(args);
          await page.waitForTimeout(2000);
        }

        if (pageKind === "mfa") {
          onEvent({ message: "Entering two-factor code" });
          await extractor.enterMfaCode(args);
          await page.waitForTimeout(2000);
        }
      } catch (e) {
        onEvent({ message: `Error authenticating: ${e}` });
        await page.reload();
        await page.waitForTimeout(3000);
      }

      if (attemptCt === maxCt) {
        throw `Unable to authenticate after ${maxCt} attempts`;
      }

      attemptCt += 1;
    }
  };

  await authenticate();
  const accountValue = await getAccountValue();
  const transactions = await getTransactions();

  return {
    accountValue,
    transactions,
  };
};

const waitForMfaCode = async (
  bankId: string,
  onEvent: OnExtractionEvent
): Promise<string> => {
  onEvent({ message: "Starting wait for mfa code", needMfaCode: true });
  let maxSec = 60 * 4;

  for (let i = 0; i < maxSec; i++) {
    const mfaInfo = await fetchMfaInfo(bankId);
    if (mfaInfo?.code) {
      onEvent({
        message: `Received code; clearing info for ${bankId}`,
        mfaFinish: true,
      });
      return mfaInfo.code;
    }

    onEvent({ message: `No code found yet (${i}/${maxSec}s)...` });
    await delay(1000);
  }

  onEvent({ message: `No code found in ${maxSec}s`, mfaFinish: true });

  throw `No code found in ${maxSec}s`;
};

const fetchMfaInfo = async (bankId: string): Promise<MfaInfo | undefined> => {
  const url = `${process.env.SERVER_URL_LOCALHOST}/mfa/current`;
  console.log(`Fetching mfa info at ${url}`);

  const res = await got.post(url).json<GetMfaInfoApiPayload>();
  const info = res.data.mfaInfos.find((o) => o.bankId === bankId);
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
