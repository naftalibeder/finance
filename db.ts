import fs from "fs";
import { DB_PATH } from "./constants";
import { Database, Transaction } from "./types";

const loadDatabase = (): Database => {
  if (!fs.existsSync(DB_PATH)) {
    return {
      transactions: [],
    };
  }

  const data = fs.readFileSync(DB_PATH, { encoding: "utf-8" });
  const db = JSON.parse(data) as Database;
  return db;
};

const getTransactions = (): Transaction[] => {
  const db = loadDatabase();
  return db.transactions;
};

const addTransactions = (newTransactions: Transaction[]): number => {
  const db = loadDatabase();

  let updatedTransactions = [...db.transactions];
  let addCt = 0;
  newTransactions.forEach((n) => {
    const existing = updatedTransactions.find((u) => {
      return (
        u.date === n.date &&
        u.payee === n.payee &&
        u.account === n.account &&
        u.price.amount === n.price.amount
      );
    });

    if (existing) {
      return;
    }

    updatedTransactions.push(n);
    addCt += 1;
  });
  db.transactions = updatedTransactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const dbStrUpdated = JSON.stringify(db, undefined, 2);
  fs.writeFileSync(DB_PATH, dbStrUpdated, { encoding: "utf-8" });

  return addCt;
};

export default { getTransactions, addTransactions };
