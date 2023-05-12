import fs from "fs";
import {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  LaunchOptions,
  Page,
  firefox,
} from "playwright-core";
import { Config, ConfigBankId } from "shared";
import { CONFIG_PATH, EXTRACTIONS_PATH, TMP_DIR } from "../constants";
import db from "../db";
import { runExtractor } from "./utils";
import { toPretty } from "../utils";
import { Extractor } from "types";
import { CharlesSchwabBankExtractor } from "./extractors/charlesSchwabBank";
import { Logger } from "playwright-core";

const BROWSER_CONTEXT_PATH = `${TMP_DIR}/browser-context.json`;
const HEADLESS = false;

const extractors: Record<ConfigBankId, Extractor> = {
  "charles-schwab-bank": new CharlesSchwabBankExtractor(),
};

const run = async (onProgress: (msg: string) => void) => {
  const tmpRunDir = `${EXTRACTIONS_PATH}/${new Date()}`;
  fs.mkdirSync(tmpRunDir);

  const startTime = Date.now();
  let totalAddCt = 0;

  const configStr = fs.readFileSync(CONFIG_PATH, { encoding: "utf-8" });
  const config = JSON.parse(configStr) as Config;
  const accounts = config.accounts.filter((o) => !o.skip);

  console.log(`Preparing extraction for ${accounts.length} accounts`);
  onProgress("Starting...");

  const [browser, browserContext] = await setUp();

  for (const extractorAccount of config.accounts) {
    console.log(`Starting extraction for ${toPretty(extractorAccount)}`);
    onProgress(`Extracting ${extractorAccount.info.display}...`);

    const extractor = extractors[extractorAccount.info.bankId];
    const credentials = config.credentials[extractorAccount.info.bankId];

    const browserPage = await browserContext.newPage();
    browserPage.setViewportSize({ width: 1948, height: 955 });

    const { accountValue, transactions } = await runExtractor(
      extractor,
      browserPage,
      extractorAccount,
      credentials
    );

    if (accountValue !== undefined) {
      db.updateAccount({
        id: extractorAccount.info.id,
        number: extractorAccount.info.number,
        price: accountValue,
      });
      console.log(`Updated account value in database: ${accountValue.amount}`);
    }

    if (transactions.length > 0) {
      const addCt = db.addTransactions(transactions);
      console.log(`Added ${addCt} transactions in database`);
    }

    await browserContext.storageState({ path: BROWSER_CONTEXT_PATH });
    await browserPage.close();

    console.log("----------------------------------");
  }

  await tearDown(browser, browserContext);

  console.log(
    `Added ${totalAddCt} transactions across ${config.accounts.length} accounts`
  );

  const deltaTime = (Date.now() - startTime) / 1000;
  console.log(`Extraction completed in ${deltaTime}s`);
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

const logger: Logger = {
  isEnabled: function (
    name: string,
    severity: "info" | "error" | "verbose" | "warning"
  ): boolean {
    return severity === "error";
  },

  log: function (
    name: string,
    severity: "info" | "error" | "verbose" | "warning",
    message: string | Error,
    args: Object[],
    hints: { color?: string | undefined }
  ): void {
    console.log("Log | ", severity, message, JSON.stringify(args));
  },
};
