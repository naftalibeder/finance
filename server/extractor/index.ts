import fs from "fs";
import {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  LaunchOptions,
  Page,
  firefox,
} from "playwright-core";
import { BufferChunk, Config, ConfigBankId, Price, Transaction } from "shared";
import { CONFIG_PATH, EXTRACTIONS_PATH, TMP_DIR } from "../constants";
import db from "../db";
import { delay, toPretty, toYYYYMMDD } from "../utils";
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

const runAllExtractors = async (onProgress: (chunk: BufferChunk) => void) => {
  const tmpRunDir = `${EXTRACTIONS_PATH}/${new Date()}`;
  fs.mkdirSync(tmpRunDir);

  const startTime = Date.now();
  let totalAddCt = 0;

  const configStr = fs.readFileSync(CONFIG_PATH, { encoding: "utf-8" });
  const config = JSON.parse(configStr) as Config;
  const configAccounts = config.accounts.filter((o) => !o.skip);

  console.log(`Preparing extraction for ${configAccounts.length} accounts`);
  onProgress({ message: "Starting..." });

  const [browser, browserContext] = await setUp();

  for (const configAccount of configAccounts) {
    console.log(`Starting extraction for ${toPretty(configAccount)}`);
    onProgress({
      message: `Extracting ${configAccount.info.display}...`,
    });

    const extractor = extractors[configAccount.info.bankId];
    const configCredentials = config.credentials[configAccount.info.bankId];

    const page = await browserContext.newPage();
    page.setViewportSize({ width: 1948, height: 955 });

    const args: ExtractorFuncArgs = {
      extractor,
      configAccount,
      configCredentials,
      page,
      getMfaCode: async () => {
        const code = await waitForMfaCode(
          configAccount.info.bankId,
          onProgress
        );
        return code;
      },
    };

    try {
      const { accountValue, transactions } = await runExtractor(args);

      db.updateAccount(configAccount.info.id, {
        id: configAccount.info.id,
        number: configAccount.info.number,
        price: accountValue,
      });
      console.log(`Updated account value in database: ${accountValue.amount}`);

      const addCt = db.addTransactions(transactions);
      console.log(`Added ${addCt} transactions in database`);
    } catch (e) {
      console.log(`Error running extractor: ${e}`);
    }

    await browserContext.storageState({ path: BROWSER_CONTEXT_PATH });
    await page.close();

    console.log("----------------------------------");
  }

  await tearDown(browser, browserContext);

  console.log(
    `Added ${totalAddCt} transactions across ${configAccounts.length} accounts`
  );

  const deltaTime = (Date.now() - startTime) / 1000;
  console.log(`Extraction completed in ${deltaTime}s`);
};

export const runExtractor = async (
  args: ExtractorFuncArgs
): Promise<{
  accountValue: Price;
  transactions: Transaction[];
}> => {
  const { extractor, configAccount, configCredentials, page } = args;

  const getAccountValue = async (): Promise<Price> => {
    console.log("Loading accounts page");
    await extractor.loadAccountsPage(args);

    console.log("Checking if credentials are needed");
    await extractor.enterCredentials(args);
    await extractor.enterMfaCode(args);

    const accountValue = await extractor.scrapeAccountValue(args);
    return accountValue;
  };

  const getTransactions = async (): Promise<Transaction[]> => {
    const spanMs = 1000 * 60 * 60 * 24 * 365; // ~1 year.

    let transactions: Transaction[] = [];
    let end = new Date();

    while (true) {
      const start = new Date(end.valueOf() - spanMs);
      const range: ExtractorDateRange = { start, end };
      const prettyRange = `[${toYYYYMMDD(range.start)}, ${toYYYYMMDD(
        range.end
      )}]`;

      console.log(`Getting transactions for range ${prettyRange}`);

      let transactionsChunk: Transaction[] = [];
      try {
        console.log("Loading history page");
        await extractor.loadHistoryPage(args);
        await extractor.enterCredentials(args);
        await extractor.enterMfaCode(args);

        const data = await extractor.scrapeTransactionData({ ...args, range });
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

  const accountValue = await getAccountValue();
  const transactions = await getTransactions();

  return {
    accountValue,
    transactions,
  };
};

const waitForMfaCode = async (
  bankId: ConfigBankId,
  onProgress: (chunk: BufferChunk) => void
): Promise<string> => {
  db.setMfaInfo(bankId, { bankId: bankId, requestedAt: new Date() });
  onProgress({ needsCheck: true });

  let maxSec = 60 * 2;

  for (let i = 0; i < maxSec; i++) {
    const infos = db.getMfaInfos();
    const info = infos.find((o) => o.bankId === bankId);
    if (info?.code) {
      db.deleteMfaInfo(bankId);
      return info.code;
    }

    console.log(`No code found yet (${i}/${maxSec}s)...`);
    await delay(1000);
  }

  db.deleteMfaInfo(bankId);
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

export default { runAllExtractors };
