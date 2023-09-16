import { UUID, randomUUID } from "crypto";
import bcrypt from "bcrypt";
import sqlite3 from "sqlite3";
import {
  Account,
  Transaction,
  GetTransactionsApiPayload,
  BankCreds,
  BankCredsMap,
  Extraction,
  MfaInfo,
} from "shared";
import { Device, User } from "./types.js";
import {
  buildFiltersFromQuery,
  transactionMatchesFilters,
  transactionsMaxPrice,
  transactionsSumPrice,
  transactionsEarliestDate,
  encrypt,
  decrypt,
} from "./utils/index.js";

const saltRounds = 10;

let db: sqlite3.Database;

const connect = async (dbPath: string) => {
  try {
    db = await new Promise<sqlite3.Database>((res, rej) => {
      const _db = new sqlite3.Database(dbPath, (e) => {
        if (e) {
          rej(e);
        } else {
          res(_db);
        }
      });
    });
    await migrate();
  } catch (e) {
    console.log(`Error connecting to database at path ${dbPath}: ${e}`);
    process.exit(1);
  }
};

const migrate = async () => {
  await new Promise<void>((res, rej) => {
    db.exec(
      `
      create table if not exists accounts(
        id text primary key,
        created_at text,
        updated_at text,
        bank_id text,
        display text,
        number text,
        kind text,
        type text,
        price_amount decimal(8,2),
        price_currency text,
        preferred_mfa_option text
      )
      `,
      (e) => {
        if (e) {
          rej(e);
        } else {
          res();
        }
      }
    );
  });

  await new Promise<void>((res, rej) => {
    db.exec(
      `
      create table if not exists transactions(
        id text primary key,
        account_id text,
        created_at text,
        updated_at text,
        date text,
        post_date text,
        payee text,
        price_amount decimal(8,2),
        price_currency text,
        type text,
        description text,
        foreign key(account_id) references accounts(id)
        unique (account_id, post_date, price_amount, price_currency) on conflict fail
      )
      `,
      (e) => {
        if (e) {
          rej(e);
        } else {
          res();
        }
      }
    );
  });

  await new Promise<void>((res, rej) => {
    db.exec(
      `
      create table if not exists extractions(
        id text primary key,
        account_id text,
        queued_at text,
        started_at text,
        updated_at text,
        finished_at text,
        found_ct integer,
        add_ct integer,
        error text,
        foreign key(account_id) references accounts(id)
      )
      `,
      (e) => {
        if (e) {
          rej(e);
        } else {
          res();
        }
      }
    );
  });

  await new Promise<void>((res, rej) => {
    db.exec(
      `
      create table if not exists mfa_infos(
        bank_id text primary key,
        code text,
        requested_at text
      )
      `,
      (e) => {
        if (e) {
          rej(e);
        } else {
          res();
        }
      }
    );
  });

  await new Promise<void>((res, rej) => {
    db.exec(
      `
      create table if not exists users(
        id text primary key,
        email text,
        password text,
        bank_credentials text
      )
      `,
      (e) => {
        if (e) {
          rej(e);
        } else {
          res();
        }
      }
    );
  });

  await new Promise<void>((res, rej) => {
    db.exec(
      `
      create table if not exists devices(
        id text primary key,
        created_at text,
        token text
      )
      `,
      (e) => {
        if (e) {
          rej(e);
        } else {
          res();
        }
      }
    );
  });
};

const close = async () => {
  db.close();
  console.log("Database closed");
};

const getBankCredsMap = async (
  userPassword?: string
): Promise<BankCredsMap> => {
  if (!userPassword) {
    throw "Invalid user password";
  }

  const user = await getUser();

  try {
    const credsStr = decrypt(user.bankCredentials, userPassword);
    const credsMap = JSON.parse(credsStr) as BankCredsMap;
    return credsMap;
  } catch (e) {
    return {};
  }
};

const getBankCreds = async (
  bankId: string,
  userPassword?: string
): Promise<BankCreds> => {
  const credsMap = await getBankCredsMap(userPassword);
  const creds = credsMap[bankId];
  if (!creds) {
    throw "Credentials not found";
  }

  return creds;
};

