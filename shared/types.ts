/** A specific account at a bank. */
export type Account = {
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
export type Transaction = {
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
export type Price = {
  amount: number;
  currency: string;
};

/** User information loaded from `config.json`. */
export type Config = {
  accounts: ConfigAccount[];
  credentials: Record<string, ConfigCredentials>;
};

/** Information about an account for loading and running an extractor. */
export type ConfigAccount = {
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

export type ConfigAccountKind =
  | "checking"
  | "savings"
  | "brokerage"
  | "credit"
  | "debit";

export type ConfigCredentials = {
  username: string;
  password: string;
};

export type MfaInfo = {
  bankId: string;
  code?: string;
  requestedAt: string;
};

export type ExtractionStatus = {
  status: "idle" | "set-up" | "run-extractor" | "wait-for-mfa" | "tear-down";
  accountId?: string;
  mfaInfos: MfaInfo[];
};

export interface MatchTextFilter {
  readonly type: "matchText";
  text: string;
}

export interface ComparePriceFilter {
  readonly type: "comparePrice";
  operator: ">" | "<" | "~";
  price: Price;
}

export type Filter = MatchTextFilter | ComparePriceFilter;

export type AccountsApiPayload = {
  data: {
    accounts: Account[];
    sum: Price;
  };
};

export type TransactionsApiArgs = {
  query: string;
};

export type TransactionsApiPayload = {
  data: {
    filteredTransactions: Transaction[];
    filteredSum: Price;
    filteredCt: number;
    totalCt: number;
  };
};
