import { Page } from "playwright-core";
import {
  Account,
  Transaction,
  ConfigAccount,
  ConfigCredentials,
  Price,
} from "shared";

export type Database = {
  accounts: Account[];
  transactions: Transaction[];
};

export type Extractor = {
  getAccountValue: (
    browserPage: Page,
    account: ConfigAccount,
    credentials: ConfigCredentials
  ) => Promise<Price | undefined>;

  getTransactionData: (
    browserPage: Page,
    account: ConfigAccount,
    credentials: ConfigCredentials,
    range: ExtractorDateRange
  ) => Promise<string>;
};

export type ExtractorDateRange = {
  start: Date;
  end: Date;
};