const setBankCreds = async (
  bankId: string,
  creds: BankCreds,
  userPassword?: string
) => {
  if (!userPassword) {
    throw "Invalid user password";
  }

  const credsMap = await getBankCredsMap(userPassword);
  credsMap[bankId] = creds;
  const credsStr = JSON.stringify(credsMap);

  const encryptedCreds = encrypt(credsStr, userPassword);

  const user = await getUser();
  await updateUser(user._id, {
    ...user,
    bankCredentials: encryptedCreds,
  });
};

const getAccounts = async (): Promise<Account[]> => {
  const accounts = await new Promise<Account[]>((res, rej) => {
    db.all<Record<string, any>[]>(`select * from accounts`, (e, rows) => {
      if (e) {
        rej(e);
      } else {
        res(rows.map(accountFromRow));
      }
    });
  });
  return accounts;
};

const getAccount = async (id: string): Promise<Account> => {
  const account = await new Promise<Account>((res, rej) => {
    db.get<Record<string, any>>(
      `select * from accounts where id = $id`,
      {
        $id: id,
      },
      (e, row) => {
        if (e || !row) {
          rej(e ?? "Record not found");
        } else {
          res(accountFromRow(row));
        }
      }
    );
  });
  return account;
};

const addAccount = async (): Promise<Account> => {
  const account = await new Promise<Account>((res, rej) => {
    db.get<Record<string, any>>(
      `
    insert into accounts values(
      $id,
      $created_at,
      $updated_at,
      $bank_id,
      $display,
      $number,
      $kind,
      $type,
      $price_amount,
      $price_currency,
      $preferred_mfa_option
    )
    returning *
    `,
      {
        $id: randomUUID(),
        $created_at: new Date().toISOString(),
        $updated_at: new Date().toISOString(),
        $bank_id: "",
        $display: "",
        $number: "",
        $kind: "unselected",
        $type: "assets",
        $price_amount: 0,
        $price_currency: "USD",
        $preferred_mfa_option: "sms",
      },
      (e, row) => {
        if (e || !row) {
          rej(e ?? "Record not found");
        } else {
          res(accountFromRow(row));
        }
      }
    );
  });
  return account;
};

const updateAccount = async (
  id: UUID,
  update: Partial<Account>
): Promise<Account> => {
  let extraSqlSet = "";
  if (update.price) {
    extraSqlSet = `,
    updated_at = $updated_at,
    price_amount = $price_amount,
    price_currency = $price_currency
      `;
  }

  const account = await new Promise<Account>((res, rej) => {
    db.get<Record<string, any>>(
      `
    update accounts set
      id = $id,
      bank_id = $bank_id,
      display = $display,
      number = $number,
      kind = $kind,
      type = $type,
      price_amount = $price_amount,
      price_currency = $price_currency,
      preferred_mfa_option = $preferred_mfa_option
      ${extraSqlSet}
    where id = $id
    returning *
    `,
      {
        $id: id,
        $updated_at: update._updatedAt,
        $bank_id: update.bankId,
        $display: update.display,
        $number: update.number,
        $kind: update.kind,
        $type: update.type,
        $price_amount: update.price?.amount,
        $price_currency: update.price?.currency,
        $preferred_mfa_option: update.preferredMfaOption,
      },
      (e, row) => {
        if (e || !row) {
          rej(e ?? "Record not found");
        } else {
          res(accountFromRow(row));
        }
      }
    );
  });
  return account;
};

const deleteAccount = async (id: UUID) => {
  db.get<Record<string, any>>(`delete from accounts where id = $id`, {
    $id: id,
  });
};

const getTransactions = async (
  query: string
): Promise<GetTransactionsApiPayload["data"]> => {
  const transactions = await new Promise<Transaction[]>((res, rej) => {
    db.all<Record<string, any>[]>(`select * from transactions`, (e, rows) => {
      if (e) {
        rej(e);
      } else {
        res(rows.map(transactionFromRow));
      }
    });
  });

  let payload: GetTransactionsApiPayload["data"] = {
    filteredTransactions: [],
    filteredCt: 0,
    filteredSumPrice: {
      amount: 0,
      currency: "USD",
    },
    overallCt: transactions.length,
    overallSumPrice: transactionsSumPrice(transactions),
    overallMaxPrice: transactionsMaxPrice(transactions),
    overallEarliestDate: transactionsEarliestDate(transactions),
  };

  if (query.length > 0) {
    // TODO: Filter transactions in sql query instead.
    const filters = buildFiltersFromQuery(query);
    for (const t of transactions) {
      if (transactionMatchesFilters(t, filters)) {
        payload.filteredTransactions.push(t);
      }
    }
  } else {
    payload.filteredTransactions = transactions;
  }
  payload.filteredCt = payload.filteredTransactions.length;
  payload.filteredSumPrice = transactionsSumPrice(payload.filteredTransactions);

  return payload;
};

