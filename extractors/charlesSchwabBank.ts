import { Locator, Page } from "playwright-core";
import { Extractor, ExtractorContext, Transaction } from "../types";
import fs from "fs";
import { parse } from "csv-parse";

const run = async (
  browserPage: Page,
  extractorContext: ExtractorContext
): Promise<Transaction[]> => {
  await authenticate(browserPage, extractorContext);
  const rawData = await getRawData(browserPage, extractorContext);
  // const rawData = fs.readFileSync(
  //   "./tmp/test.txt",
  //   { encoding: "utf-8" }
  // );
  const transactions = await parseTransactions(rawData, extractorContext);
  return transactions;
};

const authenticate = async (
  browserPage: Page,
  extractorContext: ExtractorContext
) => {
  console.log("Checking authentication");

  let loc: Locator;

  await browserPage.goto(
    "https://client.schwab.com/app/accounts/transactionhistory"
  );

  try {
    loc = browserPage.locator("#meganav-menu-utl-logout");
    await loc.waitFor({ state: "attached", timeout: 2000 });

    console.log("Already authenticated; continuing");
    return;
  } catch (e) {
    console.log("Not authenticated yet");
  }

  const loginFrame = browserPage.frames()[2];

  loc = loginFrame.locator("#loginIdInput");
  await loc.type(extractorContext.username);

  loc = loginFrame.locator("#passwordInput");
  await loc.type(extractorContext.password);

  loc = loginFrame.locator("#btnLogin");
  await loc.click();

  console.log("Authenticated");
};

const getRawData = async (
  browserPage: Page,
  extractorContext: ExtractorContext
): Promise<string> => {
  let loc: Locator;

  // History and export.

  console.log("Navigating to export page");

  const dashboardFrame = browserPage.mainFrame();

  loc = dashboardFrame.locator("#meganav-secondary-menu-hist");
  await loc.click();

  loc = dashboardFrame.locator(".sdps-account-selector");
  await loc.click();

  loc = dashboardFrame.locator(".sdps-account-selector__list-item", {
    hasText: extractorContext.account,
  });
  await loc.click();

  loc = dashboardFrame.locator(".transactions-history-container");
  await loc.click();

  loc = dashboardFrame.locator("#bttnExport button");
  await loc.click();

  // Popup.

  console.log("Launching export popup");

  const popupPage = await browserPage.waitForEvent("popup");
  await popupPage.waitForLoadState("domcontentloaded");
  await popupPage.waitForLoadState("networkidle");

  loc = popupPage.locator(".button-primary");
  await loc.click();

  // File handling.

  console.log("Waiting for download");

  const download = await browserPage.waitForEvent("download");
  const downloadPath = await download.path();
  const rawData = fs.readFileSync(downloadPath!, { encoding: "utf-8" });

  console.log("Downloaded data");

  return rawData;
};

const parseTransactions = async (
  rawData: string,
  extractorContext: ExtractorContext
): Promise<Transaction[]> => {
  const { deleteRows, columnMap } = extractorContext;

  // Remove non-transaction lines.

  console.log(`Cleaning raw data (removing ${deleteRows} rows)`);

  let rawDataCleaned = rawData;

  if (deleteRows.length > 0) {
    const rows = rawData.split("\n");
    deleteRows.forEach((d, i) => {
      if (d < 0) {
        deleteRows[i] = rows.length - 1 + d;
      }
    });
    deleteRows.sort((a, b) => b - a);
    deleteRows.forEach((d, _) => {
      rows.splice(d, 1);
    });
    rawDataCleaned = rows.join("\n");
  }

  // Get generic records from each row.

  let records: string[][];
  try {
    records = await new Promise<string[][]>((res, rej) => {
      const rows: string[][] = [];

      const parser = parse({
        delimiter: ",",
      });
      parser.on("readable", () => {
        let row: string[];
        while ((row = parser.read()) !== null) {
          rows.push(row);
        }
      });
      parser.on("error", (e) => {
        rej(e);
      });
      parser.on("end", () => {
        console.log("Parser ended");
        res(rows);
      });
      parser.write(rawDataCleaned);
      parser.end();
    });
    console.log("Parser success:", records);
  } catch (e) {
    console.error("Parser error:", e);
    return [];
  }

  // Convert generic records to transactions.

  let transactions: Transaction[] = [];
  for (const r of records) {
    const transaction: Transaction = {
      date: r[columnMap.date],
      payee: r[columnMap.payee],
      price: r[columnMap.price],
      description: r[columnMap.description],
    };
    transactions.push(transaction);
  }

  return transactions;
};

const extractor: Extractor = {
  run,
};

export { extractor };
