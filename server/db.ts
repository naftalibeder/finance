import fs from "fs";
import {
  Account,
  AccountsApiPayload,
  ExtractionStatus,
  Price,
  Transaction,
  TransactionsApiArgs,
  TransactionsApiPayload,
} from "shared";
import { Database } from "types";
import { DB_PATH } from "./constants";
import { buildFiltersFromQuery, transactionMatchesFilters } from "./utils";

const initial: Database = {
  accounts: [],
  transactions: [],
  extractionStatus: {
    status: "idle",
    accountId: undefined,
    mfaInfos: [],
  },
};

const loadDatabase = (): Database => {
  if (!fs.existsSync(DB_PATH)) {
    return initial;
  }

  const data = fs.readFileSync(DB_PATH, { encoding: "utf-8" });
  const db = JSON.parse(data) as Database;
  return { ...initial, ...db };
};

const writeDatabase = (db: Database) => {
  const dbStrUpdated = JSON.stringify(db, undefined, 2);
  fs.writeFileSync(DB_PATH, dbStrUpdated, { encoding: "utf-8" });
};

const getAccounts = (): AccountsApiPayload => {
  const db = loadDatabase();
  const accounts = db.accounts;

  let sum: Price = {
    amount: 0,
    currency: "USD",
  };
  for (const account of accounts) {
    sum.amount += account.price.amount;
  }

  return {
    data: {
      accounts,
      sum,
    },
  };
};

const getAccount = (id: string): Account | undefined => {
  const db = loadDatabase();
  const account = db.accounts.find((o) => o.id === id);
  return account;
};

const updateAccount = (id: string, update: Account) => {
  const db = loadDatabase();
  const index = db.accounts.findIndex((o) => o.id === id);

  if (index > -1) {
    const existing = db.accounts[index];
    db.accounts[index] = {
      ...existing,
      ...update,
      meta: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  } else {
    db.accounts.push({
      ...update,
      meta: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }

  writeDatabase(db);
};

const getTransactions = (args: TransactionsApiArgs): TransactionsApiPayload => {
  const db = loadDatabase();

  let list: Transaction[] = [];
  let sum: Price = {
    amount: 0,
    currency: "USD",
  };
  if (args.query.length > 0) {
    const filters = buildFiltersFromQuery(args.query);
    for (const t of db.transactions) {
      const isMatchQuery = transactionMatchesFilters(t, filters);
      if (isMatchQuery) {
        list.push(t);
        sum.amount += t.price.amount;
      }
    }
  } else {
    list = db.transactions;
    sum = {
      amount: db.transactions.reduce((acc, cur) => acc + cur.price.amount, 0),
      currency: "USD",
    };
  }

  return {
    data: {
      filteredTransactions: list,
      filteredSum: sum,
      filteredCt: list.length,
      totalCt: db.transactions.length,
      earliestDate: db.transactions[db.transactions.length - 1].date,
    },
  };
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

    updatedTransactions.push({
      ...n,
      meta: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    addCt += 1;
  });
  db.transactions = updatedTransactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  writeDatabase(db);
  return addCt;
};

const getExtractionStatus = (): ExtractionStatus => {
  const db = loadDatabase();
  const status = db.extractionStatus;
  return status;
};

const setExtractionStatus = (status: Partial<ExtractionStatus>) => {
  const db = loadDatabase();
  db.extractionStatus = { ...db.extractionStatus, ...status };
  writeDatabase(db);
};

const setMfaInfo = (bankId: string, code?: string) => {
  const db = loadDatabase();
  const infos = db.extractionStatus.mfaInfos;
  const index = infos.findIndex((o) => o.bankId === bankId);

  if (index > -1) {
    const existing = infos[index];
    infos[index] = {
      ...existing,
      code,
    };
  } else {
    infos.push({
      bankId,
      code,
      requestedAt: new Date().toISOString(),
    });
  }

  db.extractionStatus.mfaInfos = infos;
  writeDatabase(db);
};

const deleteMfaInfo = (bankId: string) => {
  const db = loadDatabase();
  const infos = db.extractionStatus.mfaInfos;
  const index = infos.findIndex((o) => o.bankId === bankId);
  if (index === -1) {
    return;
  }

  db.extractionStatus.mfaInfos.splice(index, 1);
  writeDatabase(db);
};

const clearExtractionStatus = () => {
  const db = loadDatabase();
  db.extractionStatus = initial.extractionStatus;
  writeDatabase(db);
};

export default {
  getAccounts,
  getAccount,
  updateAccount,
  getTransactions,
  addTransactions,
  getExtractionStatus,
  setExtractionStatus,
  setMfaInfo,
  deleteMfaInfo,
  clearExtractionStatus,
};
