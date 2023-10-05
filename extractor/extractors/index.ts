import { Extractor } from "../types.js";
import { CharlesSchwabBankExtractor } from "./charlesSchwabBank.js";
import { ChaseBankExtractor } from "./chaseBank.js";

const extractorsList: Extractor[] = [
  new CharlesSchwabBankExtractor(),
  new ChaseBankExtractor(),
];

const extractors: Record<string, Extractor> = {};
for (const extractor of extractorsList) {
  extractors[extractor.bankId] = extractor;
}

export { extractors };
