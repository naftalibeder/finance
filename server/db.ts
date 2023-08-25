import fs from "fs";
import { UUID, randomUUID } from "crypto";
import {
  Account,
  Price,
  Transaction,
  GetTransactionsApiPayload,
  BankCreds,
  BankCredsMap,
  Extraction,
  MfaInfo,
} from "shared";
import { Database, User } from "./types.js";
import { DB_PATH } from "./paths.js";
import {
  buildFiltersFromQuery,
  transactionMatchesFilters,
  transactionsMaxPrice,
  transactionsSumPrice,
  transactionsEarliestDate,
  encrypt,
  decrypt,
} from "./utils/index.js";

const initial: Database = {
  user: {
    email: "",
    password: "",
    devices: {},
  },
  bankCredentials: "",
  accounts: [],
  transactions: [],
  extractions: [],
  mfaInfos: [],
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

export const migrate = () => {
  const db = readDatabase();

  if (!db.extractions) {
    db.extractions = [];
  }

  if (!db.mfaInfos) {
    db.mfaInfos = [];
  }

  writeDatabase(db);
};

export const getBankCredsMap = (): BankCredsMap => {
  const db = readDatabase();

  const userPassword = process.env.USER_PASSWORD;
  if (!userPassword) {
    throw "Invalid user password";
  }

  const encryptedCreds = db.bankCredentials;
  try {
    const credsStr = decrypt(encryptedCreds, userPassword);
    const credsMap = JSON.parse(credsStr) as BankCredsMap;
    return credsMap;
  } catch (e) {
    return {};
  }
};

export const setBankCreds = (bankId: string, creds: BankCreds) => {
  const db = readDatabase();

  const credsMap = getBankCredsMap();
  credsMap[bankId] = creds;
  const credsStr = JSON.stringify(credsMap);

  const userPassword = process.env.USER_PASSWORD;
  if (!userPassword) {
    throw "Invalid user password";
  }

  const encryptedCreds = encrypt(credsStr, userPassword);
  db.bankCredentials = encryptedCreds;

  writeDatabase(db);
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
  const { accounts } = getAccounts();
  const account = accounts.find((o) => o._id === id);
  return account;
};

export const createAccount = (): { account: Account } => {
  const db = readDatabase();

  const account: Account = {
    _id: randomUUID(),
    _createdAt: new Date().toISOString(),
    _updatedAt: new Date().toISOString(),
    bankId: "",
    bankHasCreds: false,
    display: "",
    number: "",
    kind: "unselected",
    type: "assets",
    preferredMfaOption: "sms",
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
  update: Partial<Account>
): { account?: Account } => {
  const db = readDatabase();

  const index = db.accounts.findIndex((o) => o._id === id);
  if (index === -1) {
    return { account: undefined };
  }

  const existing = db.accounts[index];
  const next: Account = {
    ...existing,
    ...update,
    _createdAt: existing._createdAt,
    _updatedAt: update.price ? new Date().toISOString() : existing._updatedAt,
  };

  const credsMap = getBankCredsMap();
  const creds = credsMap[next.bankId];
  next.bankHasCreds = !!creds;

  db.accounts[index] = next;

  writeDatabase(db);
  return { account: next };
};

export const deleteAccount = (id: UUID) => {
  const db = readDatabase();

  const index = db.accounts.findIndex((o) => o._id === id);
  if (index === -1) {
    return;
  }

  db.accounts.splice(index, 1);
  writeDatabase(db);
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
    overallEarliestDate: transactionsEarliestDate(db.transactions),
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

export const getExtractions = (): Extraction[] => {
  const db = readDatabase();
  return db.extractions;
};

export const getExtractionsPending = (): Extraction[] => {
  const db = readDatabase();
  const extraction = db.extractions.filter((o) => {
    return !o.startedAt && !o.finishedAt;
  });
  return extraction;
};

export const getExtractionInProgress = (
  accountId: UUID
): Extraction | undefined => {
  const db = readDatabase();

  const extraction = db.extractions.find((o) => {
    return o.accountId === accountId && !o.finishedAt;
  });
  if (!extraction) {
    return undefined;
  }

  return extraction;
};

export const getOrCreateExtractionInProgress = (
  accountId: UUID
): Extraction => {
  const db = readDatabase();

  let extraction = getExtractionInProgress(accountId);
  if (!extraction) {
    extraction = {
      _id: randomUUID(),
      accountId: accountId,
      queuedAt: new Date().toISOString(),
      foundCt: 0,
      addCt: 0,
    };
    db.extractions.push(extraction);
  }

  writeDatabase(db);
  return extraction;
};

export const updateExtractionInProgress = (
  accountId: UUID,
  update: Partial<Extraction>
) => {
  const db = readDatabase();

  const index = db.extractions.findIndex((o) => {
    return o.accountId === accountId && !o.finishedAt;
  });
  if (index === -1) {
    return;
  }

  db.extractions[index] = {
    ...db.extractions[index],
    ...update,
  };
  writeDatabase(db);
};

/**
 * Sets end timestamps on any in-progress extraction for the provided account.
 */
export const closeExtractionInProgress = (accountId: UUID) => {
  updateExtractionInProgress(accountId, {
    finishedAt: new Date().toISOString(),
  });
};

export const getMfaInfos = (): MfaInfo[] => {
  const db = readDatabase();
  return db.mfaInfos;
};

export const setMfaInfo = (info: {
  bankId: string;
  options?: string[];
  option?: number;
  code?: string;
}) => {
  const db = readDatabase();
  const infos = db.mfaInfos;
  const index = infos.findIndex((o) => o.bankId === info.bankId);

  if (index > -1) {
    const existing = infos[index];
    infos[index] = {
      ...existing,
      code: info.code,
    };
  } else {
    infos.push({
      bankId: info.bankId,
      code: info.code,
      requestedAt: new Date().toISOString(),
    });
  }

  db.mfaInfos = infos;
  writeDatabase(db);
};

export const deleteMfaInfo = (bankId: string) => {
  const db = readDatabase();
  const infos = db.mfaInfos;
  const index = infos.findIndex((o) => o.bankId === bankId);
  if (index === -1) {
    return;
  }

  db.mfaInfos.splice(index, 1);
  writeDatabase(db);
};

export const getUser = (): User => {
  const db = readDatabase();
  return db.user;
};

export const setUser = (user: User) => {
  const db = readDatabase();
  db.user = user;
  writeDatabase(db);
};

export const setDevice = (name: string, token: string) => {
  const db = readDatabase();
  db.user.devices[name] = {
    token,
    createdAt: new Date().toISOString(),
  };
  writeDatabase(db);
};

export default {
  migrate,
  getBankCredsMap,
  setBankCreds,
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  getTransactions,
  addTransactions,
  getExtractions,
  getExtractionsPending,
  getExtractionInProgress,
  getOrCreateExtractionInProgress,
  updateExtractionInProgress,
  closeExtractionInProgress,
  getMfaInfos,
  setMfaInfo,
  deleteMfaInfo,
  getUser,
  setUser,
  setDevice,
};
