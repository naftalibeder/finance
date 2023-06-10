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
  currency: "USD";
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
  accounts: Record<string, "pending" | "in-progress">;
  mfaInfos: MfaInfo[];
};

export interface TextFilter {
  readonly type: "text";
  text: string;
}

export type ComparisonOperator = "lt" | "gt" | "eq" | "approx";

export interface ComparisonFilter<T> {
  readonly type: "comparison";
  operator: ComparisonOperator;
  value: T;
}

export interface DateFilter extends ComparisonFilter<Date> {
  readonly valueType: "date";
}

export interface PriceFilter extends ComparisonFilter<Price> {
  readonly valueType: "price";
}

export type Filter = TextFilter | PriceFilter | DateFilter;

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
    filteredCt: number;
    filteredSumPrice: Price;
    overallCt: number;
    overallSumPrice: Price;
    overallMaxPrice: Price;
    overallEarliestDate: string;
  };
};
