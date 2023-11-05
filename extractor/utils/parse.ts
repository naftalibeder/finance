import { parse } from "csv-parse";
import { Account, Transaction } from "shared";
import { randomUUID } from "crypto";
import { toDate, toPrice } from "./index.js";
import {
  Extractor,
  ExtractorColumnMap,
  ExtractorColumnKind,
} from "../types.js";

export const parseTransactions = async (
  transactionData: string,
  account: Account,
  extractor: Extractor
): Promise<{
  transactions: Transaction[];
  lineCt: number;
  skipCt: number;
  errors: string[];
}> => {
  let transactions: Transaction[] = [];
  let lineCt = 0;
  let skipCt = 0;
  let errors: string[] = [];

  const columnMap = extractor.getColumnMap(account.kind);
  if (!columnMap) {
    throw `Column map not provided for account kind ${account.kind}`;
  }

  transactions = await new Promise<Transaction[]>((res, rej) => {
    const ts: Transaction[] = [];
    const parser = parse({
      delimiter: ",",
      relaxColumnCount: true,
    });
    parser.on("readable", () => {
      let row: string[];
      while ((row = parser.read()) !== null) {
        lineCt += 1;
        try {
          const t = buildTransaction(row, account, columnMap);
          ts.push(t);
        } catch (e) {
          errors.push(
            `Transaction could not be parsed from row: ${e}
            ${row}
            ${columnMap}`
          );
          skipCt += 1;
          continue;
        }
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

  return { transactions, lineCt, skipCt, errors };
};

const buildTransaction = (
  row: string[],
  account: Account,
  columnMap: ExtractorColumnMap
): Transaction => {
  const dict: Record<ExtractorColumnKind, string> = {
    date: "",
    postDate: "",
    payee: "",
    price: "",
    priceWithdrawal: "",
    priceDeposit: "",
    type: "",
    description: "",
    memo: "",
  };
  columnMap.forEach((kind, i) => {
    if (kind) {
      dict[kind] = row[i] ?? "";
    }
  });

  const date = toDate(dict.date);
  if (!date) {
    throw `Date could not be parsed from '${dict.date}'`;
  }
  const dateStr = date.toISOString();

  let postDate = toDate(dict.postDate);
  if (!postDate) {
    postDate = date;
  }
  const postDateStr = date.toISOString();

  let priceStr = "";
  let multiplier = 1;
  if (dict.price.length > 0) {
    priceStr = dict.price;
  } else if (dict.priceWithdrawal.length > 0) {
    priceStr = dict.priceWithdrawal;
    multiplier = -1;
  } else if (dict.priceDeposit.length > 0) {
    priceStr = dict.priceDeposit;
  }
  const price = toPrice(priceStr);
  if (!price) {
    throw `Price could not be parsed from '${priceStr}'`;
  }
  price.amount = price.amount * multiplier;

  const transaction: Transaction = {
    _id: randomUUID(),
    _createdAt: new Date().toISOString(),
    _updatedAt: new Date().toISOString(),
    date: dateStr,
    postDate: postDateStr,
    accountId: account._id,
    payee: dict.payee,
    price,
    type: dict.type,
    description: dict.description,
    memo: dict.memo,
  };
  return transaction;
};
