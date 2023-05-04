import fs from "fs";
import {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  firefox,
} from "playwright-core";
import extractors from "./extractors";
import { parseTransactions, toYYYYMMDD } from "./utils";
import { Account, Config } from "../types";
import { CONFIG_PATH, TMP_DIR } from "../constants";
import db from "../db";

const BROWSER_CONTEXT_PATH = `${TMP_DIR}/browser-context.json`;

export const run = async () => {
  const [browser, browserContext] = await setUp();

  const configStr = fs.readFileSync(CONFIG_PATH, { encoding: "utf-8" });
  const config = JSON.parse(configStr) as Config;

  for (const accountConfig of config.accounts) {
    if (accountConfig.skip) {
      continue;
    }

    const browserPage = await browserContext.newPage();

    const extractor = extractors[accountConfig.info.bankId];
    const credentials = config.credentials[accountConfig.info.bankId];

    console.log(
      `Running extractor for ${accountConfig.info.bankId} ${accountConfig.info.id}`
    );

    const accountValue = await extractor.getAccountValue(
      browserPage,
      accountConfig,
      credentials
    );
    if (!accountValue) {
      continue;
    }
    const account: Account = {
      id: accountConfig.info.id,
      number: accountConfig.info.number,
      price: accountValue,
    };
    db.updateAccount(account);
    console.log(`Updated account value: ${account.price.amount}`);

    let end = new Date();
    while (true) {
      const spanMs = 1000 * 60 * 60 * 24 * 365; // ~1 year.
      const start = new Date(end.valueOf() - spanMs);
      const prettyRange = `${toYYYYMMDD(start)}-${toYYYYMMDD(end)}`;
      console.log(`Extracting date range ${prettyRange}`);

      const transactionData = await extractor.getTransactionData(
        browserPage,
        accountConfig,
        credentials,
        { start, end }
      );
      const transactions = await parseTransactions(
        transactionData,
        accountConfig
      );
      const addCt = db.addTransactions(transactions);
      console.log(`Added ${addCt} new transactions for range ${prettyRange}`);

      // Uncomment if debugging.
      // const tmpFilePath = `tmp/${accountConfig.info.bankId}.${accountConfig.info.id}.${prettyRange}.csv`;
      // fs.writeFileSync(tmpFilePath, transactionData, { encoding: "utf-8" });
      // const rawData = fs.readFileSync(tmpFilePath, { encoding: "utf-8" });

      if (addCt === 0) {
        break;
      }
      end = start;
    }

    await browserContext.storageState({ path: BROWSER_CONTEXT_PATH });
    await browserPage.close();
  }

  await tearDown(browser, browserContext);
};

const setUp = async (): Promise<[Browser, BrowserContext]> => {
  const browser = await firefox.launch({ headless: false });

  let options: BrowserContextOptions = {};
  if (fs.existsSync(BROWSER_CONTEXT_PATH)) {
    options.storageState = BROWSER_CONTEXT_PATH;
  }

  console.log("Launching browser with options:", options);

  const browserContext = await browser.newContext(options);
  return [browser, browserContext];
};

const tearDown = async (browser: Browser, browserContext: BrowserContext) => {
  console.log("Saving and closing browser");

  await browserContext.storageState({ path: BROWSER_CONTEXT_PATH });
  await browser.close();
};
