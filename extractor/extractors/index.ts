import { Extractor } from "types";
import { CharlesSchwabBankExtractor } from "./charlesSchwabBank";
import { ChaseBankExtractor } from "./chaseBank";

const extractorsList: Extractor[] = [
  new CharlesSchwabBankExtractor(),
  new ChaseBankExtractor(),
];

const extractors: Record<string, Extractor> = {};
for (const extractor of extractorsList) {
  extractors[extractor.bankId] = extractor;
}

export { extractors };
