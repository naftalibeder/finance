import { UUID } from "crypto";

/** A specific account at a bank. */
export type Account = {
  /** A globally unique id representing the account internally. */
  _id: string;
  _createdAt: string;
  _updatedAt: string;
  /** A unique id that matches one of the available extractors. */
  bankId: string;
  /** The display name or nickname of the account. */
  display: string;
  /** The account number. */
  number: string;
  /** The purpose of the account, e.g. checking, brokerage, etc. */
  kind: "checking" | "savings" | "brokerage" | "credit" | "debit";
  /** The type of resource stored in the account. */
  type: "assets" | "liabilities" | "equity" | "revenue" | "expenses";
  /** The current value of the account's assets. */
  price: Price;
};

/** A unique transaction. */
export type Transaction = {
  /** A globally unique id representing the account internally. */
  _id: UUID;
  _createdAt: string;
  _updatedAt: string;
  date: string;
  postDate: string;
  accountId: string;
  payee: string;
  price: Price;
  type: string;
  description: string;
};

/** An amount of money in a specific currency. */
export type Price = {
  amount: number;
  currency: string;
};

/** User information loaded from `config.json`. */
export type Config = {
  credentials: Record<string, ConfigCredentials>;
};

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

export interface TextFilter {
  readonly type: "text";
  text: string;
}

export interface PriceFilter {
  readonly type: "price";
  operator: "lt" | "gt" | "approx" | "between";
  prices: Price[];
}

export type Filter = TextFilter | PriceFilter;

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
    earliestDate: string;
  };
};
