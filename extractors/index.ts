import { BankSlug, Extractor } from "../types";
import { extractor as charlesSchwabBank } from "./charlesSchwabBank";

const extractors: Record<BankSlug, Extractor> = {
  "charles-schwab-bank": charlesSchwabBank,
};

export default extractors;
