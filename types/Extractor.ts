import { Page } from "playwright-core";
import { BankSlug, Transaction } from ".";

export type Extractor = {
  getData: (
    browserPage: Page,
    account: ExtractorAccount,
    credentials: ExtractorCredentials
  ) => Promise<string>;
};

export type ExtractorAccount = {
  info: {
    bankSlug: BankSlug;
    slug: string;
    display: string;
    number: string;
  };
  deleteRows: number[];
  columnMap: Record<ExtractorTransactionKey, number>;
};

export type ExtractorCredentials = {
  username: string;
  password: string;
};

export type ExtractorTransactionKey =
  | keyof Transaction
  | "priceWithdrawal"
  | "priceDeposit";
