import { UUID } from "crypto";
import { Page } from "playwright-core";
import {
  Account,
  Transaction,
  Price,
  ExtractionStatus,
  BankCreds,
} from "shared";

export type Database = {
  user: User;
  bankCredentials: string;
  accounts: Account[];
  transactions: Transaction[];
  extractionStatus: ExtractionStatus;
};

export type User = {
  email: string;
  password: string;
  devices: {
    [name: string]: {
      token: string;
      createdAt: string;
    };
  };
};

export interface ExtractorFuncArgs {
  extractor: Extractor;
  account: Account;
  bankCreds: BankCreds;
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
  supportedAccountKinds: Account["kind"][];
  getColumnMap: (
    accountKind: Account["kind"]
  ) => ExtractorColumnMap | undefined;
  getMaxDateRangeMonths: (accountKind: Account["kind"]) => number;
  loadStartPage: (args: ExtractorFuncArgs) => Promise<void>;
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

export type ExtractionMetrics = Record<
  UUID,
  {
    startTime: Date;
    endTime?: Date;
    foundCt: number;
    addCt: number;
  }
>;