const addTransactions = async (
  transactions: Omit<Transaction, "_id">[]
): Promise<number> => {
  let addCt = 0;

  for (const t of transactions) {
    try {
      await new Promise<void>((res, rej) => {
        db.get(
          `
        insert into transactions values(
          $id,
          $account_id,
          $created_at,
          $updated_at,
          $date,
          $post_date,
          $payee,
          $price_amount,
          $price_currency,
          $type,
          $description
        )
        `,
          {
            $id: randomUUID(),
            $account_id: t.accountId,
            $created_at: t._createdAt,
            $updated_at: t._updatedAt,
            $date: t.date,
            $post_date: t.postDate,
            $payee: t.payee,
            $price_amount: t.price.amount,
            $price_currency: t.price.currency,
            $type: t.type,
            $description: t.description,
          },
          (e) => {
            if (e) {
              rej(e);
            } else {
              res();
            }
          }
        );
      });
      addCt += 1;
    } catch (e) {
      console.log("Transaction error:", e);
    }
  }

  return addCt;
};

const getExtractions = async (): Promise<Extraction[]> => {
  const extractions = await new Promise<Extraction[]>((res, rej) => {
    db.all<Record<string, any>[]>(`select * from extractions`, (e, rows) => {
      if (e) {
        rej(e);
      } else {
        res(rows.map(extractionFromRow));
      }
    });
  });
  return extractions;
};

const getExtraction = async (id: UUID): Promise<Extraction | undefined> => {
  const extraction = await new Promise<Extraction>((res, rej) => {
    db.get<Record<string, any>>(
      `select * from extractions where id = $id`,
      {
        $id: id,
      },
      (e, row) => {
        if (e || !row) {
          rej(e ?? "Record not found");
        } else {
          res(extractionFromRow(row));
        }
      }
    );
  });
  return extraction;
};

const getExtractionsPending = async (): Promise<Extraction[]> => {
  const extractions = await new Promise<Extraction[]>((res, rej) => {
    db.all<Record<string, any>[]>(
      `select * from extractions where started_at is null and finished_at is null`,
      (e, rows) => {
        if (e) {
          rej(e);
        } else {
          res(rows.map(extractionFromRow));
        }
      }
    );
  });
  return extractions;
};

const getExtractionsUnfinished = async (): Promise<Extraction[]> => {
  const extractions = await new Promise<Extraction[]>((res, rej) => {
    db.all<Record<string, any>[]>(
      `select * from extractions where finished_at is null`,
      (e, rows) => {
        if (e) {
          rej(e);
        } else {
          res(rows.map(extractionFromRow));
        }
      }
    );
  });
  return extractions;
};

const addExtractionPending = async (accountId: UUID): Promise<Extraction> => {
  const extraction = await new Promise<Extraction>((res, rej) => {
    db.get<Record<string, any>>(
      `
        insert into extractions values(
          $id,
          $account_id,
          $queued_at,
          $started_at,
          $updated_at,
          $finished_at,
          $found_ct,
          $add_ct,
          $error
        )
        returning *
        `,
      {
        $id: randomUUID(),
        $account_id: accountId,
        $queued_at: new Date().toISOString(),
        $found_ct: 0,
        $add_ct: 0,
      },
      (e, row) => {
        if (e || !row) {
          rej(e ?? "Record not found");
        } else {
          res(extractionFromRow(row));
        }
      }
    );
  });
  return extraction;
};

