import fs from "fs";
import {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  firefox,
} from "playwright-core";
import extractors from "./extractors";
import { addToDatabase, parseTransactions } from "./utils";
import { Config } from "./types";
import { BROWSER_CONTEXT_PATH, CONFIG_PATH } from "./constants";

const main = async () => {
  const [browser, browserContext] = await setUp();

  const configStr = fs.readFileSync(CONFIG_PATH, { encoding: "utf-8" });
  const config = JSON.parse(configStr) as Config;

  for (const account of config.accounts) {
    const browserPage = await browserContext.newPage();
    const tmpFilePath = `tmp/${account.info.bankSlug}.${account.info.slug}.csv`;

    console.log(
      `Running extractor for ${account.info.bankSlug} ${account.info.slug}`
    );

    const extractor = extractors[account.info.bankSlug];
    const credentials = config.credentials[account.info.bankSlug];

    const rawData = await extractor.getData(browserPage, account, credentials);
    fs.writeFileSync(tmpFilePath, rawData, { encoding: "utf-8" });
    // const rawData = fs.readFileSync(tmpFilePath, { encoding: "utf-8" }); // Uncomment if debugging.

    const transactions = await parseTransactions(rawData, account);
    const addCt = addToDatabase(transactions);

    console.log(`Added ${addCt} new transactions`);

    await browserContext.storageState({ path: BROWSER_CONTEXT_PATH });
    await browserPage.close();
  }

  await tearDown(browser, browserContext);
};

const setUp = async (): Promise<[Browser, BrowserContext]> => {
  const browser = await firefox.launch({ headless: true });

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
