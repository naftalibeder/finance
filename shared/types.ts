/** A specific account at a bank. */
type Account = {
  id: string;
  number: string;
  type: AccountType;
  price: Price;
  meta?: {
    createdAt: string;
    updatedAt: string;
  };
};

/** The type of resource stored in the account. */
type AccountType = "assets" | "liabilities" | "equity" | "revenue" | "expenses";

/** A unique transaction. */
type Transaction = {
  date: string;
  postDate: string;
  accountId: string;
  payee: string;
  price: Price;
  type: string;
  description: string;
  meta?: {
    createdAt: string;
    updatedAt: string;
  };
};

/** An amount of money in a specific currency. */
type Price = {
  amount: number;
  currency: string;
};

/** User information loaded from `config.json`. */
type Config = {
  accounts: ConfigAccount[];
  credentials: Record<string, ConfigCredentials>;
};

/** Information about an account for loading and running an extractor. */
type ConfigAccount = {
  /** A globally unique id representing the account internally. */
  id: string;
  /** A unique id that matches one of the available extractors. */
  bankId: string;
  /** The display name or nickname of the account. */
  display: string;
  /** The account number. */
  number: string;
  kind: ConfigAccountKind;
  type: AccountType;
  /** Whether the extractor for this account should be skipped. */
  skip: boolean;
};

type ConfigAccountKind =
  | "checking"
  | "savings"
  | "brokerage"
  | "credit"
  | "debit";

type ConfigCredentials = {
  username: string;
  password: string;
};

type MfaInfo = {
  bankId: string;
  code?: string;
  requestedAt: string;
};

type ExtractionStatus = {
  status: "idle" | "set-up" | "run-extractor" | "wait-for-mfa" | "tear-down";
  accountId?: string;
  mfaInfos: MfaInfo[];
};

export {
  Account,
  AccountType,
  Transaction,
  Price,
  Config,
  ConfigAccount,
  ConfigAccountKind,
  ConfigCredentials,
  MfaInfo,
  ExtractionStatus,
};
