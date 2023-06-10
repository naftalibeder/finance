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
import {
  buildFiltersFromQuery,
  transactionMatchesFilters,
  transactionsMaxPrice,
  transactionsSumPrice,
} from "./utils";

const initial: Database = {
  accounts: [],
  transactions: [],
  extractionStatus: {
    accounts: {},
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
  const account = db.accounts.find((o) => o._id === id);
  return account;
};

const updateAccount = (
  id: string,
  update: Omit<Account, "_createdAt" | "_updatedAt">
) => {
  const db = loadDatabase();
  const index = db.accounts.findIndex((o) => o._id === id);

  if (index > -1) {
    const existing = db.accounts[index];
    db.accounts[index] = {
      ...existing,
      ...update,
      _createdAt: new Date().toISOString(),
      _updatedAt: new Date().toISOString(),
    };
  } else {
    db.accounts.push({
      ...update,
      _createdAt: new Date().toISOString(),
      _updatedAt: new Date().toISOString(),
    });
  }

  writeDatabase(db);
};

const getTransactions = (args: TransactionsApiArgs): TransactionsApiPayload => {
  const db = loadDatabase();

  let payload: TransactionsApiPayload["data"] = {
    filteredTransactions: [],
    filteredCt: 0,
    filteredSumPrice: {
      amount: 0,
      currency: "USD",
    },
    overallCt: db.transactions.length,
    overallSumPrice: transactionsSumPrice(db.transactions),
    overallMaxPrice: transactionsMaxPrice(db.transactions),
    overallEarliestDate: db.transactions[db.transactions.length - 1].date,
  };

  if (args.query.length > 0) {
    const filters = buildFiltersFromQuery(args.query);
    for (const t of db.transactions) {
      if (transactionMatchesFilters(t, filters)) {
        payload.filteredTransactions.push(t);
      }
    }
  } else {
    payload.filteredTransactions = db.transactions;
  }
  payload.filteredCt = payload.filteredTransactions.length;
  payload.filteredSumPrice = transactionsSumPrice(payload.filteredTransactions);

  return { data: payload };
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
      _createdAt: new Date().toISOString(),
      _updatedAt: new Date().toISOString(),
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

const setExtractionStatus = (
  accountIds: string[],
  status?: ExtractionStatus["accounts"][string]
) => {
  const db = loadDatabase();
  for (const id of accountIds) {
    if (status) {
      db.extractionStatus.accounts[id] = status;
    } else {
      delete db.extractionStatus.accounts[id];
    }
  }
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
