import fs from "fs";
import {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  firefox,
} from "playwright-core";
import { Config } from "./types";
import { BROWSER_CONTEXT_PATH } from "./constants";
import extractors from "./extractors";
import { parseTransactions } from "./utils";

const main = async () => {
  const [browser, browserContext] = await setUp();

  const configStr = fs.readFileSync("./config.json", { encoding: "utf-8" });
  const config = JSON.parse(configStr) as Config;

  for (const e of config.extractorContexts) {
    const browserPage = await browserContext.newPage();

    console.log(`Running extractor for ${e.bank}`);

    const extractor = extractors[e.bank];
    const rawData = await extractor.getData(browserPage, e);
    const transactions = await parseTransactions(rawData, e);

    fs.writeFileSync(`db.json`, JSON.stringify(transactions, undefined, 2), {
      encoding: "utf-8",
    });

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
