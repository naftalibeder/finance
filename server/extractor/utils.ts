import { parse } from "csv-parse";
import { ConfigAccount, Transaction } from "shared/types";
import { Frame, FrameLocator } from "playwright-core";
import { toDate, toPrice } from "../utils";

export const parseTransactions = async (
  transactionData: string,
  configAccount: ConfigAccount
): Promise<{ transactions: Transaction[]; skipCt: number }> => {
  let transactions: Transaction[] = [];
  let skipCt = 0;

  transactions = await new Promise<Transaction[]>((res, rej) => {
    const ts: Transaction[] = [];
    const parser = parse({
      delimiter: ",",
      relaxColumnCount: true,
    });
    parser.on("readable", () => {
      let row: string[];
      while ((row = parser.read()) !== null) {
        const t = buildTransaction(row, configAccount);
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

  return { transactions, skipCt };
};

const buildTransaction = (
  row: string[],
  configAccount: ConfigAccount
): Transaction | undefined => {
  const { info, columnMap } = configAccount;

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
    date: date.toISOString(),
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
