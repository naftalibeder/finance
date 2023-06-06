import { Page } from "playwright-core";
import {
  Account,
  Transaction,
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
  account: Account;
  credentials: ConfigCredentials;
  page: Page;
  tmpRunDir: string;
  getMfaCode: () => Promise<string>;
  log: (message?: any, ...params: any[]) => void;
}

export interface ExtractorRangeFuncArgs extends ExtractorFuncArgs {
  range: ExtractorDateRange;
}

export type ExtractorColumnMapKey =
  | keyof Omit<Transaction, "_id" | "_createdAt" | "_updatedAt" | "accountId">
  | "priceWithdrawal"
  | "priceDeposit";

export type ExtractorColumnMap = Record<
  ExtractorColumnMapKey,
  number | undefined
>;

export interface Extractor {
  bankId: string;
  bankDisplayName: string;
  bankDisplayNameShort: string;
  loadStartPage: (args: ExtractorFuncArgs) => Promise<void>;
  enterCredentials: (args: ExtractorFuncArgs) => Promise<void>;
  enterMfaCode: (args: ExtractorFuncArgs) => Promise<void>;
  scrapeAccountValue: (args: ExtractorFuncArgs) => Promise<Price>;
  scrapeTransactionData: (args: ExtractorRangeFuncArgs) => Promise<string>;
  getDashboardExists: (args: ExtractorFuncArgs) => Promise<boolean>;
  getColumnMap: (
    accountKind: Account["kind"]
  ) => ExtractorColumnMap | undefined;
  getMaxDateRangeMonths: (accountKind: Account["kind"]) => number;
}

export type ExtractorDateRange = {
  start: Date;
  end: Date;
};
