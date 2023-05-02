import { Page } from "playwright-core";
import { BankSlug, Transaction } from ".";

export type Extractor = {
  getData: (
    browserPage: Page,
    account: ExtractorAccount,
    credentials: ExtractorCredentials,
    range: ExtractorDateRange
  ) => Promise<string>;
};

export type ExtractorAccount = {
  info: {
    bankSlug: BankSlug;
    slug: string;
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
