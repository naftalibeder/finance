import { Page } from "@playwright/test";
import {
  Account,
  Transaction,
  Price,
  BankCreds,
  MfaOption,
  ExtractApiPayloadChunk,
} from "shared";

export type OnExtractionEvent = (event: ExtractApiPayloadChunk) => void;

export type ExtractionLog = (msg: string, ...args: any[]) => void;

export interface ExtractorFuncArgs {
  extractor: Extractor;
  account: Account;
  bankCreds: BankCreds;
  page: Page;
  tmpRunDir: string;
  getMfaCode: () => Promise<string>;
  log: ExtractionLog;
}

export interface ExtractorRangeFuncArgs extends ExtractorFuncArgs {
  range: ExtractorDateRange;
}

export type ExtractorColumnKind =
  | keyof Omit<Transaction, "_id" | "_createdAt" | "_updatedAt" | "accountId">
  | "priceWithdrawal"
  | "priceDeposit";

export type ExtractorColumnMap = (ExtractorColumnKind | undefined)[];

export interface Extractor {
  /** Whether the extractor is included in a request for all extractors. */
  public: boolean;
  bankId: string;
  bankDisplayName: string;
  bankDisplayNameShort: string;
  supportedAccountKinds: Account["kind"][];
  supportedMfaOptions: MfaOption[];
  currentPageMap: Record<ExtractorPageKind, string[]>;
  getColumnMap: (
    accountKind: Account["kind"]
  ) => ExtractorColumnMap | undefined;
  getMaxDateRangeMonths: (accountKind: Account["kind"]) => number;
  goToLoginPage: (args: ExtractorFuncArgs) => Promise<void>;
  goToDashboardPage: (args: ExtractorFuncArgs) => Promise<void>;
  enterCredentials: (args: ExtractorFuncArgs) => Promise<void>;
  enterMfaCode: (args: ExtractorFuncArgs) => Promise<void>;
  scrapeAccountValue: (args: ExtractorFuncArgs) => Promise<Price>;
  scrapeTransactionData: (args: ExtractorRangeFuncArgs) => Promise<string>;
}

export type ExtractorPageKind = "login" | "mfa" | "dashboard";

export type ExtractorDateRange = {
  start: Date;
  end: Date;
};
