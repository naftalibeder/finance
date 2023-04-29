import fs from "fs";
import { parse } from "csv-parse";
import {
  Database,
  ExtractorAccount,
  ExtractorTransactionKey,
  Transaction,
} from "./types";

export const parseTransactions = async (
  rawData: string,
  account: ExtractorAccount
): Promise<Transaction[]> => {
  const { info, deleteRows, columnMap } = account;

  // Remove non-transaction lines.

  console.log(`Removing ${deleteRows.length} rows from raw data`);

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

  console.log("Parsing raw data");

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
        res(rows);
      });
      parser.write(rawDataCleaned);
      parser.end();
    });
  } catch (e) {
    console.error("Parser error:", e);
    return [];
  }

  // Convert generic records to transactions.

  console.log("Converting rows to transactions");

  let transactions: Transaction[] = [];
  for (const rec of records) {
    const recNorm: Record<ExtractorTransactionKey, string> = {
      date: rec[columnMap.date] ?? "",
      account: rec[columnMap.account] ?? "",
      payee: rec[columnMap.payee] ?? "",
      price: rec[columnMap.price] ?? "",
      priceWithdrawal: rec[columnMap.priceWithdrawal] ?? "",
      priceDeposit: rec[columnMap.priceDeposit] ?? "",
      description: rec[columnMap.description] ?? "",
    };

    let priceAmount = 0;
    if (recNorm.price.length > 0) {
      const priceStr = recNorm.price.replace("$", "");
      priceAmount = parseFloat(priceStr);
    } else if (recNorm.priceWithdrawal.length > 0) {
      const priceStr = recNorm.priceWithdrawal.replace("$", "");
      priceAmount = parseFloat(priceStr) * -1;
    } else if (recNorm.priceDeposit.length > 0) {
      const priceStr = recNorm.priceDeposit.replace("$", "");
      priceAmount = parseFloat(priceStr);
    }
    const priceCurrency = "USD";

    const transaction: Transaction = {
      date: new Date(recNorm.date).toLocaleDateString("en-CA"),
      account: info.slug,
      payee: recNorm.payee,
      price: {
        amount: priceAmount,
        currency: priceCurrency,
      },
      description: recNorm.description,
    };
    transactions.push(transaction);
  }

  console.log(`Found ${transactions.length} transactions`);

  return transactions;
};

export const addToDatabase = (transactions: Transaction[]): number => {
  const dbPath = "db.json";

  // Load the database.

  let db: Database = {
    transactions: [],
  };
  if (fs.existsSync(dbPath)) {
    const dbStr = fs.readFileSync(dbPath, { encoding: "utf-8" });
    db = JSON.parse(dbStr);
  }

  // Add transactions, skipping duplicates.

  let addCt = 0;
  transactions.forEach((t) => {
    const existing = db.transactions.find((o) => {
      return (
        o.date === t.date &&
        o.account === t.account &&
        o.price.amount === t.price.amount
      );
    });

    if (existing) {
      return;
    }

    db.transactions.push(t);
    addCt += 1;
  });

  // Resave the database.

  const dbStrUpdated = JSON.stringify(db, undefined, 2);
  fs.writeFileSync(dbPath, dbStrUpdated, { encoding: "utf-8" });

  return addCt;
};
