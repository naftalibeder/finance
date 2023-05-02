import fs from "fs";
import {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  firefox,
} from "playwright-core";
import extractors from "./extractors";
import {
  addTransactionsToDatabase,
  parseTransactions,
  toYYYYMMDD,
} from "./utils";
import { Config } from "./types";
import { BROWSER_CONTEXT_PATH, CONFIG_PATH } from "./constants";

const main = async () => {
  const [browser, browserContext] = await setUp();

  const configStr = fs.readFileSync(CONFIG_PATH, { encoding: "utf-8" });
  const config = JSON.parse(configStr) as Config;

  for (const account of config.accounts) {
    if (account.skip) {
      continue;
    }

    const browserPage = await browserContext.newPage();

    const extractor = extractors[account.info.bankSlug];
    const credentials = config.credentials[account.info.bankSlug];

    console.log(
      `Running extractor for ${account.info.bankSlug} ${account.info.slug}`
    );

    let end = new Date();

    while (true) {
      const spanMs = 1000 * 60 * 60 * 24 * 30 * 6; // ~6 months.
      const start = new Date(end.valueOf() - spanMs);
      const prettyRange = `${toYYYYMMDD(start)}-${toYYYYMMDD(end)}`;
      console.log(`Extracting date range ${prettyRange}`);

      const rawData = await extractor.getData(
        browserPage,
        account,
        credentials,
        { start, end }
      );

      const tmpFilePath = `tmp/${account.info.bankSlug}.${account.info.slug}.${prettyRange}.csv`;
      fs.writeFileSync(tmpFilePath, rawData, { encoding: "utf-8" });
      // const rawData = fs.readFileSync(tmpFilePath, { encoding: "utf-8" }); // Uncomment if debugging.

      const transactions = await parseTransactions(rawData, account);
      const addCt = addTransactionsToDatabase(transactions);
      console.log(`Added ${addCt} new transactions for range ${prettyRange}`);

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

main();
