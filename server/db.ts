import fs from "fs";
import { Account, Transaction } from "shared";
import { Database } from "types";
import { DB_PATH } from "./constants";

const loadDatabase = (): Database => {
  if (!fs.existsSync(DB_PATH)) {
    return {
      accounts: [],
      transactions: [],
    };
  }

  const data = fs.readFileSync(DB_PATH, { encoding: "utf-8" });
  const db = JSON.parse(data) as Database;
  return db;
};

const writeDatabase = (db: Database) => {
  const dbStrUpdated = JSON.stringify(db, undefined, 2);
  fs.writeFileSync(DB_PATH, dbStrUpdated, { encoding: "utf-8" });
};

const getAccounts = (): Account[] => {
  const db = loadDatabase();
  return db.accounts;
};

const updateAccount = (account: Account) => {
  const db = loadDatabase();
  const index = db.accounts.findIndex((o) => o.id === account.id);
  if (index > -1) {
    db.accounts[index] = account;
  } else {
    db.accounts.push(account);
  }
  writeDatabase(db);
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
        u.accountId === n.accountId &&
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

  writeDatabase(db);

  return addCt;
};

export default {
  getAccounts,
  updateAccount,
  getTransactions,
  addTransactions,
};
