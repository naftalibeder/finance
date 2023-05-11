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

export interface Extractor {
  loadAccountsPage: (browserPage: Page) => Promise<void>;
  loadHistoryPage: (browserPage: Page) => Promise<void>;
  enterCredentials: (
    browserPage: Page,
    credentials: ConfigCredentials
  ) => Promise<void>;
  enterTwoFactorCode: (browserPage: Page) => Promise<void>;
  scrapeAccountValue: (
    browserPage: Page,
    account: ConfigAccount
  ) => Promise<Price | undefined>;
  scrapeTransactionData: (
    browserPage: Page,
    account: ConfigAccount,
    range: ExtractorDateRange
  ) => Promise<string>;
  getDashboardExists: (browserPage: Page) => Promise<boolean>;
}

export type ExtractorDateRange = {
  start: Date;
  end: Date;
};
