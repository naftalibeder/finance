import { Page } from "@playwright/test";
import { Account, Transaction, Price, BankCreds, Extraction } from "shared";

export type ExtractionCallbacks = {
  onStatusChange: (update: Partial<Extraction>) => void;
  onReceiveAccountValue: (value: Price) => void;
  onReceiveTransactions: (transactions: Transaction[]) => void;
  onNeedMfaOption: (options: string[]) => void;
  onNeedMfaCode: () => void;
  onMfaUpdate: (update: {
    options?: string[];
    option?: number;
    code?: string;
  }) => void;
  onMfaFinish: () => void;
};

export interface ExtractorFuncArgs {
  extractor: Extractor;
  account: Account;
  bankCreds: BankCreds;
  page: Page;
  tmpRunDir: string;
  getMfaOption: (options: string[]) => Promise<number>;
  getMfaCode: () => Promise<string>;
  log: (msg: string, ...args: string[]) => void;
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
