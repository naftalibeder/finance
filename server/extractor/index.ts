import fs from "fs";
import { UUID } from "crypto";
import {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  LaunchOptions,
  Page,
  firefox,
} from "@playwright/test";
import { Account, Bank, ExtractionAccount, Price, Transaction } from "shared";
import { EXTRACTIONS_PATH, TMP_DIR } from "../constants";
import db from "../db";
import { delay, prettyAccount, prettyDate, prettyDuration } from "../utils";
import { extractors } from "./extractors";
import { parseTransactions } from "./utils";
import { ExtractorFuncArgs } from "types";
import env from "../env";

const BROWSER_CONTEXT_PATH = `${TMP_DIR}/browser-context.json`;
const HEADLESS = true;

/**
 * Polls the current extraction and starts extraction on one pending account,
 * if available.
 */
const check = async () => {
  const extraction = db.getExtractionInProgress();
  if (!extraction) {
    console.log(`No extraction in progress; returning`);
    return;
  }

  const extractionAccounts = Object.values(extraction.accounts);
  const inProgressAccount = extractionAccounts.find(
    (o) => o.startedAt && !o.finishedAt
  );
  if (inProgressAccount) {
    console.log(`Extraction already in progress; returning`);
    return;
  }

  const pendingAccount = extractionAccounts.filter((o) => !o.startedAt);
  if (pendingAccount.length === 0) {
    console.log("No more accounts pending extraction");
    db.updateExtraction(extraction._id, {
      finishedAt: new Date().toISOString(),
    });

    console.log(`${extractionAccounts.length} accounts were extracted:`);
    for (const extractionAccount of extractionAccounts) {
      const { accountId, foundCt, addCt, startedAt, finishedAt } =
        extractionAccount;

      const account = db.getAccount(accountId);
      if (!account) {
        console.log(`Account with id ${accountId} does not exist`);
        continue;
      }

      const finishedAtMs = new Date(finishedAt!).valueOf();
      const startedAtMs = new Date(startedAt!).valueOf();
      const duration = prettyDuration(finishedAtMs - startedAtMs)!;
      console.log(
        `  - ${account.display}: ${foundCt} total; ${addCt} new (${duration})`
      );
    }
    console.log("Extraction complete!");
    return;
  }

  console.log(
    `Found ${pendingAccount.length} accounts pending extraction; running first`
  );
  const firstPendingAccount = pendingAccount[0];
  if (!extraction.startedAt) {
    db.updateExtraction(extraction._id, {
      startedAt: new Date().toISOString(),
    });
  }
  await runAccount(firstPendingAccount.accountId, extraction._id);

  await check();
};

/**
 * Extracts the current account value and all available transactions for the
 * provided account and writes that info to the database.
 */
const runAccount = async (accountId: UUID, extractionId: UUID) => {
  const account = db.getAccount(accountId);
  if (!account) {
    throw `Account with id ${accountId} not found`;
  }

  const log: ExtractorFuncArgs["log"] = (message?: any, ...params: any[]) => {
    const tag = `${account.bankId} | ${account.display} | ${message}`;
    console.log(tag, ...params);
  };

  const tmpRunDir = `${EXTRACTIONS_PATH}/${new Date().toISOString()}`;
  fs.mkdirSync(tmpRunDir, { recursive: true });

  // Prepare for the account extraction.

  log("Preparing extraction");
  const [browser, browserContext] = await setUp();

  // Run the account extraction.

  db.updateExtractionAccount(extractionId, accountId, {
    startedAt: new Date().toISOString(),
  });
  let extractionAccountUpdate: Partial<ExtractionAccount>;
  try {
    const { foundCt, addCt } = await extractAccount(
      account,
      tmpRunDir,
      browserContext,
      log
    );
    extractionAccountUpdate = { foundCt, addCt };
  } catch (e) {
    extractionAccountUpdate = { error: `${e}` };
  }
  db.updateExtractionAccount(extractionId, accountId, {
    ...extractionAccountUpdate,
    finishedAt: new Date().toISOString(),
  });

  // Clean up after the account extraction.

  await tearDown(browser, browserContext);
  db.deleteMfaInfo(account.bankId);
};

