import { parse } from "csv-parse";
import { ExtractorContext, Transaction } from "./types";

export const parseTransactions = async (
  rawData: string,
  extractorContext: ExtractorContext
): Promise<Transaction[]> => {
  const { deleteRows, columnMap } = extractorContext;

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
  for (const r of records) {
    const priceStr = r[columnMap.price];
    const priceAmount = parseFloat(priceStr.replace("$", ""));
    const priceCurrency = "USD";

    const transaction: Transaction = {
      date: new Date(r[columnMap.date]).toLocaleDateString("en-CA"),
      account: extractorContext.account,
      payee: r[columnMap.payee],
      price: {
        amount: priceAmount,
        currency: priceCurrency,
      },
      description: r[columnMap.description],
    };
    transactions.push(transaction);
  }

  console.log(`Found ${transactions.length} transactions`);

  return transactions;
};