const updateExtraction = async (
  id: UUID,
  update: Partial<Extraction>
): Promise<Extraction> => {
  const existing = await getExtraction(id);

  const account = await new Promise<Extraction>((res, rej) => {
    db.get<Record<string, any>>(
      `
    update extractions set
      id = $id,
      account_id = $account_id,
      queued_at = $queued_at,
      started_at = $started_at,
      updated_at = $updated_at,
      finished_at = $finished_at,
      found_ct = $found_ct,
      add_ct = $add_ct,
      error = $error
    where id = $id
    returning *
    `,
      {
        $id: id,
        $account_id: update.accountId ?? existing?.accountId,
        $queued_at: update.queuedAt ?? existing?.queuedAt,
        $started_at: update.startedAt ?? existing?.startedAt,
        $updated_at: update.updatedAt ?? existing?.updatedAt,
        $finished_at: update.finishedAt ?? existing?.finishedAt,
        $found_ct: update.foundCt ?? existing?.foundCt,
        $add_ct: update.addCt ?? existing?.addCt,
        $error: update.error ?? existing?.error,
      },
      (e, row) => {
        if (e || !row) {
          rej(e ?? "Record not found");
        } else {
          res(extractionFromRow(row));
        }
      }
    );
  });
  return account;
};

/**
 * Sets end timestamps on any in-progress extractions.
 */
const abortAllUnfinishedExtractions = async () => {
  const extractions = await getExtractionsUnfinished();
  for (const extraction of extractions) {
    await updateExtraction(extraction._id, {
      finishedAt: new Date().toISOString(),
      error: "Aborted",
    });
  }
};

const getMfaInfos = async (): Promise<MfaInfo[]> => {
  const infos = await new Promise<MfaInfo[]>((res, rej) => {
    db.all<Record<string, any>[]>(`select * from mfa_infos`, (e, rows) => {
      if (e) {
        rej(e);
      } else {
        res(rows.map(mfaInfoFromRow));
      }
    });
  });
  return infos;
};

const getMfaInfo = async (bankId: string): Promise<MfaInfo> => {
  const info = await new Promise<MfaInfo>((res, rej) => {
    db.get<Record<string, any>>(
      `select * from mfa_infos where bank_id = $bank_id`,
      {
        $bank_id: bankId,
      },
      (e, row) => {
        if (e || !row) {
          rej(e ?? "Record not found");
        } else {
          res(mfaInfoFromRow(row));
        }
      }
    );
  });
  return info;
};

const setMfaInfo = async (
  info: Omit<MfaInfo, "requestedAt">
): Promise<MfaInfo> => {
  let updated: MfaInfo = { ...info, requestedAt: "" };

  try {
    const existing = await getMfaInfo(info.bankId);
    updated = await new Promise<MfaInfo>((res, rej) => {
      db.get<Record<string, any>>(
        `
      update mfa_infos set code = $code
      where bank_id = $bank_id
      returning *
      `,
        {
          $bank_id: info.bankId,
          $code: info.code,
        },
        (e, row) => {
          if (e || !row) {
            rej(e ?? "Record not found");
          } else {
            res(mfaInfoFromRow(row));
          }
        }
      );
    });
  } catch (e) {
    updated = await new Promise<MfaInfo>((res, rej) => {
      db.get<Record<string, any>>(
        `
      insert into mfa_infos values(
        $bank_id,
        $code,
        $requested_at
      )
      returning *
      `,
        {
          $bank_id: info.bankId,
          $code: info.code,
          $requested_at: new Date().toISOString(),
        },
        (e, row) => {
          if (e || !row) {
            rej(e ?? "Record not found");
          } else {
            res(mfaInfoFromRow(row));
          }
        }
      );
    });
  }

  return updated;
};

const deleteMfaInfo = async (bankId: string) => {
  await new Promise((res, rej) => {
    db.get<Record<string, any>[]>(
      `delete from mfa_infos where bank_id = $bank_id`,
      {
        $bankId: bankId,
      }
    );
  });
};

const getUser = async (): Promise<User> => {
  const user = await new Promise<User>((res, rej) => {
    db.get<Record<string, any>>(`select * from users limit 1`, (e, row) => {
      if (e || !row) {
        rej(e ?? "Record not found");
      } else {
        res(userFromRow(row));
      }
    });
  });
  return user;
};

const addUser = async (args: {
  email: string;
  password: string;
}): Promise<User> => {
  const user = await new Promise<User>(async (res, rej) => {
    const passwordHash = await bcrypt.hash(args.password, saltRounds);

    db.get<Record<string, any>>(
      `
        insert into users values(
          $id,
          $email,
          $password,
          $bank_credentials
        )
        returning *
        `,
      {
        $id: randomUUID(),
        $email: args.email,
        $password: passwordHash,
        $bank_credentials: "",
      },
      (e, row) => {
        if (e || !row) {
          rej(e ?? "Record not found");
        } else {
          res(userFromRow(row));
        }
      }
    );
  });
  return user;
};

