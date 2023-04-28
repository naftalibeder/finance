import { Page } from "playwright-core";
import { ExtractorContext, Transaction } from ".";

export type Extractor = {
  run: (
    browserPage: Page,
    extractorContext: ExtractorContext
  ) => Promise<Transaction[]>;
};
