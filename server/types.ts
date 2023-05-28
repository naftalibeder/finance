import { Page } from "playwright-core";
import {
  Account,
  AccountKind,
  Transaction,
  ConfigAccount,
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
  configCredentials: ConfigCredentials;
  page: Page;
  tmpRunDir: string;
  getMfaCode: () => Promise<string>;
  log: (message?: any, ...params: any[]) => void;
}

export interface ExtractorRangeFuncArgs extends ExtractorFuncArgs {
  range: ExtractorDateRange;
}

export type ExtractorColumnMapKey =
  | keyof Omit<Transaction, "accountId" | "meta">
  | "priceWithdrawal"
  | "priceDeposit";

export type ExtractorColumnMap = Record<
  ExtractorColumnMapKey,
  number | undefined
>;

export interface Extractor {
  loadStartPage: (args: ExtractorFuncArgs) => Promise<void>;
  enterCredentials: (args: ExtractorFuncArgs) => Promise<void>;
  enterMfaCode: (args: ExtractorFuncArgs) => Promise<void>;
  scrapeAccountValue: (args: ExtractorFuncArgs) => Promise<Price>;
  scrapeTransactionData: (args: ExtractorRangeFuncArgs) => Promise<string>;
  getDashboardExists: (args: ExtractorFuncArgs) => Promise<boolean>;
  getColumnMap: (accountKind: AccountKind) => ExtractorColumnMap | undefined;
  getMaxDateRangeMonths: (accountKind: AccountKind) => number;
}

export type ExtractorDateRange = {
  start: Date;
  end: Date;
};
