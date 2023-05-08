import { Page } from "playwright-core";

export type Config = {
  accounts: ExtractorAccount[];
  credentials: Record<BankId, ExtractorCredentials>;
};

export type Database = {
  accounts: Account[];
  transactions: Transaction[];
};

export type Extractor = {
  getAccountValue: (
    browserPage: Page,
    account: ExtractorAccount,
    credentials: ExtractorCredentials
  ) => Promise<Price | undefined>;

  getTransactionData: (
    browserPage: Page,
    account: ExtractorAccount,
    credentials: ExtractorCredentials,
    range: ExtractorDateRange
  ) => Promise<string>;
};

export type BankId = "charles-schwab-bank";

export type ExtractorAccount = {
  info: {
    id: string;
    bankId: BankId;
    display: string;
    number: string;
  };
  columnMap: Record<ExtractorTransactionKey, number>;
  skip: boolean;
};

export type ExtractorDateRange = {
  start: Date;
  end: Date;
};

export type ExtractorCredentials = {
  username: string;
  password: string;
};

export type ExtractorTransactionKey =
  | keyof Transaction
  | "priceWithdrawal"
  | "priceDeposit";

export type Account = {
  id: string;
  number: string;
  price: Price;
};

export type Transaction = {
  date: string;
  accountId: string;
  payee: string;
  price: Price;
  description: string;
};

export type Price = {
  amount: number;
  currency: string;
};
