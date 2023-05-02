import readline from "readline";
import { parse } from "csv-parse";
import {
  ExtractorAccount,
  ExtractorTransactionKey,
  Transaction,
} from "../types";

export const parseTransactions = async (
  rawData: string,
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
      parser.write(rawData);
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
    account: row[columnMap.account] ?? "",
    payee: row[columnMap.payee] ?? "",
    price: row[columnMap.price] ?? "",
    priceWithdrawal: row[columnMap.priceWithdrawal] ?? "",
    priceDeposit: row[columnMap.priceDeposit] ?? "",
    description: row[columnMap.description] ?? "",
  };

  // TODO: Handle "01/18/2022 as of 01/15/2022" etc.
  const date = new Date(rowNorm.date);
  if (isNaN(date.getTime())) {
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

  // TODO: Handle other currencies.
  priceStr = priceStr.replace("$", "");
  const priceCurrency = "USD";

  let priceAmount = parseFloat(priceStr);
  if (isNaN(priceAmount)) {
    return undefined;
  }
  priceAmount = priceAmount * multiplier;

  const transaction: Transaction = {
    date: dateStr,
    account: info.slug,
    payee: rowNorm.payee,
    price: {
      amount: priceAmount,
      currency: priceCurrency,
    },
    description: rowNorm.description,
  };
  return transaction;
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

export const toYYYYMMDD = (d: Date): string => {
  return d.toLocaleDateString("en-CA");
};
