import { Page } from "playwright-core";
import { BankName, Transaction } from ".";

export type Extractor = {
  getData: (
    browserPage: Page,
    extractorContext: ExtractorContext
  ) => Promise<string>;
};

export type ExtractorContext = {
  bank: BankName;
  username: string;
  password: string;
  account: string;
  deleteRows: number[];
  columnMap: Record<keyof Transaction, number>;
};
