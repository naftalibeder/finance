import { parse } from "csv-parse";
import { ConfigAccount, Transaction } from "shared/types";
import { Frame, FrameLocator } from "playwright-core";
import { toDate, toPrice } from "../utils";

export const parseTransactions = async (
  transactionData: string,
  configAccount: ConfigAccount
): Promise<{ transactions: Transaction[]; skipCt: number }> => {
  let skipCt = 0;

  const transactions = await new Promise<Transaction[]>((res, rej) => {
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

  const val = (i: number) => row[i] ?? "";

  const rowNorm: Record<
    keyof Omit<ConfigAccount["columnMap"], "accountId">,
    string
  > = {
    date: val(columnMap.date),
    postDate: val(columnMap.postDate),
    payee: val(columnMap.payee),
    price: val(columnMap.price),
    priceWithdrawal: val(columnMap.priceWithdrawal),
    priceDeposit: val(columnMap.priceDeposit),
    type: val(columnMap.type),
    description: val(columnMap.description),
  };

  const date = toDate(rowNorm.date);
  if (!date) {
    return undefined;
  }
  const dateStr = date.toISOString();

  let postDate = toDate(rowNorm.postDate);
  if (!postDate) {
    postDate = date;
  }
  const postDateStr = date.toISOString();

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
    postDate: postDateStr,
    accountId: info.id,
    payee: rowNorm.payee,
    price,
    type: rowNorm.type,
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
