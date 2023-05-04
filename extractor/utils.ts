import readline from "readline";
import { parse } from "csv-parse";
import {
  ExtractorAccount,
  ExtractorTransactionKey,
  Price,
  Transaction,
} from "../types";
import { Frame, FrameLocator, Page } from "playwright-core";

export const parseTransactions = async (
  transactionData: string,
  account: ExtractorAccount
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
  account: ExtractorAccount
): Transaction | undefined => {
  const { info, columnMap } = account;

  const rowNorm: Record<ExtractorTransactionKey, string> = {
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

export const toPretty = (o: ExtractorAccount): string => {
  return `${o.info.bankId}-${o.info.id}`;
};

// TODO: Handle "01/18/2022 as of 01/15/2022" etc.
export const toDate = (s: string): Date | undefined => {
  const date = new Date(s);
  if (isNaN(date.getTime())) {
    return undefined;
  }

  return date;
};

// TODO: Handle other currencies. Consider https://github.com/dinerojs/dinero.js.
export const toPrice = (s: string): Price | undefined => {
  const valueStr = s.replace("$", "").replace(",", "");
  const currency = "USD";

  const amount = parseFloat(valueStr);
  if (isNaN(amount)) {
    return undefined;
  }

  return {
    amount,
    currency,
  };
};

export const toYYYYMMDD = (d: Date): string => {
  return d.toLocaleDateString("en-CA");
};
