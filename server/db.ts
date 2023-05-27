import fs from "fs";
import {
  Account,
  ConfigBankId,
  ExtractionStatus,
  MfaInfo,
  Transaction,
} from "shared";
import { Database } from "types";
import { DB_PATH } from "./constants";

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

const getAccounts = (): Account[] => {
  const db = loadDatabase();
  return db.accounts;
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

const setMfaInfo = (bankId: ConfigBankId, code?: string) => {
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

const deleteMfaInfo = (bankId: ConfigBankId) => {
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
