import fs from "fs";
import {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  LaunchOptions,
  Page,
  firefox,
} from "playwright-core";
import { Config, ConfigBankId, Price, Transaction } from "shared";
import { CONFIG_PATH, EXTRACTIONS_PATH, TMP_DIR } from "../constants";
import db from "../db";
import { delay, toPretty } from "../utils";
import { Extractor, ExtractorDateRange, ExtractorFuncArgs } from "types";
import { CharlesSchwabBankExtractor, ChaseBankExtractor } from "./extractors";
import { logger } from "./log";
import { parseTransactions } from "./utils";

const BROWSER_CONTEXT_PATH = `${TMP_DIR}/browser-context.json`;
const HEADLESS = false;

const extractors: Record<ConfigBankId, Extractor> = {
  "charles-schwab-bank": new CharlesSchwabBankExtractor(),
  "chase-bank": new ChaseBankExtractor(),
};

const setUp = async (): Promise<[Browser, BrowserContext]> => {
  const launchOptions: LaunchOptions = {
    headless: HEADLESS,
    timeout: 0,
    env: {
      PWDEBUG: "1",
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

const run = async () => {
  try {
    await runAllExtractors();
  } catch (e) {
    console.log("Error running extractors:", e);
  }
};

const runAllExtractors = async () => {
  const tmpRunDir = `${EXTRACTIONS_PATH}/${new Date()}`;
  fs.mkdirSync(tmpRunDir);

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
    console.log(`Starting extraction for ${toPretty(configAccount)}`);

    const extractor = extractors[configAccount.info.bankId];
    const configBank = config.banks[configAccount.info.bankId];
    const configCredentials = config.credentials[configAccount.info.bankId];

    const page = await browserContext.newPage();
    page.setViewportSize({ width: 1948, height: 955 });

    // page.on("close", (e) => console.log("close"));
    // page.on("domcontentloaded", (e) => console.log("domcontentloaded"));
    // page.on("frameattached", (e) => console.log("frameattached"));
    // page.on("framedetached", (e) => console.log("framedetached"));
    // page.on("framenavigated", (e) => console.log("framenavigated"));
    // page.on("load", (e) => console.log("load"));

    const getMfaCode = async (): Promise<string> => {
      const code = await waitForMfaCode(configAccount.info.bankId, () => {
        db.setExtractionStatus({ status: "wait-for-mfa" });
      });
      return code;
    };

    db.setExtractionStatus({
      status: "run-extractor",
      accountId: configAccount.info.id,
    });

    let accountValue: Price | undefined;
    let transactions: Transaction[] = [];

    try {
      const resp = await runExtractor({
        extractor,
        configAccount,
        configBank,
        configCredentials,
        page,
        getMfaCode,
      });
      accountValue = resp.accountValue;
      transactions = resp.transactions;
    } catch (e) {
      console.log(`Error running extractor: ${e}`);
      db.deleteMfaInfo(configAccount.info.bankId);
      continue;
    }

    db.updateAccount(configAccount.info.id, {
      id: configAccount.info.id,
      number: configAccount.info.number,
      price: accountValue,
    });
    console.log(`Updated account value: ${accountValue.amount}`);

    const foundCt = transactions.length;
    totalFoundCt += foundCt;
    const addCt = db.addTransactions(transactions);
    totalAddCt += addCt;
    console.log(`Added ${addCt} of ${foundCt} found transactions`);

    await browserContext.storageState({ path: BROWSER_CONTEXT_PATH });
    await page.close();

    console.log("----------------------------------");
  }

  db.setExtractionStatus({ status: "tear-down" });
  await tearDown(browser, browserContext);

  const deltaTime = (Date.now() - startTime.valueOf()) / 1000;
  console.log(
    `Added ${totalAddCt} of ${totalFoundCt} found transactions across ${configAccounts.length} accounts; completed in ${deltaTime}s`
  );
  db.setExtractionStatus({ status: "idle" });
};

export const runExtractor = async (
  args: ExtractorFuncArgs
): Promise<{
  accountValue: Price;
  transactions: Transaction[];
}> => {
  const { extractor, configAccount, configCredentials, page } = args;

  const getAccountValue = async (): Promise<Price> => {
    console.log("Loading accounts start page");
    await extractor.loadAccountsStartPage(args);
    await page.waitForTimeout(3000);

    console.log("Checking authentication status");
    await authenticate();
    await page.waitForTimeout(3000);

    console.log("Scraping account value");
    let accountValue = await extractor.scrapeAccountValue(args);

    const accountType = args.configAccount.info.type;
    if (accountType === "liabilities" || accountType === "expenses") {
      accountValue.amount *= -1;
    }

    console.log(
      `Found account value: ${accountValue.amount} ${accountValue.currency}`
    );
    return accountValue;
  };

  const getTransactions = async (): Promise<Transaction[]> => {
    const spanMs = args.configBank.exportRangeMonths * 30 * 24 * 60 * 60 * 1000;

    let transactions: Transaction[] = [];
    let end = new Date();

    while (true) {
      const start = new Date(end.valueOf() - spanMs);
      const range: ExtractorDateRange = { start, end };
      const prettyRange = `[${range.start}, ${range.end}]`;

      console.log(`Getting transactions for range ${prettyRange}`);

      let transactionsChunk: Transaction[] = [];
      try {
        await page.goto("about:blank");

        console.log("Loading transactions start page");
        await extractor.loadTransactionsStartPage(args);
        await page.waitForTimeout(3000);

        console.log("Checking authentication status");
        await authenticate();
        await page.waitForTimeout(3000);

        console.log("Scraping transaction data");
        const data = await extractor.scrapeTransactionData({ ...args, range });

        console.log("Parsing transactions");
        transactionsChunk = await parseTransactions(data, configAccount);
      } catch (e) {
        console.log("Error getting transaction data:", e);
        break;
      }

      if (transactionsChunk.length === 0) {
        console.log(`No new transactions for range ${prettyRange}; stopping`);
        break;
      }

      console.log(`Found ${transactionsChunk.length} transactions`);
      transactions = [...transactions, ...transactionsChunk];

      end = start;
    }

    return transactions;
  };

  const authenticate = async (): Promise<void> => {
    let dashboardExists = await extractor.getDashboardExists(args);
    if (dashboardExists) {
      console.log("Already authenticated");
      return;
    }

    console.log("Entering credentials if needed");
    await extractor.enterCredentials(args);
    await page.waitForTimeout(1000);

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

const waitForMfaCode = async (
  bankId: ConfigBankId,
  onChange: () => void
): Promise<string> => {
  db.setMfaInfo(bankId);
  let maxSec = 60 * 2;

  for (let i = 0; i < maxSec; i++) {
    const status = db.getExtractionStatus();
    const info = status.mfaInfos.find((o) => o.bankId === bankId);

    if (info?.code) {
      console.log(`Clearing two-factor info for ${bankId}`);
      db.deleteMfaInfo(bankId);
      onChange();
      return info.code;
    }

    console.log(`No code found yet (${i}/${maxSec}s)...`);
    await delay(1000);
  }

  console.log(`No code found in ${maxSec}s`);
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

export default { run };
