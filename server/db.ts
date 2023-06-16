import fs from "fs";
import {
  Account,
  ExtractionStatus,
  Price,
  Transaction,
  GetTransactionsApiPayload,
  Secure,
} from "shared";
import { Database } from "types";
import { DB_PATH, SECURE_PATH } from "./constants";
import {
  buildFiltersFromQuery,
  transactionMatchesFilters,
  transactionsMaxPrice,
  transactionsSumPrice,
} from "./utils";
import { UUID, randomUUID } from "crypto";

const initial: Database = {
  accounts: [],
  transactions: [],
  extractionStatus: {
    accounts: {},
    mfaInfos: [],
  },
};

const readDatabase = (): Database => {
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

export const getAccounts = (): { accounts: Account[]; sum: Price } => {
  const db = readDatabase();
  const accounts = db.accounts;

  let sum: Price = {
    amount: 0,
    currency: "USD",
  };
  for (const account of accounts) {
    sum.amount += account.price.amount;
  }

  return {
    accounts,
    sum,
  };
};

export const getAccount = (id: string): Account | undefined => {
  const db = readDatabase();
  const account = db.accounts.find((o) => o._id === id);
  return account;
};

export const createAccount = (): { account: Account } => {
  const db = readDatabase();

  const account: Account = {
    _id: randomUUID(),
    _pending: true,
    _createdAt: new Date().toISOString(),
    _updatedAt: new Date().toISOString(),
    bankId: "",
    display: "",
    number: "",
    kind: "checking",
    type: "assets",
    price: {
      amount: 0,
      currency: "USD",
    },
  };
  db.accounts.push(account);

  writeDatabase(db);
  return { account };
};

export const updateAccount = (
  id: UUID,
  update: Partial<Omit<Account, "_createdAt" | "_updatedAt">>
): { account?: Account } => {
  const db = readDatabase();

  const index = db.accounts.findIndex((o) => o._id === id);
  if (index === -1) {
    return { account: undefined };
  }

  const existing = db.accounts[index];
  const next = {
    ...existing,
    ...update,
    _createdAt: existing._createdAt,
    _updatedAt: update.price ? new Date().toISOString() : existing._updatedAt,
  };
  db.accounts[index] = next;

  writeDatabase(db);
  return { account: next };
};

export const getTransactions = (
  query: string
): GetTransactionsApiPayload["data"] => {
  const db = readDatabase();

  let payload: GetTransactionsApiPayload["data"] = {
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

  if (query.length > 0) {
    const filters = buildFiltersFromQuery(query);
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

  return payload;
};

export const addTransactions = (newTransactions: Transaction[]): number => {
  const db = readDatabase();

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

export const getExtractionStatus = (): ExtractionStatus => {
  const db = readDatabase();
  const status = db.extractionStatus;
  return status;
};

export const setExtractionStatus = (
  accountIds: string[],
  status?: ExtractionStatus["accounts"][string]
) => {
  const db = readDatabase();
  for (const id of accountIds) {
    if (status) {
      db.extractionStatus.accounts[id] = status;
    } else {
      delete db.extractionStatus.accounts[id];
    }
  }
  writeDatabase(db);
};

export const setMfaInfo = (bankId: string, code?: string) => {
  const db = readDatabase();
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

export const deleteMfaInfo = (bankId: string) => {
  const db = readDatabase();
  const infos = db.extractionStatus.mfaInfos;
  const index = infos.findIndex((o) => o.bankId === bankId);
  if (index === -1) {
    return;
  }

  db.extractionStatus.mfaInfos.splice(index, 1);
  writeDatabase(db);
};

export const clearExtractionStatus = () => {
  const db = readDatabase();
  db.extractionStatus = initial.extractionStatus;
  writeDatabase(db);
};

const readSecure = (): Secure => {
  const dataStr = fs.readFileSync(SECURE_PATH, { encoding: "utf-8" });
  const data = JSON.parse(dataStr) as Secure;
  return data;
};

const writeSecure = (secure: Secure) => {
  const dataStrUpdated = JSON.stringify(secure, undefined, 2);
  fs.writeFileSync(SECURE_PATH, dataStrUpdated, { encoding: "utf-8" });
};

export const getUserCreds = (): Secure["userCreds"] => {
  const data = readSecure();
  return data.userCreds;
};

export const setUserToken = (token: string) => {
  const data = readSecure();
  data.userCreds.token = token;
  writeSecure(data);
};

export const getBankCreds = (): Secure["bankCreds"] => {
  const data = readSecure();
  return data.bankCreds;
};

export default {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  getTransactions,
  addTransactions,
  getExtractionStatus,
  setExtractionStatus,
  setMfaInfo,
  deleteMfaInfo,
  clearExtractionStatus,
  getUserCreds,
  setUserToken,
  getBankCreds,
};
