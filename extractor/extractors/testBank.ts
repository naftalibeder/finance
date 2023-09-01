import fs from "fs";
import { Frame, Locator } from "@playwright/test";
import { Account, MfaOption, Price } from "shared";
import {
  Extractor,
  ExtractorColumnMap,
  ExtractorFuncArgs,
  ExtractorPageKind,
  ExtractorRangeFuncArgs,
} from "../types.js";

class TestBankExtractor implements Extractor {
  bankId = "test-bank";
  bankDisplayName = "Test Bank";
  bankDisplayNameShort = "Test";
  supportedAccountKinds: Account["kind"][] = ["credit"];
  supportedMfaOptions: MfaOption[] = ["sms", "email"];
  currentPageMap: Record<ExtractorPageKind, string[]> = {
    login: [],
    mfa: [],
    dashboard: [],
  };

  getColumnMap = (
    accountKind: Account["kind"]
  ): ExtractorColumnMap | undefined => {
    return undefined;
  };

  getMaxDateRangeMonths = (accountKind: Account["kind"]): number => {
    return 6;
  };

  loadStartPage = async (args: ExtractorFuncArgs) => {
    const { extractor, account, bankCreds, page } = args;
    await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
  };

  enterCredentials = async (args: ExtractorFuncArgs) => {};

  enterMfaCode = async (args: ExtractorFuncArgs) => {};

  scrapeAccountValue = async (args: ExtractorFuncArgs): Promise<Price> => {
    return { amount: 0, currency: "USD" };
  };

  scrapeTransactionData = async (
    args: ExtractorRangeFuncArgs
  ): Promise<string> => {
    return "";
  };
}

export { TestBankExtractor };
