import { Page } from "playwright-core";
import {
  Account,
  Transaction,
  ConfigAccount,
  ConfigBank,
  ConfigCredentials,
  Price,
  ExtractionStatus,
} from "shared";

export type Database = {
  accounts: Account[];
  transactions: Transaction[];
  extractionStatus: ExtractionStatus;
};

export interface ExtractorFuncArgs {
  extractor: Extractor;
  configAccount: ConfigAccount;
  configBank: ConfigBank;
  configCredentials: ConfigCredentials;
  page: Page;
  getMfaCode: () => Promise<string>;
}

export interface ExtractorRangeFuncArgs extends ExtractorFuncArgs {
  range: ExtractorDateRange;
}

export interface Extractor {
  loadAccountsStartPage: (args: ExtractorFuncArgs) => Promise<void>;
  loadTransactionsStartPage: (args: ExtractorFuncArgs) => Promise<void>;
  enterCredentials: (args: ExtractorFuncArgs) => Promise<void>;
  enterMfaCode: (args: ExtractorFuncArgs) => Promise<void>;
  scrapeAccountValue: (args: ExtractorFuncArgs) => Promise<Price>;
  scrapeTransactionData: (args: ExtractorRangeFuncArgs) => Promise<string>;
  getDashboardExists: (args: ExtractorFuncArgs) => Promise<boolean>;
}

export type ExtractorDateRange = {
  start: Date;
  end: Date;
};
