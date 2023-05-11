import readline from "readline";
import { parse } from "csv-parse";
import {
  ConfigAccount,
  ConfigCredentials,
  Price,
  Transaction,
} from "shared/types";
import { Frame, FrameLocator, Page } from "playwright-core";
import { Extractor, ExtractorDateRange } from "types";
import { toDate, toPrice, toYYYYMMDD } from "../utils";

export const runExtractor = async (
  extractor: Extractor,
  browserPage: Page,
  account: ConfigAccount,
  credentials: ConfigCredentials
) => {
  const getAccountValue = async (): Promise<Price | undefined> => {
    await extractor.loadAccountsPage(browserPage);
    await extractor.enterCredentials(browserPage, credentials);
    await extractor.enterTwoFactorCode(browserPage);

    const accountValue = await extractor.scrapeAccountValue(
      browserPage,
      account
    );
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
        await extractor.loadHistoryPage(browserPage);
        await extractor.enterCredentials(browserPage, credentials);
        await extractor.enterTwoFactorCode(browserPage);

        const data = await extractor.scrapeTransactionData(
          browserPage,
          account,
          range
        );
        transactionsChunk = await parseTransactions(data, account);
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

export const parseTransactions = async (
  transactionData: string,
  account: ConfigAccount
): Promise<Transaction[]> => {
  console.log("Parsing extracted data");

  let transactions: Transaction[] = [];
  let skipCt = 0;

  try {
    transactions = await new Promise<Transaction[]>((res, rej) => {
      const ts: Transaction[] = [];
      const parser = parse({
        delimiter: ",",
        relaxColumnCount: true,
      });
      parser.on("readable", () => {
        let row: string[];
        while ((row = parser.read()) !== null) {
          const t = buildTransaction(row, account);
          if (!t) {
            skipCt += 1;
            continue;
          }
          ts.push(t);
        }
      });
      parser.on("error", (e) => {
        rej(e);
      });
      parser.on("end", () => {
        res(ts);
      });
      parser.write(transactionData);
      parser.end();
    });
  } catch (e) {
    console.error("Parser error:", e);
    return [];
  }

  console.log(
    `Found ${transactions.length} valid transactions; skipped ${skipCt} invalid rows`
  );

  return transactions;
};

const buildTransaction = (
  row: string[],
  account: ConfigAccount
): Transaction | undefined => {
  const { info, columnMap } = account;

  const rowNorm: Record<keyof ConfigAccount["columnMap"], string> = {
    date: row[columnMap.date] ?? "",
    accountId: row[columnMap.accountId] ?? "",
    payee: row[columnMap.payee] ?? "",
    price: row[columnMap.price] ?? "",
    priceWithdrawal: row[columnMap.priceWithdrawal] ?? "",
    priceDeposit: row[columnMap.priceDeposit] ?? "",
    description: row[columnMap.description] ?? "",
  };

  const date = toDate(rowNorm.date);
  if (!date) {
    return undefined;
  }
  const dateStr = toYYYYMMDD(date);

  let priceStr = "";
  let multiplier = 1;
  if (rowNorm.price.length > 0) {
    priceStr = rowNorm.price;
  } else if (rowNorm.priceWithdrawal.length > 0) {
    priceStr = rowNorm.priceWithdrawal;
    multiplier = -1;
  } else if (rowNorm.priceDeposit.length > 0) {
    priceStr = rowNorm.priceDeposit;
  }
  const price = toPrice(priceStr);
  if (!price) {
    return undefined;
  }
  price.amount = price.amount * multiplier;

  const transaction: Transaction = {
    date: dateStr,
    accountId: info.id,
    payee: rowNorm.payee,
    price,
    description: rowNorm.description,
  };
  return transaction;
};

export const getSelectorExists = async (
  frame: Frame | FrameLocator,
  selector: string,
  timeout: number
): Promise<boolean> => {
  try {
    const loc = frame.locator(selector);
    await loc.waitFor({ state: "attached", timeout });
    return true;
  } catch (e) {
    return false;
  }
};

export const getUserInput = async (message: string): Promise<string> => {
  const input = await new Promise<string>((res) => {
    const r = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    r.question(`${message}\n`, (c) => {
      r.close();
      res(c);
    });
  });

  return input;
};
