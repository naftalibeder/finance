import { Extractor } from "../types.js";
import { CharlesSchwabBankExtractor } from "./charlesSchwabBank.js";
import { ChaseBankExtractor } from "./chaseBank.js";
import { TestBankExtractor } from "./testBank.js";

const extractorsList: Extractor[] = [
  new CharlesSchwabBankExtractor(),
  new ChaseBankExtractor(),
  new TestBankExtractor(),
];

const extractors: Record<string, Extractor> = {};
for (const extractor of extractorsList) {
  extractors[extractor.bankId] = extractor;
}

export { extractors };
