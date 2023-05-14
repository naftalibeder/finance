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

export interface ExtractorFuncArgs {
  extractor: Extractor;
  configAccount: ConfigAccount;
  configCredentials: ConfigCredentials;
  page: Page;
}

export interface ExtractorRangeFuncArgs extends ExtractorFuncArgs {
  range: ExtractorDateRange;
}

export interface Extractor {
  loadAccountsPage: (args: ExtractorFuncArgs) => Promise<void>;
  loadHistoryPage: (args: ExtractorFuncArgs) => Promise<void>;
  enterCredentials: (args: ExtractorFuncArgs) => Promise<void>;
  enterTwoFactorCode: (args: ExtractorFuncArgs) => Promise<void>;
  scrapeAccountValue: (args: ExtractorFuncArgs) => Promise<Price>;
  scrapeTransactionData: (args: ExtractorRangeFuncArgs) => Promise<string>;
  getDashboardExists: (args: ExtractorFuncArgs) => Promise<boolean>;
}

export type ExtractorDateRange = {
  start: Date;
  end: Date;
};