const updateUser = async (id: UUID, update: Partial<User>): Promise<User> => {
  const existing = await getUser();

  const user = await new Promise<User>((res, rej) => {
    db.get<Record<string, any>>(
      `
    update users set
      id = $id,
      email = $email,
      password = $password,
      bank_credentials = $bank_credentials
    where id = $id
    returning *
    `,
      {
        $id: id,
        $email: update.email ?? existing.email,
        $password: update.password ?? existing.password,
        $bank_credentials: update.bankCredentials ?? existing.bankCredentials,
      },
      (e, row) => {
        if (e || !row) {
          rej(e ?? "Record not found");
        } else {
          res(userFromRow(row));
        }
      }
    );
  });
  return user;
};

const getDevice = async (id: string): Promise<Device> => {
  const device = await new Promise<Device>((res, rej) => {
    db.get<Record<string, any>>(
      `select * from devices where id = $id`,
      {
        $id: id,
      },
      (e, row) => {
        if (e || !row) {
          rej(e ?? "Record not found");
        } else {
          res(deviceFromRow(row));
        }
      }
    );
  });
  return device;
};

const addDevice = async (password: string): Promise<Device> => {
  const device = await new Promise<Device>(async (res, rej) => {
    const token = await bcrypt.hash(password, saltRounds);

    db.get<Record<string, any>>(
      `
      insert into devices values(
        $id,
        $token,
        $created_at
      )
      returning *
      `,
      {
        $id: randomUUID(),
        $token: token,
        $created_at: new Date().toISOString(),
      },
      (e, row) => {
        if (e || !row) {
          rej(e ?? "Record not found");
        } else {
          res(deviceFromRow(row));
        }
      }
    );
  });
  return device;
};

const accountFromRow = (row: Record<string, any>): Account => {
  const account: Account = {
    _id: row.id,
    _createdAt: row.created_at,
    _updatedAt: row.updated_at,
    bankId: row.bank_id,
    display: row.display,
    number: row.number,
    kind: row.kind,
    type: row.type,
    price: {
      amount: row.price_amount ?? 0,
      currency: row.price_currency ?? "USD",
    },
    preferredMfaOption: row.preferred_mfa_option,
  };
  return account;
};

const transactionFromRow = (row: Record<string, any>): Transaction => {
  const transaction: Transaction = {
    _id: row.id,
    _createdAt: row.created_at,
    _updatedAt: row.updated_at,
    date: row.date,
    postDate: row.post_date,
    accountId: row.account_id,
    payee: row.payee,
    price: {
      amount: row.price_amount,
      currency: row.price_currency,
    },
    type: row.type,
    description: row.description,
  };
  return transaction;
};

const extractionFromRow = (row: Record<string, any>): Extraction => {
  const extraction: Extraction = {
    _id: row.id,
    accountId: row.account_id,
    queuedAt: row.queued_at,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    finishedAt: row.finished_at,
    foundCt: row.found_ct,
    addCt: row.add_ct,
    error: row.error,
  };
  return extraction;
};

const mfaInfoFromRow = (row: Record<string, any>): MfaInfo => {
  const info: MfaInfo = {
    bankId: row.bank_id,
    code: row.code,
    requestedAt: row.requested_at,
  };
  return info;
};

const userFromRow = (row: Record<string, any>): User => {
  const user: User = {
    _id: row.id,
    email: row.email,
    password: row.password,
    bankCredentials: row.bank_credentials,
  };
  return user;
};

const deviceFromRow = (row: Record<string, any>): Device => {
  const device: Device = {
    _id: row.id,
    _createdAt: row.created_at,
    token: row.token,
  };
  return device;
};

export default {
  connect,
  close,
  getBankCredsMap,
  getBankCreds,
  setBankCreds,
  getAccounts,
  getAccount,
  addAccount,
  updateAccount,
  deleteAccount,
  getTransactions,
  addTransactions,
  getExtractions,
  getExtraction,
  getExtractionsPending,
  getExtractionsUnfinished,
  addExtractionPending,
  updateExtraction,
  abortAllUnfinishedExtractions,
  getMfaInfos,
  getMfaInfo,
  setMfaInfo,
  deleteMfaInfo,
  getUser,
  addUser,
  updateUser,
  getDevice,
  addDevice,
};
