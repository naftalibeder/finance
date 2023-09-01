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
  supportedMfaOptions: MfaOption[];
  currentPageMap: Record<ExtractorPageKind, string[]>;
  getColumnMap: (
    accountKind: Account["kind"]
  ) => ExtractorColumnMap | undefined;
  getMaxDateRangeMonths: (accountKind: Account["kind"]) => number;
  loadStartPage: (args: ExtractorFuncArgs) => Promise<void>;
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