const setUp = async (): Promise<[Browser, BrowserContext]> => {
  console.log("Launching browser at", firefox.executablePath());
  const launchOptions: LaunchOptions = {
    headless: HEADLESS,
    timeout: 0,
    executablePath: env.get("BROWSER_EXECUTABLE"),
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

const extractAccount = async (
  account: Account,
  tmpRunDir: string,
  browserContext: BrowserContext,
  log: ExtractorFuncArgs["log"]
): Promise<{ foundCt: number; addCt: number }> => {
  const page = await browserContext.newPage();
  page.setViewportSize({ width: 1948, height: 955 });

  log(`Starting extraction`);

  const extractor = extractors[account.bankId];
  const bankCredsMap = db.getBankCredsMap();
  const bankCreds = bankCredsMap[account.bankId];

  let accountValue: Price | undefined;
  let transactions: Transaction[] = [];
  let singleIterFoundCt = 0;
  let singleIterAddCt = 0;

  try {
    const resp = await getAccountData({
      extractor,
      account,
      bankCreds,
      page,
      tmpRunDir,
      getMfaOption: async (options: string[]): Promise<number> => {
        const option = await waitForMfaOption(
          account.bankId,
          options,
          () => {},
          log
        );
        return option;
      },
      getMfaCode: async (): Promise<string> => {
        const code = await waitForMfaCode(account.bankId, () => {}, log);
        return code;
      },
      log,
    });
    accountValue = resp.accountValue;
    transactions = resp.transactions;
  } catch (e) {
    await takeErrorScreenshot(page, tmpRunDir);
    throw e;
  }

  if (accountValue !== undefined) {
    db.updateAccount(account._id, {
      ...account,
      price: accountValue,
    });
    log(`Updated account value: ${accountValue.amount}`);
  }

  if (transactions.length > 0) {
    singleIterFoundCt = transactions.length;
    const addCt = db.addTransactions(transactions);
    singleIterAddCt = addCt;
    log(`Added ${addCt} new of ${singleIterFoundCt} found transactions`);
  }

  await browserContext.storageState({ path: BROWSER_CONTEXT_PATH });
  await page.close();

  return {
    foundCt: singleIterFoundCt,
    addCt: singleIterAddCt,
  };
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

      let transactionsChunk: Transaction[] = [];
      let skipCt = 0;

      try {
        log(`Getting transactions for range ${prettyRange}`);
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
        if (transactions.length === 0) {
          throw `Error getting transaction data for range ${prettyRange}: ${e}`;
        } else {
          log(
            `Passed earliest allowed transaction range with ${prettyRange}; stopping loop`
          );
          break;
        }
      }

      if (transactionsChunk.length === 0) {
        log(`No new transactions for range ${prettyRange}; stopping loop`);
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

    log("Entering bank credentials if needed");
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

const waitForMfaOption = async (
  bankId: string,
  options: string[],
  onChange: () => void,
  log: ExtractorFuncArgs["log"]
): Promise<number> => {
  db.setMfaInfo({ bankId, options });
  let maxSec = 60 * 4;

  for (let i = 0; i < maxSec; i++) {
    const mfaInfos = db.getMfaInfos();
    const info = mfaInfos.find((o) => o.bankId === bankId);

    if (info?.option) {
      log(`Requesting two-factor option ${info.option} for ${bankId}`);
      db.setMfaInfo({ bankId });
      onChange();
      return info.option;
    }

    log(`No two-factor option found yet (${i}/${maxSec}s)...`);
    await delay(1000);
  }

  log(`No two-factor option found in ${maxSec}s`);
  db.deleteMfaInfo(bankId);
  onChange();

  throw `No two-factor option found in ${maxSec}s`;
};

const waitForMfaCode = async (
  bankId: string,
  onChange: () => void,
  log: ExtractorFuncArgs["log"]
): Promise<string> => {
  db.setMfaInfo({ bankId });
  let maxSec = 60 * 4;

  for (let i = 0; i < maxSec; i++) {
    const mfaInfos = db.getMfaInfos();
    const info = mfaInfos.find((o) => o.bankId === bankId);

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

const getBanks = (): { banks: Bank[] } => {
  const banks = Object.entries(extractors).map(([bankId, extractor]) => {
    return {
      id: bankId,
      displayName: extractor.bankDisplayName,
      displayNameShort: extractor.bankDisplayNameShort,
      supportedAccountKinds: extractor.supportedAccountKinds,
    };
  });
  return { banks };
};

export default {
  check,
  getBanks,
};
